# PRD — Aplikasi Pencatatan Stok Toko Multi-Cabang

Versi: 0.2 · Diperbarui: 2026-10-12

## 1. Ringkasan

Web app untuk pemilik toko (owner) mengelola stok barang di beberapa cabang dari satu tempat. Versi awal hanya untuk owner, dengan 3 cabang awal, dan fokus pada pencatatan stok (bukan penjualan/kasir). Seluruh infrastruktur memakai layanan gratis (Vercel + Supabase).

## 2. Tujuan dan Non-Tujuan

**Tujuan**
- Owner bisa melihat jumlah stok setiap barang di setiap cabang secara akurat.
- Setiap perubahan stok tercatat (siapa, kapan, berapa, kenapa).
- Owner bisa menambah dan menghapus cabang.
- Biaya operasional Rp0.

**Non-tujuan (versi ini)**
- Penjualan / kasir / pembayaran.
- Akun staf atau multi-user (hanya disiapkan di struktur data).
- Transfer stok antar cabang, barcode, notifikasi WhatsApp, varian barang, kedaluwarsa.

## 3. Pengguna

| Peran | Akses | Status |
|---|---|---|
| Owner | Semua cabang, semua fitur | Dibangun sekarang |
| Staf cabang | Hanya cabang tertentu | Fase berikutnya (struktur data disiapkan) |

## 4. Kebutuhan Fungsional

### F1. Autentikasi
- Owner login dengan email + password (Supabase Auth).
- Semua halaman terproteksi; belum login diarahkan ke halaman login.
- Logout.
- Pendaftaran publik dinonaktifkan; akun owner dibuat sekali lewat dashboard Supabase.

### F2. Manajemen Cabang
- Saat pertama kali dipakai, sistem menyediakan **3 cabang awal** (nama dapat diubah oleh owner, misalnya "Cabang 1/2/3").
- **Tambah cabang**: nama (wajib, unik), alamat (opsional), telepon (opsional).
- **Ubah cabang**: edit nama/alamat/telepon.
- **Hapus cabang**:
  - Ada dialog konfirmasi yang menyebut nama cabang.
  - Jika cabang belum punya riwayat mutasi stok → dihapus permanen.
  - Jika sudah punya riwayat → **diarsipkan** (tidak tampil di daftar aktif, riwayat tetap utuh). Owner diberi tahu bahwa cabang diarsipkan, bukan dihapus.
- Tidak ada batas jumlah cabang.

### F3. Master Barang
- Tambah / ubah / hapus barang: nama (wajib), kategori (teks bebas), satuan (pcs, set, dll.), sumber pembelian, harga jual (opsional), **stok minimum**, catatan.
- **Harga beli tidak diisi di master barang.** Harga beli dicatat saat stok masuk sebagai *total harga untuk jumlah yang masuk*; modal per satuan dihitung otomatis sebagai rata-rata tertimbang seluruh stok semua cabang dan hanya ditampilkan.
- Saat menambah barang baru, **stok awal tiap cabang** (dan total harga belinya) dapat langsung diisi; barang dan stok awal tersimpan dalam satu transaksi.
- Barang bersifat global (satu daftar untuk semua cabang); stok dicatat per cabang.
- Hapus barang: diarsipkan jika sudah punya riwayat mutasi.
- Pencarian (nama/kategori/sumber) dan filter kategori.

### F4. Stok per Cabang dan Mutasi
- Setiap pasangan (barang, cabang) punya jumlah stok sendiri, awalnya 0.
- Jenis mutasi:
  - **Masuk** (restock/pembelian): menambah stok.
  - **Keluar** (terjual/rusak/hilang/lainnya): mengurangi stok.
  - **Koreksi stok / penyesuaian** (stok opname): owner mengisi jumlah sebenarnya, sistem menghitung selisihnya.
- Alasan dipilih sekali ketuk (Keluar: Terjual/Rusak/Hilang/Lainnya; Koreksi: Stok opname/Salah catat/Lainnya).
- **Jalan pintas di halaman Stok**: tombol − / + (1 barang terjual / masuk) dan angka stok yang dapat diketik langsung (selisih dicatat sebagai masuk atau keluar). Perubahan tampil seketika (optimistik) lalu disinkronkan.
- Pindah cabang, pencarian, dan filter "Menipis" berjalan di perangkat tanpa memuat ulang halaman.
- Setiap mutasi menyimpan: barang, cabang, jenis, jumlah, stok sebelum dan sesudah, catatan/alasan, waktu, pelaku.
- Stok tidak boleh negatif; mutasi keluar yang melebihi stok ditolak dengan pesan jelas.
- Mutasi tidak dapat diedit atau dihapus (hanya dikoreksi dengan mutasi penyesuaian) agar riwayat dapat dipercaya.
- Perubahan stok dan pencatatan mutasi dilakukan dalam satu transaksi database (atomik).

### F4b. Pembayaran dan utang supplier
- Pembelian (stok masuk atau stok awal barang baru) dengan total harga beli punya status bayar: **Lunas** (bawaan), **Bayar sebagian**, atau **Utang semua**. Sisa utang = total harga − dibayar.
- Utang dicatat atas nama supplier = isian "Dibeli dari" barang (otomatis terisi, bisa diganti per pembelian). Utang wajib punya nama supplier.
- Menu **Utang supplier** (Kelola): total utang, utang per supplier, dan riwayat pembayaran. Pembayaran dilakukan **per supplier sekaligus**; nominal otomatis melunasi pembelian **terlama lebih dulu** (dengan pratinjau), tidak boleh melebihi total utang. Tidak ada jatuh tempo.
- Beranda menampilkan total utang; Riwayat menampilkan sisa utang tiap pembelian.
- Modal rata-rata tidak terpengaruh status bayar.
- Pembelian yang masih berutang **tidak dapat dihapus** dari Riwayat (termasuk "Hapus semua"); lunasi dulu.
- Pembelian lama (sebelum fitur ini) dianggap lunas saat migrasi.

### F5. Dashboard
- Kartu ringkasan: jumlah cabang aktif, jumlah jenis barang, total nilai stok (stok × harga beli).
- Daftar **stok menipis** (stok ≤ stok minimum) beserta cabangnya.
- Tabel ringkas stok per cabang (pilih cabang lewat tab/dropdown).
- Aktivitas terbaru (10 mutasi terakhir).

### F6. Riwayat Mutasi
- Daftar semua mutasi, urut terbaru, dengan filter cabang, barang, jenis, dan rentang tanggal.
- Pagination. Riwayat dikelompokkan per hari.
- **Hapus riwayat**: satu per satu (ikon tempat sampah), atau banyak sekaligus (lebih lama dari 30 hari / 90 hari / 1 tahun, atau semua; menghapus semua wajib mengetik HAPUS). Menghapus riwayat tidak mengubah jumlah stok dan tidak dapat dikembalikan.

## 5. Kebutuhan Non-Fungsional

- **Biaya**: hanya tier gratis (Vercel Hobby, Supabase Free); domain `*.vercel.app`.
- **Keamanan**: Row Level Security aktif di semua tabel; data hanya bisa diakses pemiliknya; kunci rahasia tidak pernah dikirim ke browser.
- **Responsif**: nyaman dipakai di HP (mobile-first) maupun desktop.
- **Bahasa**: antarmuka Bahasa Indonesia.
- **Performa**: halaman utama termuat < 3 detik pada koneksi biasa untuk ≤ 1.000 barang.
- **Keandalan**: ekspor/backup data manual (CSV) disediakan di fase berikutnya; lihat risiko.
- **Siap berkembang**: skema data memakai konsep "toko/akun" (`owner_id`) dan tabel keanggotaan sehingga penambahan staf nanti tidak merombak struktur.

## 6. Model Data (garis besar)

```
profiles          id (= auth.users.id), nama
branches          id, owner_id, nama, alamat, telepon, is_archived, created_at
products          id, owner_id, nama, kategori, sumber, satuan,
                  harga_beli, harga_jual, stok_minimum, catatan,
                  is_archived, created_at
stock_levels      product_id, branch_id, jumlah   (PK: product_id + branch_id)
stock_movements   id, product_id, branch_id, tipe (masuk|keluar|penyesuaian),
                  jumlah, stok_sebelum, stok_sesudah, catatan,
                  created_by, created_at
(fase 2) branch_members   user_id, branch_id, peran
```

Perubahan stok dilakukan lewat satu fungsi database (RPC) yang mengunci baris, memvalidasi, memperbarui `stock_levels`, dan menulis `stock_movements` sekaligus.

## 7. Alur Utama

1. Owner login → dashboard.
2. Owner menambah barang → barang muncul di semua cabang dengan stok 0.
3. Owner memilih cabang + barang → catat "Masuk 50" → stok cabang itu bertambah, riwayat tercatat.
4. Barang turun ≤ stok minimum → muncul di daftar stok menipis.
5. Owner menambah cabang baru atau mengarsipkan cabang yang ditutup.

## 8. Teknologi

Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, Supabase (Postgres + Auth + RLS), deploy ke Vercel.

## 9. Kriteria Penerimaan (MVP)

- [ ] Owner bisa login/logout; halaman lain tidak bisa dibuka tanpa login.
- [ ] Ada 3 cabang awal; owner bisa menambah, mengubah, dan menghapus/mengarsipkan cabang.
- [ ] Owner bisa CRUD barang dan mengisi stok minimum.
- [ ] Mutasi masuk/keluar/penyesuaian memperbarui stok cabang yang benar dan tercatat di riwayat.
- [ ] Stok negatif ditolak.
- [ ] Dashboard menampilkan ringkasan dan daftar stok menipis dengan benar.
- [ ] Aplikasi dapat diakses publik di URL Vercel dan nyaman di layar HP.
- [ ] Pengguna lain tidak dapat membaca data owner (diuji lewat RLS).

## 10. Fase Berikutnya

1. Akun staf per cabang dengan hak akses terbatas.
2. Transfer stok antar cabang.
3. Ekspor laporan CSV/Excel dan import barang dari Excel.
4. Scan barcode, notifikasi stok menipis, pencatatan penjualan sederhana.

## 11. Risiko dan Catatan

| Risiko | Mitigasi |
|---|---|
| Vercel Hobby ditujukan untuk non-komersial | Cukup untuk uji coba/skala kecil; siapkan alternatif (Cloudflare Pages) atau upgrade bila dipakai serius |
| Supabase Free di-pause setelah ±1 minggu tidak aktif | Pakai rutin; buka aplikasi berkala; ekspor data berkala |
| Tidak ada backup otomatis di tier gratis | Tambahkan fitur ekspor CSV lebih awal |
| Data stok salah karena input keliru | Riwayat tidak bisa diedit; koreksi lewat penyesuaian; catatan wajib untuk keluar/penyesuaian |

## 12. Pertanyaan Terbuka

- Nama 3 cabang awal apa saja?
- Apakah harga beli/jual perlu diisi sejak awal, atau stok saja dulu?
- Perlukah catatan wajib pada setiap mutasi, atau hanya untuk keluar/penyesuaian?
