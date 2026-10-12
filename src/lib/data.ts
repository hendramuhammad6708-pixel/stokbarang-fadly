import { createClient } from "@/lib/supabase/server";
import type { Branch, Product, StockLevel } from "@/lib/types";

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
