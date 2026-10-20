-- Fitur hapus utang dan catatan pembayaran. Aman dijalankan ulang.

-- Hapus catatan pembayaran supplier (hanya catatannya; sisa utang pembelian tidak berubah).
drop policy if exists "hapus milik sendiri" on public.supplier_payments;
create policy "hapus milik sendiri" on public.supplier_payments for delete using (owner_id = auth.uid());

-- Hapus pembelian yang masih berutang (beserta utangnya). Pembelian berutang tidak bisa dihapus lewat
-- policy biasa, jadi disediakan fungsi khusus. Stok tidak berubah. Mengembalikan jumlah yang terhapus.
-- SECURITY DEFINER: query wajib memfilter owner_id = auth.uid().
create or replace function public.hapus_utang(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n integer;
begin
  if v_uid is null then raise exception 'Belum masuk'; end if;
  delete from stock_movements
  where id = any(p_ids) and owner_id = v_uid and total_harga is not null and dibayar < total_harga;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.hapus_utang(uuid[]) from public, anon;
grant execute on function public.hapus_utang(uuid[]) to authenticated;
