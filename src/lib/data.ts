import { createClient } from "@/lib/supabase/server";
import type { Branch, Product, RecentMovement, ShellData, StockLevel } from "@/lib/types";

const HALAMAN = 1000; // batas baris per permintaan di Supabase

// Mengambil semua baris; tanpa ini hasil terpotong diam-diam di 1000 baris.
async function ambilSemua<T>(query: (dari: number, sampai: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const hasil: T[] = [];
  for (let dari = 0; ; dari += HALAMAN) {
    const { data } = await query(dari, dari + HALAMAN - 1);
    if (!data) break;
    hasil.push(...data);
    if (data.length < HALAMAN) break;
  }
  return hasil;
}

export async function getBase() {
  const supabase = await createClient();
  const [b, products, levels] = await Promise.all([
    supabase.from("branches").select("*").eq("is_archived", false).order("created_at"),
    ambilSemua<Product>((a, z) => supabase.from("products").select("*").eq("is_archived", false).order("nama").order("id").range(a, z)),
    ambilSemua<StockLevel>((a, z) => supabase.from("stock_levels").select("product_id, branch_id, jumlah").order("product_id").order("branch_id").range(a, z)),
  ]);
  const branches = (b.data ?? []) as Branch[];
  const stok = new Map(levels.map((l) => [`${l.product_id}:${l.branch_id}`, l.jumlah]));
  const getStok = (productId: string, branchId: string) => stok.get(`${productId}:${branchId}`) ?? 0;
  return { branches, products, getStok };
}

// Dimuat sekali di layout. Layout tidak dirender ulang saat pindah halaman, jadi navigasi tidak perlu ke server lagi;
// data diperbarui setelah setiap perubahan (revalidatePath) dan saat aplikasi dibuka kembali (lihat DataProvider).
export async function getShellData(): Promise<ShellData> {
  const supabase = await createClient();
  const [{ branches, products, getStok }, { data }] = await Promise.all([
    getBase(),
    supabase.from("stock_movements").select("*, products(nama), branches(nama)").order("created_at", { ascending: false }).limit(8),
  ]);
  const stok: Record<string, number[]> = {};
  for (const p of products) stok[p.id] = branches.map((b) => getStok(p.id, b.id));
  return { branches, products, stok, terbaru: (data ?? []) as unknown as RecentMovement[] };
}
