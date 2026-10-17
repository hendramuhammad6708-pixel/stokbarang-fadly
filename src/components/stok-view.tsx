"use client";

import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { FormSheet } from "@/components/form-dialog";
import { MutasiFields } from "@/components/mutasi-fields";
import { Empty, PageHeader } from "@/components/page-header";
import { ProductSheet } from "@/components/product-sheet";
import { angka } from "@/lib/format";
import type { Product } from "@/lib/types";
import { catatCepat, catatMutasi } from "@/app/actions";

type Props = {
  branches: { id: string; nama: string }[];
  products: Product[];
  /** stok per barang, urutannya mengikuti `branches` */
  stok: Record<string, number[]>;
  sumberList: string[];
  initialBranch?: string;
  initialMenipis: boolean;
};

type Sheet = { type: "mutasi"; p: Product } | { type: "baru" } | null;

export function StokView({ branches, products, stok, sumberList, initialBranch, initialMenipis }: Props) {
  const [idx, setIdx] = useState(() => Math.max(0, branches.findIndex((b) => b.id === initialBranch)));
  const [q, setQ] = useState("");
  const [menipis, setMenipis] = useState(initialMenipis);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Angka berubah seketika saat tombol −1/+1 ditekan; disinkronkan dengan server setelah selesai
  const [matriks, ubahLokal] = useOptimistic(stok, (m, a: { id: string; i: number; d: number }) => ({
    ...m,
    [a.id]: m[a.id].map((v, j) => (j === a.i ? Math.max(0, v + a.d) : v)),
  }));

  // Jika cabang berkurang (mis. diarsipkan) saat halaman terbuka, kembali ke cabang pertama
  const cabang = branches[idx] ?? branches[0];
  const aktifIdx = branches[idx] ? idx : 0;
  const kata = q.trim().toLowerCase();

  const { daftar, totalUnit } = useMemo(() => {
    const daftar: { p: Product; n: number; rendah: boolean }[] = [];
    let totalUnit = 0;
    for (const p of products) {
      const n = matriks[p.id]?.[aktifIdx] ?? 0;
      totalUnit += n;
      const rendah = p.stok_minimum > 0 && n <= p.stok_minimum;
      if (kata && !p.nama.toLowerCase().includes(kata) && !p.kategori?.toLowerCase().includes(kata)) continue;
      if (menipis && !rendah) continue;
      daftar.push({ p, n, rendah });
    }
    return { daftar, totalUnit };
  }, [products, matriks, aktifIdx, kata, menipis]);

  function pilihCabang(i: number) {
    setIdx(i);
    window.history.replaceState(null, "", `/stok?cabang=${branches[i].id}`);
  }

  // d = selisih (+ masuk, − keluar); dipakai tombol −/+ maupun angka yang diketik langsung
  function cepat(p: Product, d: number) {
    if (!Number.isInteger(d) || d === 0) return;
    setError(null);
    startTransition(async () => {
      ubahLokal({ id: p.id, i: aktifIdx, d });
      try {
        const r = await catatCepat(p.id, cabang.id, d > 0 ? "masuk" : "keluar", Math.abs(d));
        if (r.error) setError(`${p.nama}: ${r.error}`);
      } catch {
        setError(`${p.nama}: gagal terhubung ke server. Periksa koneksi internet lalu coba lagi.`);
      }
    });
  }

  if (branches.length === 0) {
    return (
      <>
        <PageHeader title="Stok" />
        <Empty>Belum ada cabang. <Link href="/cabang" className="font-medium text-accent underline">Tambah cabang</Link> terlebih dahulu.</Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Stok"
        subtitle={`${products.length} jenis barang · ${angka(totalUnit)} unit di cabang ini`}
        action={<button className="btn-primary shrink-0 whitespace-nowrap !px-4" onClick={() => setSheet({ type: "baru" })}><Plus size={20} /> Barang baru</button>}
      />

      <nav aria-label="Pilih cabang" className="-mx-4 mb-4 flex overflow-x-auto border-b border-line px-4 [scrollbar-width:none]">
        {branches.map((b, i) => (
          <button
            key={b.id}
            onClick={() => pilihCabang(i)}
            aria-current={i === aktifIdx ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-[15px] font-medium ${i === aktifIdx ? "border-accent text-accent" : "border-transparent text-muted"}`}
          >
            {b.nama}
          </button>
        ))}
      </nav>

      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Cari barang" aria-label="Cari barang" className="input pl-10" />
      </div>

      <div className="mb-4 flex gap-2 text-sm">
        {[["Semua", false], ["Menipis", true]].map(([label, nilai]) => (
          <button
            key={label as string}
            onClick={() => setMenipis(nilai as boolean)}
            className={`min-h-9 rounded-full border px-4 font-medium ${menipis === nilai ? "border-ink bg-ink text-paper" : "border-line text-muted"}`}
          >
            {label as string}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-3 border-l-4 border-danger bg-danger/10 px-3 py-2 text-[15px] text-danger">{error}</p>
      )}

      {daftar.length === 0 ? (
        <Empty>
          {products.length === 0
            ? "Belum ada barang. Tekan “Barang baru” di atas untuk memulai."
            : menipis && !kata ? "Tidak ada barang yang menipis di cabang ini." : "Barang tidak ditemukan."}
        </Empty>
      ) : (
        <ul className="panel divide-y divide-line">
          {daftar.map(({ p, n, rendah }) => (
            <li key={p.id} className="flex items-center">
              <button
                onClick={() => setSheet({ type: "mutasi", p })}
                aria-label={`Catat stok ${p.nama}`}
                className="min-h-16 min-w-0 flex-1 px-4 py-2.5 text-left active:bg-line/40"
              >
                <span className="block truncate font-medium">{p.nama}</span>
                <span className={`block truncate text-sm ${n === 0 ? "font-medium text-danger" : rendah ? "font-medium text-warn" : "text-muted"}`}>
                  {n === 0 ? "Habis" : rendah ? `Menipis · min ${p.stok_minimum}` : [p.kategori, p.satuan].filter(Boolean).join(" · ")}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-0.5 pr-2">
                <button aria-label={`Kurangi 1 ${p.nama}`} disabled={n <= 0} onClick={() => cepat(p, -1)} className="icon-btn !size-11 rounded-lg disabled:opacity-30">
                  <Minus size={20} />
                </button>
                <input
                  key={`${p.id}-${n}`}
                  type="number" inputMode="numeric" min={0} max={1_000_000_000} step={1}
                  defaultValue={n}
                  aria-label={`Jumlah stok ${p.nama}`}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") { e.currentTarget.value = String(n); e.currentTarget.blur(); }
                  }}
                  onBlur={(e) => {
                    const baru = e.currentTarget.value === "" ? NaN : Number(e.currentTarget.value);
                    if (!Number.isInteger(baru) || baru < 0 || baru === n) e.currentTarget.value = String(n);
                    else cepat(p, baru - n);
                  }}
                  className={`num h-11 w-16 rounded-lg border border-transparent bg-transparent text-center text-xl font-bold outline-none [appearance:textfield] hover:border-line focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${n === 0 ? "text-danger" : rendah ? "text-warn" : ""}`}
                />
                <button aria-label={`Tambah 1 ${p.nama}`} onClick={() => cepat(p, 1)} className="icon-btn !size-11 rounded-lg">
                  <Plus size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-muted">Tombol − dan + mencatat 1 barang terjual / masuk. Ketuk angkanya untuk mengetik jumlah baru langsung. Ketuk nama barang untuk harga beli atau koreksi stok.</p>

      {sheet?.type === "mutasi" && (
        <FormSheet
          title={sheet.p.nama}
          description={`Catat perubahan stok di ${cabang.nama}`}
          action={catatMutasi}
          submitLabel="Catat"
          onClose={() => setSheet(null)}
        >
          <MutasiFields productId={sheet.p.id} branchId={cabang.id} stok={matriks[sheet.p.id]?.[aktifIdx] ?? 0} satuan={sheet.p.satuan} sumber={sheet.p.sumber} />
        </FormSheet>
      )}
      {sheet?.type === "baru" && <ProductSheet branches={branches} sumberList={sumberList} onClose={() => setSheet(null)} />}
    </>
  );
}
