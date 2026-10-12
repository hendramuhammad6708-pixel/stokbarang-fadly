import { BarangList } from "@/components/barang-list";
import { getBase } from "@/lib/data";

export default async function BarangPage() {
  const { branches, products } = await getBase();
  const sumberList = [...new Set(products.map((p) => p.sumber).filter((s): s is string => !!s))].sort();

  return <BarangList products={products} branches={branches.map((b) => ({ id: b.id, nama: b.nama }))} sumberList={sumberList} />;
}
