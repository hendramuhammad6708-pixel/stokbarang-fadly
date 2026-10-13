import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { Nav } from "@/components/nav";
import { logout } from "../actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:pl-56">
      <Nav />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper pl-4 md:hidden">
        <span className="flex items-center gap-2.5 text-lg font-bold"><Logo size={28} /> Stok Toko</span>
        <form action={logout}>
          <button aria-label="Keluar" className="icon-btn"><LogOut size={20} /></button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
        <form action={logout} className="mb-4 hidden justify-end md:flex">
          <button className="flex min-h-11 items-center gap-2 px-1 text-sm font-medium text-muted hover:text-ink"><LogOut size={16} /> Keluar</button>
        </form>
        {children}
      </main>
    </div>
  );
}
