"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Layers, Shirt, Store, History, Settings2, Wallet } from "lucide-react";
import { Logo } from "@/components/logo";

// Umpan balik halus saat halaman tujuan sedang dimuat (tanpa kerangka loading, yang justru menunda tampilan ~300 ms)
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden className="absolute inset-0 animate-pulse bg-line/60" /> : null;
}

type Item = { href: string; label: string; icon: typeof LayoutGrid; cocok?: string[] };

// HP: 4 menu saja. Barang dan Cabang jarang dibuka, jadi dikelompokkan di "Kelola".
const menuHP: Item[] = [
  { href: "/", label: "Beranda", icon: LayoutGrid },
  { href: "/stok", label: "Stok", icon: Layers },
  { href: "/riwayat", label: "Riwayat", icon: History },
  { href: "/kelola", label: "Kelola", icon: Settings2, cocok: ["/kelola", "/barang", "/cabang", "/utang"] },
];

// Desktop: ruang cukup, tampilkan semuanya
const menuDesktop: Item[] = [
  { href: "/", label: "Beranda", icon: LayoutGrid },
  { href: "/stok", label: "Stok", icon: Layers },
  { href: "/barang", label: "Barang", icon: Shirt },
  { href: "/cabang", label: "Cabang", icon: Store },
  { href: "/utang", label: "Utang", icon: Wallet },
  { href: "/riwayat", label: "Riwayat", icon: History },
];

export function Nav() {
  const path = usePathname();
  const aktif = ({ href, cocok }: Item) => (href === "/" ? path === "/" : (cocok ?? [href]).some((c) => path.startsWith(c)));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-line bg-surface md:flex">
        <p className="flex items-center gap-2.5 px-5 pb-5 pt-6 text-lg font-bold"><Logo size={30} /> Stok Toko</p>
        <nav>
          {menuDesktop.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={aktif(it) ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 border-l-4 px-4 text-[15px] font-medium ${
                aktif(it) ? "border-accent bg-line/40 text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <it.icon size={18} /> {it.label}
              <Pending />
            </Link>
          ))}
        </nav>
      </aside>

      <nav aria-label="Menu utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-4">
          {menuHP.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={aktif(it) ? "page" : undefined}
                className={`relative -mt-px flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 text-xs font-medium ${
                  aktif(it) ? "border-accent text-accent" : "border-transparent text-muted"
                }`}
              >
                <it.icon size={21} strokeWidth={aktif(it) ? 2.3 : 1.8} />
                {it.label}
                <Pending />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
