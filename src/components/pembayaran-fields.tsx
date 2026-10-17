"use client";

import { useState } from "react";
import { rupiah } from "@/lib/format";

type Mode = "lunas" | "sebagian" | "utang";
const PILIHAN: { v: Mode; label: string }[] = [
  { v: "lunas", label: "Lunas" },
  { v: "sebagian", label: "Bayar sebagian" },
  { v: "utang", label: "Utang semua" },
];

/**
 * Status pembayaran sebuah pembelian. Hanya tampil jika total harga beli sudah diisi.
 * Mengirim `dibayar` (kosong = lunas) dan, bila ada sisa utang dan supplierDefault diberikan, `supplier`.
 */
export function PembayaranFields({ total, supplierDefault, catatanUtang }: {
  total: number | null;
  /** string/null = tampilkan isian supplier (otomatis dari "Dibeli dari" barang); undefined = tidak ada isian */
  supplierDefault?: string | null;
  /** Keterangan tambahan saat ada sisa utang */
  catatanUtang?: string;
}) {
  const [mode, setMode] = useState<Mode>("lunas");
  const [nominal, setNominal] = useState("");

  if (!total || !Number.isFinite(total) || total <= 0) return null;

  const dibayar = mode === "lunas" ? total : mode === "utang" ? 0 : Number(nominal || 0);
  const lebih = Number.isFinite(dibayar) && dibayar > total;
  const sisa = Math.max(0, total - (Number.isFinite(dibayar) ? dibayar : 0));
  const kirim = mode === "lunas" ? "" : mode === "utang" ? "0" : nominal;

  return (
    <div className="space-y-3">
      <input type="hidden" name="dibayar" value={kirim} />
      <div>
        <p className="label">Pembayaran</p>
        <div role="radiogroup" aria-label="Status pembayaran" className="grid grid-cols-3 overflow-hidden rounded-lg border border-line">
          {PILIHAN.map((p, i) => (
            <button
              key={p.v}
              type="button"
              role="radio"
              aria-checked={mode === p.v}
              onClick={() => setMode(p.v)}
              className={`min-h-12 px-1 text-sm font-medium ${i > 0 ? "border-l border-line" : ""} ${mode === p.v ? "bg-ink text-paper" : "bg-surface text-ink"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "sebagian" && (
        <div>
          <label htmlFor="dibayar_sekarang" className="label">Yang dibayar sekarang (Rp)</label>
          <input
            id="dibayar_sekarang" type="number" min={0} max={total} step="any" inputMode="decimal" required
            value={nominal} onChange={(e) => setNominal(e.target.value)} className="input num" placeholder="mis. 400000"
          />
        </div>
      )}

      <p className={`text-[15px] num ${lebih ? "font-medium text-danger" : sisa > 0 ? "font-semibold text-warn" : "text-muted"}`}>
        {lebih ? `Melebihi total harga beli (${rupiah(total)})` : sisa > 0 ? `Sisa utang ${rupiah(sisa)}` : "Lunas, tidak ada utang."}
      </p>

      {sisa > 0 && !lebih && supplierDefault !== undefined && (
        <div>
          <label htmlFor="supplier" className="label">Berutang ke (supplier)</label>
          <input id="supplier" name="supplier" required defaultValue={supplierDefault ?? ""} className="input" placeholder="mis. Grosir Tanah Abang" autoComplete="off" />
        </div>
      )}
      {sisa > 0 && !lebih && catatanUtang && <p className="text-sm text-muted">{catatanUtang}</p>}
    </div>
  );
}
