"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { FormSheet } from "@/components/form-dialog";
import { Empty, PageHeader } from "@/components/page-header";
import { ProductSheet } from "@/components/product-sheet";
import { useTahan } from "@/components/use-tahan";
import { rupiah } from "@/lib/format";
import type { Product } from "@/lib/types";
import { hapusBarang } from "@/app/actions";

type Sheet = { type: "baru" } | { type: "ubah"; p: Product } | { type: "hapus"; p: Product } | null;

// Baris barang: ketuk = ubah, tahan lama = hapus
function BarisBarang({ p, onUbah, onHapus }: { p: Product; onUbah: () => void; onHapus: () => void }) {
  const tahan = useTahan(onHapus);
  return (
    <li className="flex touch-pan-y select-none items-stretch [-webkit-touch-callout:none]" {...tahan}>
      <button onClick={onUbah} aria-label={`Ubah ${p.nama}`} className="min-w-0 flex-1 px-4 py-3 text-left active:bg-line/40">
        <span className="block truncate font-medium">{p.nama}</span>
        <span className="block truncate text-sm text-muted">{[p.kategori, p.satuan, p.sumber && `dari ${p.sumber}`].filter(Boolean).join(" · ")}</span>
        <span className="num mt-0.5 block text-sm">
          <span className="text-muted">Modal</span> {rupiah(p.harga_beli)}
          <span className="mx-1.5 text-line">|</span>
          <span className="text-muted">Jual</span> {rupiah(p.harga_jual)}
        </span>
      </button>
      <button onClick={onHapus} aria-label={`Hapus ${p.nama}`} className="icon-btn !size-auto min-w-12">
        <Trash2 size={19} />
      </button>
    </li>
  );
}

export function BarangList({ products, branches, sumberList }: { products: Product[]; branches: { id: string; nama: string }[]; sumberList: string[] }) {
  const [q, setQ] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const kata = q.trim().toLowerCase();

  const daftar = useMemo(
    () => products.filter((p) => !kata || p.nama.toLowerCase().includes(kata) || p.kategori?.toLowerCase().includes(kata) || p.sumber?.toLowerCase().includes(kata)),
    [products, kata],
  );

  return (
    <>
      <PageHeader
        back={{ href: "/kelola", label: "Kelola" }}
        title="Barang"
        subtitle={`${products.length} jenis · dipakai bersama semua cabang`}
        action={<button className="btn-primary shrink-0 whitespace-nowrap !px-4" onClick={() => setSheet({ type: "baru" })}><Plus size={20} /> Tambah</button>}
      />

      <div className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Cari nama, kategori, atau sumber" aria-label="Cari barang" className="input pl-10" />
      </div>

      {daftar.length === 0 ? (
        <Empty>{q ? <>Tidak ada barang untuk “{q}”.</> : "Belum ada barang. Tekan “Tambah” untuk memulai."}</Empty>
      ) : (
        <ul className="panel divide-y divide-line">
          {daftar.map((p) => (
            <BarisBarang key={p.id} p={p} onUbah={() => setSheet({ type: "ubah", p })} onHapus={() => setSheet({ type: "hapus", p })} />
          ))}
        </ul>
      )}

      {sheet?.type === "baru" && <ProductSheet branches={branches} sumberList={sumberList} onClose={() => setSheet(null)} />}
      {sheet?.type === "ubah" && <ProductSheet product={sheet.p} branches={branches} sumberList={sumberList} onClose={() => setSheet(null)} />}
      {sheet?.type === "hapus" && (
        <FormSheet
          title={`Hapus ${sheet.p.nama}?`}
          description="Barang yang sudah punya riwayat stok akan diarsipkan, riwayatnya tetap tersimpan. Barang tanpa riwayat dihapus permanen."
          action={hapusBarang}
          submitLabel="Hapus"
          danger
          onClose={() => setSheet(null)}
        >
          <input type="hidden" name="id" value={sheet.p.id} />
        </FormSheet>
      )}
    </>
  );
}
