export type Branch = { id: string; nama: string; alamat: string | null; telepon: string | null; is_archived: boolean };
export type Product = {
  id: string; nama: string; kategori: string | null; sumber: string | null; satuan: string;
  harga_beli: number | null; harga_jual: number | null; stok_minimum: number; catatan: string | null; is_archived: boolean;
};
export type StockLevel = { product_id: string; branch_id: string; jumlah: number };
export type Movement = {
  id: string; product_id: string; branch_id: string; tipe: "masuk" | "keluar" | "penyesuaian";
  jumlah: number; stok_sebelum: number; stok_sesudah: number; total_harga: number | null; catatan: string | null; created_at: string;
};
export type ActionState = { error?: string; ok?: boolean } | undefined;
