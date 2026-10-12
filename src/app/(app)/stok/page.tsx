import { StokView } from "@/components/stok-view";
import { getBase } from "@/lib/data";

export default async function StokPage({ searchParams }: { searchParams: Promise<{ cabang?: string; hanya?: string }> }) {
  const { cabang, hanya } = await searchParams;
  const { branches, products, getStok } = await getBase();

  // Semua data dikirim sekali; pindah cabang, mencari, dan menyaring terjadi seketika di perangkat
  const stok: Record<string, number[]> = {};
  for (const p of products) stok[p.id] = branches.map((b) => getStok(p.id, b.id));
  const sumberList = [...new Set(products.map((p) => p.sumber).filter((s): s is string => !!s))].sort();

  return (
    <StokView
      branches={branches.map((b) => ({ id: b.id, nama: b.nama }))}
      products={products}
      stok={stok}
      sumberList={sumberList}
      initialBranch={cabang}
      initialMenipis={hanya === "menipis"}
    />
  );
}
