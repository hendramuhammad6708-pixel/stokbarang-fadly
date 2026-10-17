import type { PembayaranSupplier, UtangRow } from "@/lib/types";

export type GrupUtang = {
  kunci: string;
  nama: string;
  sisa: number;
  /** pembelian yang belum lunas, terlama dulu (urutan pelunasan) */
  rows: UtangRow[];
  riwayat: PembayaranSupplier[];
};

const kunciNama = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Mengelompokkan utang per supplier (huruf besar/kecil tidak dibedakan); utang terbesar di atas. */
export function kelompokkanUtang(utang: UtangRow[], pembayaran: PembayaranSupplier[]): GrupUtang[] {
  const peta = new Map<string, GrupUtang>();
  for (const r of utang) {
    const kunci = kunciNama(r.supplier);
    let g = peta.get(kunci);
    if (!g) {
      g = { kunci, nama: r.supplier?.trim() || "Tanpa nama supplier", sisa: 0, rows: [], riwayat: [] };
      peta.set(kunci, g);
    }
    g.sisa += Number(r.sisa);
    g.rows.push(r);
  }
  for (const g of peta.values()) {
    g.rows.sort((a, b) => (a.created_at === b.created_at ? (a.id > b.id ? 1 : -1) : a.created_at > b.created_at ? 1 : -1));
    g.riwayat = pembayaran.filter((p) => kunciNama(p.supplier) === g.kunci);
  }
  return [...peta.values()].sort((a, b) => b.sisa - a.sisa);
}

export const totalUtang = (utang: UtangRow[]) => utang.reduce((t, r) => t + Number(r.sisa), 0);
