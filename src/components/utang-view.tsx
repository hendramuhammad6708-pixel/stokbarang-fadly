"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { useShell } from "@/components/data-provider";
import { FormSheet } from "@/components/form-dialog";
import { Empty, PageHeader, Section } from "@/components/page-header";
import { useTahan } from "@/components/use-tahan";
import { jam, labelHari, rupiah } from "@/lib/format";
import { kelompokkanUtang, totalUtang, type GrupUtang } from "@/lib/utang";
import type { PembayaranSupplier, UtangRow } from "@/lib/types";
import { bayarUtang, hapusPembayaran, hapusUtang } from "@/app/actions";

function Tanggal({ iso }: { iso: string }) {
  return <span suppressHydrationWarning>{labelHari(iso)}, {jam(iso)}</span>;
}

// Isi lembar "Bayar": nominal, pratinjau pembagian (terlama dulu), daftar pembelian, riwayat pembayaran
function BayarFields({ grup }: { grup: GrupUtang }) {
  const [jumlah, setJumlah] = useState("");
  const n = jumlah === "" ? 0 : Number(jumlah);
  const valid = Number.isFinite(n) ? n : 0;
  const lebih = valid > grup.sisa;

  // Pratinjau: pembayaran melunasi pembelian terlama lebih dulu
  const bayar = lebih ? 0 : valid;
  const rencana = grup.rows.reduce<{ r: UtangRow; ambil: number }[]>((acc, r) => {
    const terpakai = acc.reduce((t, x) => t + x.ambil, 0);
    acc.push({ r, ambil: Math.min(Number(r.sisa), Math.max(0, bayar - terpakai)) });
    return acc;
  }, []);

  return (
    <>
      <input type="hidden" name="supplier" value={grup.nama} />
      <div>
        <label htmlFor="jumlah_bayar" className="label">Jumlah dibayar (Rp)</label>
        <input
          id="jumlah_bayar" name="jumlah" type="number" min={1} max={grup.sisa} step="any" inputMode="decimal" required autoFocus
          value={jumlah} onChange={(e) => setJumlah(e.target.value)} className="input text-xl font-semibold num" placeholder="0"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={`text-[15px] num ${lebih ? "font-medium text-danger" : "text-muted"}`}>
            {lebih ? `Melebihi total utang (${rupiah(grup.sisa)})` : <>Sisa setelah ini: <b className="text-ink">{rupiah(Math.max(0, grup.sisa - valid))}</b></>}
          </p>
          <button type="button" onClick={() => setJumlah(String(grup.sisa))} className="min-h-10 shrink-0 rounded-full border border-line px-3.5 text-sm font-medium">
            Lunasi semua
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="catatan_bayar" className="label">Catatan (opsional)</label>
        <input id="catatan_bayar" name="catatan" className="input" placeholder="mis. transfer BCA" />
      </div>

      <div>
        <p className="label">Pembelian yang belum lunas <span className="font-normal text-muted">· dilunasi dari yang terlama</span></p>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {rencana.map(({ r, ambil }) => {
            const lunas = ambil >= Number(r.sisa);
            return (
              <li key={r.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">{r.produk}</p>
                  <p className="truncate text-sm text-muted">{r.cabang} · <Tanggal iso={r.created_at} /></p>
                  <p className="num text-sm text-muted">Beli {rupiah(r.total_harga)} · dibayar {rupiah(r.dibayar)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num font-semibold">{rupiah(r.sisa)}</p>
                  {ambil > 0 && <p className={`num text-sm font-medium ${lunas ? "text-ok" : "text-danger"}`}>{lunas ? "jadi lunas" : `sisa ${rupiah(Number(r.sisa) - ambil)}`}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {grup.riwayat.length > 0 && (
        <div>
          <p className="label">Riwayat pembayaran</p>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {grup.riwayat.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-muted"><Tanggal iso={p.created_at} /></p>
                  {p.catatan && <p className="truncate text-sm">{p.catatan}</p>}
                </div>
                <p className="num shrink-0 font-semibold text-ok">{rupiah(p.jumlah)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// Baris supplier: ketuk = bayar, tahan lama atau tempat sampah = hapus utangnya
function BarisSupplier({ g, onBayar, onHapus }: { g: GrupUtang; onBayar: () => void; onHapus: () => void }) {
  const tahan = useTahan(onHapus);
  return (
    <li className="flex touch-pan-y select-none items-stretch [-webkit-touch-callout:none]" {...tahan}>
      <button onClick={onBayar} className="flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 py-3 pl-4 pr-2 text-left active:bg-line/40">
        <span className="min-w-0">
          <span className="block truncate font-medium">{g.nama}</span>
          <span className="block text-sm text-muted">{g.rows.length} pembelian belum lunas</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="num text-lg font-bold">{rupiah(g.sisa)}</span>
          <ChevronRight size={18} className="text-muted" />
        </span>
      </button>
      <button onClick={onHapus} aria-label={`Hapus utang ${g.nama}`} className="icon-btn !size-auto min-w-12">
        <Trash2 size={18} />
      </button>
    </li>
  );
}

// Baris catatan pembayaran: tahan lama atau tempat sampah = hapus catatan
function BarisPembayaran({ p, onHapus }: { p: PembayaranSupplier; onHapus: () => void }) {
  const tahan = useTahan(onHapus);
  return (
    <li className="flex touch-pan-y select-none items-center [-webkit-touch-callout:none]" {...tahan}>
      <div className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 py-2.5 pl-4 pr-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{p.supplier}</p>
          <p className="truncate text-sm text-muted"><Tanggal iso={p.created_at} />{p.catatan ? ` · ${p.catatan}` : ""}</p>
        </div>
        <p className="num shrink-0 font-bold text-ok">{rupiah(p.jumlah)}</p>
      </div>
      <button onClick={onHapus} aria-label={`Hapus pembayaran ${p.supplier}`} className="icon-btn !size-auto min-h-12 min-w-12">
        <Trash2 size={18} />
      </button>
    </li>
  );
}

type Hapus = { type: "utang"; g: GrupUtang } | { type: "bayar"; p: PembayaranSupplier } | null;

export function UtangView() {
  const { utang, pembayaran } = useShell();
  const grup = useMemo(() => kelompokkanUtang(utang, pembayaran), [utang, pembayaran]);
  const total = useMemo(() => totalUtang(utang), [utang]);
  const [terpilih, setTerpilih] = useState<string | null>(null);
  const aktif = grup.find((g) => g.kunci === terpilih);
  const [hapus, setHapus] = useState<Hapus>(null);

  return (
    <>
      <PageHeader back={{ href: "/kelola", label: "Kelola" }} title="Utang supplier" subtitle="Pembelian yang belum dibayar penuh" />

      {grup.length === 0 ? (
        <Empty>
          Tidak ada utang. Saat mencatat stok masuk di menu Stok, isi total harga beli lalu pilih <b>Bayar sebagian</b> atau <b>Utang semua</b>; utangnya muncul di sini.
        </Empty>
      ) : (
        <>
          <div className="panel mb-6 p-4">
            <p className="text-sm text-muted">Total utang</p>
            <p className="num text-3xl font-bold text-danger">{rupiah(total)}</p>
            <p className="mt-0.5 text-sm text-muted">{grup.length} supplier · {utang.length} pembelian</p>
          </div>

          <Section title="Per supplier">
            <ul className="panel divide-y divide-line">
              {grup.map((g) => (
                <BarisSupplier key={g.kunci} g={g} onBayar={() => setTerpilih(g.kunci)} onHapus={() => setHapus({ type: "utang", g })} />
              ))}
            </ul>
          </Section>
        </>
      )}

      {pembayaran.length > 0 && (
        <Section title="Pembayaran terakhir">
          <ul className="panel divide-y divide-line">
            {pembayaran.slice(0, 8).map((p) => (
              <BarisPembayaran key={p.id} p={p} onHapus={() => setHapus({ type: "bayar", p })} />
            ))}
          </ul>
        </Section>
      )}

      {aktif && (
        <FormSheet
          title={`Bayar ${aktif.nama}`}
          description={`Total utang ${rupiah(aktif.sisa)}`}
          action={bayarUtang}
          submitLabel="Bayar"
          onClose={() => setTerpilih(null)}
        >
          <BayarFields grup={aktif} />
        </FormSheet>
      )}

      {hapus?.type === "utang" && (
        <FormSheet
          title={`Hapus utang ${hapus.g.nama}?`}
          description={`${hapus.g.rows.length} pembelian dengan sisa ${rupiah(hapus.g.sisa)} dihapus beserta catatannya di Riwayat. Jumlah stok tidak berubah dan tidak bisa dikembalikan.`}
          action={hapusUtang}
          submitLabel="Hapus utang"
          danger
          onClose={() => setHapus(null)}
        >
          {hapus.g.rows.map((r) => <input key={r.id} type="hidden" name="id" value={r.id} />)}
        </FormSheet>
      )}
      {hapus?.type === "bayar" && (
        <FormSheet
          title="Hapus catatan pembayaran?"
          description={`${hapus.p.supplier} · ${rupiah(hapus.p.jumlah)}. Hanya catatan ini yang dihapus; sisa utang tidak berubah.`}
          action={hapusPembayaran}
          submitLabel="Hapus"
          danger
          onClose={() => setHapus(null)}
        >
          <input type="hidden" name="id" value={hapus.p.id} />
        </FormSheet>
      )}
    </>
  );
}
