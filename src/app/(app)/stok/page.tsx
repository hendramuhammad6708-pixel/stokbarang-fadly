import { StokRoute } from "@/components/route-views";

export default async function Page({ searchParams }: { searchParams: Promise<{ cabang?: string; hanya?: string }> }) {
  // Cabang awal dari tautan Beranda dibaca di server, tanpa Suspense (Suspense menunda tampilan ~300 ms)
  const { cabang, hanya } = await searchParams;
  return <StokRoute initialBranch={cabang} initialMenipis={hanya === "menipis"} />;
}
