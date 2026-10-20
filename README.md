# Stok Toko

Aplikasi pencatatan stok multi-cabang (Next.js + Supabase). Lihat `docs/PRD.md`.

## Setup

1. Buat project gratis di https://supabase.com.
2. Buka **SQL Editor**, tempel seluruh isi `supabase/schema.sql`, lalu **Run**.
3. Buka **Authentication → Providers → Email**, matikan **Allow new users to sign up** (agar hanya owner yang bisa masuk).
4. Buka **Authentication → Users → Add user**, buat akun owner (email + kata sandi, centang *Auto Confirm*). Tiga cabang awal dibuat otomatis.
   - Jika Anda sudah membuat user sebelum menjalankan SQL, tambahkan cabang lewat menu **Cabang** di aplikasi.
5. Salin **Project URL** dan **anon/publishable key** (Project Settings → API) ke `.env.local`.
6. Jalankan:

```bash
npm install
npm run dev
```

### Memperbarui database yang sudah berjalan

Jika Anda sudah pernah menjalankan `supabase/schema.sql` versi lama, jalankan `supabase/migrations/001_utang_supplier.sql` **sekali** di SQL Editor (menambah fitur utang supplier; pembelian lama dianggap lunas). Lalu jalankan `supabase/migrations/003_hapus_utang.sql` (fitur hapus utang dan catatan pembayaran) dan, bila mau, `002_nama_barang_unik.sql` (nama barang unik di database). Semuanya aman dijalankan ulang. Project baru cukup menjalankan `schema.sql`.

### Mengosongkan data

Untuk memulai dari nol (misalnya setelah uji coba), jalankan `supabase/kosongkan_data.sql` di SQL Editor. Barang, stok, riwayat, dan utang terhapus permanen; akun dan cabang tetap.

### Mode demo (tanpa Supabase)

Isi `DEMO_MODE=true` di `.env.local` untuk mencoba aplikasi dengan data contoh yang disimpan di memori (login dilewati, data hilang saat server restart). Mode ini otomatis mati di production.

### Membuka dari HP saat development

Jalankan `npm run dev`, lalu buka `http://<IP-komputer>:3000` dari HP di Wi-Fi yang sama. Alamat jaringan `192.168.*.*` dan `10.*.*.*` sudah diizinkan di `next.config.ts`.

## Deploy ke Vercel

Push ke GitHub, import di Vercel, lalu isi Environment Variables yang sama dengan `.env.local`.
