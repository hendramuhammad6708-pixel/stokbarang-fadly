-- Nama barang tidak boleh kembar (abaikan huruf besar/kecil dan spasi di tepi; barang arsip tidak dihitung).
-- Aman dijalankan ulang. Jika sudah ada nama kembar, indeks dilewati dan Anda diberi tahu nama mana yang kembar:
-- ubah salah satunya di menu Barang lalu jalankan lagi. Aplikasi tetap menolak nama kembar baru walau indeks belum ada.
do $$
declare kembar text;
begin
  select string_agg(distinct lower(btrim(nama)), ', ') into kembar
  from (select nama, count(*) over (partition by owner_id, lower(btrim(nama))) n from public.products where not is_archived) t
  where n > 1;
  if kembar is not null then
    raise notice 'Indeks dilewati, masih ada nama barang kembar: %', kembar;
  else
    create unique index if not exists products_nama_unik
      on public.products (owner_id, lower(btrim(nama))) where not is_archived;
  end if;
end $$;
