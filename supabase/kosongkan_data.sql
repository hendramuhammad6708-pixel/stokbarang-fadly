-- KOSONGKAN SEMUA DATA TOKO — tidak bisa dibatalkan.
-- Jalankan manual di Supabase → SQL Editor (bukan migrasi; jangan dijalankan otomatis).
--
-- Yang DIHAPUS : riwayat stok, catatan pembayaran/utang, stok per cabang, dan semua barang.
-- Yang TETAP   : akun login dan daftar cabang (hapus cabang lewat menu Cabang di aplikasi,
--                atau aktifkan baris "delete from public.branches" di bawah).
-- Struktur tabel, aturan keamanan, dan fungsi tidak berubah.

begin;
  delete from public.supplier_payments;
  delete from public.stock_movements;   -- harus sebelum barang/cabang (relasi restrict)
  delete from public.stock_levels;
  delete from public.products;
  -- delete from public.branches;       -- aktifkan juga bila cabang ingin dikosongkan
commit;

-- Pemeriksaan: semuanya harus 0
select (select count(*) from public.products)          as barang,
       (select count(*) from public.stock_levels)      as stok,
       (select count(*) from public.stock_movements)   as riwayat,
       (select count(*) from public.supplier_payments) as pembayaran;
