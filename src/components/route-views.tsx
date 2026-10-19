"use client";

import Link from "next/link";
import { ChevronRight, LogOut, Plus, Shirt, Store, Trash2, Wallet } from "lucide-react";
import { BarangList } from "@/components/barang-list";
import { useBranchOptions, useShell, useSumberList } from "@/components/data-provider";
import { Field, FormDialog } from "@/components/form-dialog";
import { Empty, PageHeader } from "@/components/page-header";
import { StokView } from "@/components/stok-view";
import { rupiah } from "@/lib/format";
import { kelompokkanUtang, totalUtang } from "@/lib/utang";
import type { Branch } from "@/lib/types";
import { hapusCabang, logout, simpanCabang } from "@/app/actions";

// Halaman-halaman di bawah hanya membaca data bersama dari layout, jadi berpindah halaman tidak menunggu server.

export function StokRoute({ initialBranch, initialMenipis }: { initialBranch?: string; initialMenipis: boolean }) {
  const { products, stok } = useShell();
  const branches = useBranchOptions();
  const sumberList = useSumberList();
  return (
    <StokView
      branches={branches}
      products={products}
      stok={stok}
      sumberList={sumberList}
      initialBranch={initialBranch}
      initialMenipis={initialMenipis}
    />
  );
}

export function BarangRoute() {
  const { products } = useShell();
  const branches = useBranchOptions();
  const sumberList = useSumberList();
  return <BarangList products={products} branches={branches} sumberList={sumberList} />;
}

export function KelolaRoute() {
  const { branches, products, utang } = useShell();
  const jmlSupplier = kelompokkanUtang(utang, []).length;
  const menu = [
    { href: "/utang", label: "Utang supplier", info: utang.length ? `${rupiah(totalUtang(utang))} · ${jmlSupplier} supplier` : "Tidak ada utang", icon: Wallet },
    { href: "/barang", label: "Barang", info: `${products.length} jenis · tambah, ubah, hapus`, icon: Shirt },
    { href: "/cabang", label: "Cabang", info: `${branches.length} cabang aktif · tambah, ubah, hapus`, icon: Store },
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
                <span className={`block font-medium ${href === "/utang" && utang.length ? "text-danger" : ""}`}>{label}</span>
                <span className={`block truncate text-sm ${href === "/utang" && utang.length ? "text-danger" : "text-muted"}`}>{info}</span>
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

function CabangFields({ b }: { b?: Branch }) {
  return (
    <>
      {b && <input type="hidden" name="id" value={b.id} />}
      <Field label="Nama cabang" name="nama" required defaultValue={b?.nama} placeholder="mis. Cabang Pasar Baru" />
      <Field label="Alamat" name="alamat" defaultValue={b?.alamat ?? ""} />
      <Field label="Telepon" name="telepon" type="tel" inputMode="tel" defaultValue={b?.telepon ?? ""} />
    </>
  );
}

export function CabangRoute() {
  const { branches } = useShell();
  return (
    <>
      <PageHeader
        back={{ href: "/kelola", label: "Kelola" }}
        title="Cabang"
        subtitle={`${branches.length} cabang aktif`}
        action={
          <FormDialog trigger={<><Plus size={20} /> Tambah</>} triggerClassName="btn-primary" title="Tambah cabang" action={simpanCabang}>
            <CabangFields />
          </FormDialog>
        }
      />

      {branches.length === 0 ? (
        <Empty>Belum ada cabang. Tekan “Tambah” untuk membuat cabang pertama.</Empty>
      ) : (
        <ul className="panel divide-y divide-line">
          {branches.map((b) => (
            <li key={b.id} className="flex items-stretch">
              <FormDialog
                trigger={
                  <>
                    <span className="block truncate font-medium">{b.nama}</span>
                    <span className="block truncate text-sm text-muted">{[b.alamat, b.telepon].filter(Boolean).join(" · ") || "Alamat belum diisi"}</span>
                  </>
                }
                triggerClassName="min-w-0 flex-1 px-4 py-3.5 text-left active:bg-line/40"
                triggerLabel={`Ubah ${b.nama}`}
                title="Ubah cabang"
                action={simpanCabang}
              >
                <CabangFields b={b} />
              </FormDialog>
              <FormDialog
                trigger={<Trash2 size={19} />}
                triggerClassName="icon-btn !size-auto min-w-12"
                triggerLabel={`Hapus ${b.nama}`}
                title={`Hapus ${b.nama}?`}
                description="Cabang yang sudah punya riwayat stok akan diarsipkan, riwayatnya tetap tersimpan. Cabang tanpa riwayat dihapus permanen."
                action={hapusCabang}
                submitLabel="Hapus"
                danger
              >
                <input type="hidden" name="id" value={b.id} />
              </FormDialog>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
