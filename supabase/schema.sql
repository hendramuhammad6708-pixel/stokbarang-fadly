-- Jalankan seluruh isi file ini di Supabase > SQL Editor (sekali saja).

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nama text not null,
  alamat text,
  telepon text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index branches_nama_unik on public.branches (owner_id, lower(nama)) where not is_archived;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nama text not null,
  kategori text,
  sumber text,                        -- asal/tempat barang dibeli (supplier, toko, pasar, dll.)
  satuan text not null default 'pcs',
  harga_beli numeric(14,2),           -- modal rata-rata per satuan; dihitung otomatis dari stok masuk
  harga_jual numeric(14,2),
  stok_minimum integer not null default 0 check (stok_minimum >= 0),
  catatan text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.stock_levels (
  product_id uuid not null references public.products(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  jumlah integer not null default 0 check (jumlah >= 0),
  primary key (product_id, branch_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  tipe text not null check (tipe in ('masuk', 'keluar', 'penyesuaian')),
  jumlah integer not null,            -- masuk/keluar: banyaknya; penyesuaian: selisih (+/-)
  stok_sebelum integer not null,
  stok_sesudah integer not null,
  total_harga numeric(14,2),          -- khusus 'masuk': total harga beli untuk seluruh jumlah yang masuk
  catatan text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index stock_movements_waktu on public.stock_movements (owner_id, created_at desc);
create index stock_movements_cabang on public.stock_movements (branch_id, created_at desc);
create index stock_movements_barang on public.stock_movements (product_id);
create index stock_levels_cabang on public.stock_levels (branch_id);

-- Row Level Security: setiap pemilik hanya melihat datanya sendiri
alter table public.branches enable row level security;
alter table public.products enable row level security;
alter table public.stock_levels enable row level security;
alter table public.stock_movements enable row level security;

create policy "milik sendiri" on public.branches for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "milik sendiri" on public.products for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- stok & riwayat hanya boleh dibaca langsung; perubahan lewat fungsi catat_mutasi
create policy "baca milik sendiri" on public.stock_levels for select using (owner_id = auth.uid());
create policy "baca milik sendiri" on public.stock_movements for select using (owner_id = auth.uid());

-- Mencatat mutasi secara atomik.
--  * 'penyesuaian': p_jumlah = jumlah stok sebenarnya (hasil hitung).
--  * 'masuk': p_total_harga (opsional) = TOTAL harga beli untuk p_jumlah barang tersebut.
--    Modal per satuan di tabel products diperbarui dengan rata-rata tertimbang dari seluruh cabang.
--
-- SECURITY DEFINER: tabel stok sengaja tidak punya policy tulis, jadi klien tidak bisa mengubah stok
-- langsung; satu-satunya jalan adalah fungsi ini. Karena melewati RLS, SETIAP query di dalamnya
-- wajib memfilter owner_id = auth.uid().
create or replace function public.catat_mutasi(
  p_product uuid, p_branch uuid, p_tipe text, p_jumlah integer, p_catatan text default null,
  p_total_harga numeric default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sebelum integer;
  v_sesudah integer;
  v_selisih integer;
  v_stok_semua bigint;
  v_modal numeric;
begin
  if v_uid is null then
    raise exception 'Belum login';
  end if;
  if p_tipe not in ('masuk', 'keluar', 'penyesuaian') then
    raise exception 'Jenis mutasi tidak valid';
  end if;
  if p_jumlah is null or p_jumlah < 0 or (p_tipe <> 'penyesuaian' and p_jumlah = 0) then
    raise exception 'Jumlah tidak valid';
  end if;
  if p_total_harga is not null and (p_tipe <> 'masuk' or p_total_harga < 0) then
    raise exception 'Total harga hanya untuk stok masuk dan tidak boleh negatif';
  end if;

  select harga_beli into v_modal from products
  where id = p_product and owner_id = v_uid and not is_archived for update;
  if not found or not exists (select 1 from branches where id = p_branch and owner_id = v_uid and not is_archived) then
    raise exception 'Barang atau cabang tidak ditemukan';
  end if;

  insert into stock_levels (product_id, branch_id, owner_id, jumlah)
  values (p_product, p_branch, v_uid, 0)
  on conflict do nothing;

  select jumlah into v_sebelum from stock_levels
  where product_id = p_product and branch_id = p_branch and owner_id = v_uid for update;

  if p_tipe = 'masuk' then
    v_sesudah := v_sebelum + p_jumlah;
  elsif p_tipe = 'keluar' then
    v_sesudah := v_sebelum - p_jumlah;
  else
    v_sesudah := p_jumlah;
  end if;

  if v_sesudah < 0 then
    raise exception 'Stok tidak cukup (tersisa %)', v_sebelum;
  end if;
  v_selisih := v_sesudah - v_sebelum;

  -- Modal rata-rata tertimbang: (stok lama x modal lama + total harga baru) / (stok lama + jumlah baru)
  if p_tipe = 'masuk' and p_total_harga is not null then
    -- stok semua cabang sebelum mutasi ini (baris cabang ini belum diperbarui)
    select coalesce(sum(jumlah), 0) into v_stok_semua from stock_levels
    where product_id = p_product and owner_id = v_uid;
    update products
    set harga_beli = case
      when v_modal is null or v_stok_semua <= 0 then round(p_total_harga / p_jumlah, 2)
      else round((v_stok_semua * v_modal + p_total_harga) / (v_stok_semua + p_jumlah), 2)
    end
    where id = p_product and owner_id = v_uid;
  end if;

  update stock_levels set jumlah = v_sesudah
  where product_id = p_product and branch_id = p_branch and owner_id = v_uid;

  insert into stock_movements (owner_id, product_id, branch_id, tipe, jumlah, stok_sebelum, stok_sesudah, total_harga, catatan, created_by)
  values (v_uid, p_product, p_branch, p_tipe,
          case p_tipe when 'penyesuaian' then v_selisih else p_jumlah end,
          v_sebelum, v_sesudah, p_total_harga, nullif(trim(p_catatan), ''), v_uid);
end;
$$;

-- Hanya pengguna yang sudah login yang boleh memanggil fungsi ini
revoke all on function public.catat_mutasi(uuid, uuid, text, integer, text, numeric) from public, anon;
grant execute on function public.catat_mutasi(uuid, uuid, text, integer, text, numeric) to authenticated;

-- Setiap akun baru otomatis mendapat 3 cabang awal (nama bisa diubah di aplikasi)
create or replace function public.buat_cabang_awal() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.branches (owner_id, nama) values
    (new.id, 'Cabang 1'), (new.id, 'Cabang 2'), (new.id, 'Cabang 3');
  return new;
end;
$$;
create trigger setelah_user_dibuat after insert on auth.users
  for each row execute function public.buat_cabang_awal();

-- Menambah barang baru sekaligus mengisi stok awal per cabang, dalam satu transaksi (semua berhasil atau semua batal).
-- p_stok: [{"branch_id": "...", "jumlah": 10}, ...]; p_total_harga: total harga beli seluruh stok awal (dibagi sesuai jumlah per cabang).
create or replace function public.tambah_barang(
  p_nama text, p_kategori text, p_sumber text, p_satuan text, p_harga_jual numeric,
  p_stok_minimum integer, p_catatan text,
  p_stok jsonb default '[]'::jsonb, p_total_harga numeric default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  r record;
  v_sum integer;
  v_n integer;
  v_i integer := 0;
  v_sisa numeric := p_total_harga;
  v_bagian numeric;
begin
  insert into public.products (nama, kategori, sumber, satuan, harga_jual, stok_minimum, catatan)
  values (p_nama, p_kategori, p_sumber, coalesce(nullif(p_satuan, ''), 'pcs'), p_harga_jual, coalesce(p_stok_minimum, 0), p_catatan)
  returning id into v_id;

  select coalesce(sum((e->>'jumlah')::integer), 0), count(*)
    into v_sum, v_n
  from jsonb_array_elements(p_stok) e
  where (e->>'jumlah')::integer > 0;

  for r in
    select (e->>'branch_id')::uuid as branch_id, (e->>'jumlah')::integer as jumlah
    from jsonb_array_elements(p_stok) e
    where (e->>'jumlah')::integer > 0
  loop
    v_i := v_i + 1;
    if p_total_harga is null then
      v_bagian := null;
    elsif v_i = v_n then
      v_bagian := v_sisa;
    else
      v_bagian := round(p_total_harga * r.jumlah / v_sum, 2);
      v_sisa := v_sisa - v_bagian;
    end if;
    perform public.catat_mutasi(v_id, r.branch_id, 'masuk', r.jumlah, 'Stok awal', v_bagian);
  end loop;

  return v_id;
end;
$$;
