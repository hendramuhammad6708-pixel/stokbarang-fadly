-- Jalankan seluruh isi file ini di Supabase > SQL Editor (sekali saja untuk project baru).
--
-- Sudah pernah menjalankan versi lama? Jangan jalankan file ini lagi; jalankan
-- supabase/migrations/001_utang_supplier.sql saja (berisi pembaruan utang supplier).

-- ====================================================================
-- BAGIAN 1 — TABEL (sekali saja)
-- ====================================================================

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
  dibayar numeric(14,2) not null default 0,  -- bagian dari total_harga yang sudah dibayar; sisa utang = total_harga - dibayar
  supplier text,                      -- kepada siapa dibeli/berutang (salinan dari "Dibeli dari" saat pembelian)
  catatan text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint stock_movements_dibayar_wajar check (
    dibayar >= 0 and ((total_harga is null and dibayar = 0) or (total_harga is not null and dibayar <= total_harga))
  )
);
create index stock_movements_waktu on public.stock_movements (owner_id, created_at desc);
create index stock_movements_cabang on public.stock_movements (branch_id, created_at desc);
create index stock_movements_barang on public.stock_movements (product_id);
create index stock_levels_cabang on public.stock_levels (branch_id);

-- Pelunasan utang ke supplier (riwayat saja; nominalnya sudah dibagikan ke pembelian lewat fungsi bayar_utang)
create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  supplier text not null,
  jumlah numeric(14,2) not null check (jumlah > 0),
  catatan text,
  created_at timestamptz not null default now()
);
create index supplier_payments_waktu on public.supplier_payments (owner_id, created_at desc);

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

-- ====================================================================
-- BAGIAN 2 — ATURAN, VIEW, FUNGSI (aman dijalankan berulang kali)
-- Bagian ini juga yang dipakai oleh supabase/migrations/001_utang_supplier.sql
-- ====================================================================

alter table public.supplier_payments enable row level security;

drop policy if exists "baca milik sendiri" on public.supplier_payments;
create policy "baca milik sendiri" on public.supplier_payments for select using (owner_id = auth.uid());

-- Riwayat boleh dihapus pemiliknya, KECUALI pembelian yang masih ada sisa utangnya.
-- Menghapus riwayat TIDAK mengubah jumlah stok (stok disimpan terpisah di stock_levels).
drop policy if exists "hapus milik sendiri" on public.stock_movements;
create policy "hapus milik sendiri" on public.stock_movements for delete
  using (owner_id = auth.uid() and dibayar >= coalesce(total_harga, 0));

-- Daftar pembelian yang masih berutang. security_invoker: aturan RLS pemilik tetap berlaku.
create or replace view public.utang_pembelian with (security_invoker = true) as
select m.id, m.created_at, m.supplier, m.jumlah, m.total_harga, m.dibayar,
       (m.total_harga - m.dibayar) as sisa,
       p.nama as produk, p.satuan, b.nama as cabang
from public.stock_movements m
join public.products p on p.id = m.product_id
join public.branches b on b.id = m.branch_id
where m.tipe = 'masuk' and m.total_harga is not null and m.total_harga - m.dibayar > 0;

drop function if exists public.catat_mutasi(uuid, uuid, text, integer, text, numeric);
drop function if exists public.tambah_barang(text, text, text, text, numeric, integer, text, jsonb, numeric);

-- Mencatat mutasi secara atomik.
--  * 'penyesuaian': p_jumlah = jumlah stok sebenarnya (hasil hitung).
--  * 'masuk': p_total_harga (opsional) = TOTAL harga beli untuk p_jumlah barang tersebut.
--    Modal per satuan di tabel products diperbarui dengan rata-rata tertimbang dari seluruh cabang.
--    p_dibayar (opsional) = bagian total yang sudah dibayar; kosong berarti lunas. Sisanya menjadi utang
--    kepada p_supplier (kosong = "Dibeli dari" milik barang). Modal tidak terpengaruh status bayar.
--
-- SECURITY DEFINER: tabel stok sengaja tidak punya policy tulis, jadi klien tidak bisa mengubah stok
-- langsung; satu-satunya jalan adalah fungsi ini. Karena melewati RLS, SETIAP query di dalamnya
-- wajib memfilter owner_id = auth.uid().
create or replace function public.catat_mutasi(
  p_product uuid, p_branch uuid, p_tipe text, p_jumlah integer, p_catatan text default null,
  p_total_harga numeric default null, p_dibayar numeric default null, p_supplier text default null
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
  v_sumber text;
  v_dibayar numeric := 0;
  v_supplier text;
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
  if p_dibayar is not null and (p_total_harga is null or p_dibayar < 0 or p_dibayar > p_total_harga) then
    raise exception 'Jumlah dibayar harus antara 0 dan total harga beli';
  end if;

  select harga_beli, sumber into v_modal, v_sumber from products
  where id = p_product and owner_id = v_uid and not is_archived for update;
  if not found or not exists (select 1 from branches where id = p_branch and owner_id = v_uid and not is_archived) then
    raise exception 'Barang atau cabang tidak ditemukan';
  end if;

  if p_tipe = 'masuk' then
    v_supplier := coalesce(nullif(btrim(p_supplier), ''), nullif(btrim(v_sumber), ''));
    if p_total_harga is not null then
      v_dibayar := coalesce(p_dibayar, p_total_harga);
      if v_dibayar < p_total_harga and v_supplier is null then
        raise exception 'Isi nama supplier untuk pembelian yang masih berutang';
      end if;
    end if;
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

  insert into stock_movements (owner_id, product_id, branch_id, tipe, jumlah, stok_sebelum, stok_sesudah,
                               total_harga, dibayar, supplier, catatan, created_by)
  values (v_uid, p_product, p_branch, p_tipe,
          case p_tipe when 'penyesuaian' then v_selisih else p_jumlah end,
          v_sebelum, v_sesudah, p_total_harga, v_dibayar, v_supplier, nullif(trim(p_catatan), ''), v_uid);
end;
$$;

-- Hanya pengguna yang sudah login yang boleh memanggil fungsi ini
revoke all on function public.catat_mutasi(uuid, uuid, text, integer, text, numeric, numeric, text) from public, anon;
grant execute on function public.catat_mutasi(uuid, uuid, text, integer, text, numeric, numeric, text) to authenticated;

-- Menambah barang baru sekaligus mengisi stok awal per cabang, dalam satu transaksi (semua berhasil atau semua batal).
-- p_stok: [{"branch_id": "...", "jumlah": 10}, ...]
-- p_total_harga: total harga beli seluruh stok awal; p_dibayar: bagian yang sudah dibayar (kosong = lunas).
-- Keduanya dibagi ke tiap cabang sesuai jumlahnya. Utang dicatat atas nama p_sumber ("Dibeli dari").
create or replace function public.tambah_barang(
  p_nama text, p_kategori text, p_sumber text, p_satuan text, p_harga_jual numeric,
  p_stok_minimum integer, p_catatan text,
  p_stok jsonb default '[]'::jsonb, p_total_harga numeric default null, p_dibayar numeric default null
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
  v_sisa_bayar numeric := p_dibayar;
  v_bagian numeric;
  v_bayar numeric;
begin
  if p_dibayar is not null and (p_total_harga is null or p_dibayar < 0 or p_dibayar > p_total_harga) then
    raise exception 'Jumlah dibayar harus antara 0 dan total harga beli';
  end if;

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
      v_bayar := null;
    elsif v_i = v_n then
      v_bagian := v_sisa;
      v_bayar := case when p_dibayar is null then null else greatest(0, least(v_sisa_bayar, v_bagian)) end;
    else
      v_bagian := round(p_total_harga * r.jumlah / v_sum, 2);
      v_sisa := v_sisa - v_bagian;
      v_bayar := case when p_dibayar is null then null else least(round(p_dibayar * r.jumlah / v_sum, 2), v_bagian) end;
      v_sisa_bayar := v_sisa_bayar - coalesce(v_bayar, 0);
    end if;
    perform public.catat_mutasi(v_id, r.branch_id, 'masuk', r.jumlah, 'Stok awal', v_bagian, v_bayar, p_sumber);
  end loop;

  return v_id;
end;
$$;

-- Membayar utang ke satu supplier sekaligus. Nominal otomatis melunasi pembelian TERLAMA lebih dulu.
-- Semuanya atomik: gagal di tengah = tidak ada yang berubah. Tidak boleh melebihi total utang.
create or replace function public.bayar_utang(p_supplier text, p_jumlah numeric, p_catatan text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nama text := nullif(btrim(p_supplier), '');
  v_total numeric;
  v_sisa_bayar numeric := p_jumlah;
  v_ambil numeric;
  r record;
begin
  if v_uid is null then
    raise exception 'Belum login';
  end if;
  if v_nama is null then
    raise exception 'Supplier tidak dipilih';
  end if;
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'Jumlah pembayaran harus lebih dari 0';
  end if;

  select coalesce(sum(total_harga - dibayar), 0) into v_total from stock_movements
  where owner_id = v_uid and tipe = 'masuk' and total_harga is not null and total_harga - dibayar > 0
    and lower(btrim(supplier)) = lower(v_nama);
  if v_total <= 0 then
    raise exception 'Tidak ada utang ke supplier ini';
  end if;
  if p_jumlah > v_total then
    raise exception 'Pembayaran melebihi total utang (sisa %)', v_total;
  end if;

  for r in
    select id, total_harga - dibayar as sisa from stock_movements
    where owner_id = v_uid and tipe = 'masuk' and total_harga is not null and total_harga - dibayar > 0
      and lower(btrim(supplier)) = lower(v_nama)
    order by created_at, id
    for update
  loop
    exit when v_sisa_bayar <= 0;
    v_ambil := least(r.sisa, v_sisa_bayar);
    update stock_movements set dibayar = dibayar + v_ambil where id = r.id and owner_id = v_uid;
    v_sisa_bayar := v_sisa_bayar - v_ambil;
  end loop;

  insert into supplier_payments (owner_id, supplier, jumlah, catatan)
  values (v_uid, v_nama, p_jumlah, nullif(btrim(p_catatan), ''));
end;
$$;

revoke all on function public.bayar_utang(text, numeric, text) from public, anon;
grant execute on function public.bayar_utang(text, numeric, text) to authenticated;
