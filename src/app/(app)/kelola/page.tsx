import Link from "next/link";
import { ChevronRight, LogOut, Shirt, Store } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../../actions";

export default async function KelolaPage() {
  // Cukup menghitung baris; tidak perlu mengunduh seluruh data stok
  const supabase = await createClient();
  const [{ count: jmlBarang }, { count: jmlCabang }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_archived", false),
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("is_archived", false),
  ]);
  const menu = [
    { href: "/barang", label: "Barang", info: `${jmlBarang ?? 0} jenis · tambah, ubah, hapus`, icon: Shirt },
    { href: "/cabang", label: "Cabang", info: `${jmlCabang ?? 0} cabang aktif · tambah, ubah, hapus`, icon: Store },
  ];

  return (
    <>
      <PageHeader title="Kelola" subtitle="Pengaturan yang jarang diubah" />
      <ul className="panel divide-y divide-line">
        {menu.map(({ href, label, info, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-line/40">
              <Icon size={22} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block truncate text-sm text-muted">{info}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <form action={logout} className="mt-6">
        <button className="btn-soft w-full text-danger"><LogOut size={18} /> Keluar dari akun</button>
      </form>
    </>
  );
}
