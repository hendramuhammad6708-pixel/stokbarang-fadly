"use client";

import { useState } from "react";
import { rupiah } from "@/lib/format";

const tipeList = [
  { value: "masuk", label: "Masuk" },
  { value: "keluar", label: "Keluar" },
  { value: "penyesuaian", label: "Koreksi stok" },
] as const;

// Alasan sekali ketuk; mengetik hanya jika memilih "Lainnya"
const ALASAN: Record<string, string[]> = {
  keluar: ["Terjual", "Rusak", "Hilang", "Lainnya"],
  penyesuaian: ["Stok opname", "Salah catat", "Lainnya"],
};

export function MutasiFields({ productId, branchId, stok, satuan }: { productId: string; branchId: string; stok: number; satuan: string }) {
  const [tipe, setTipe] = useState<string>("masuk");
  const [jumlah, setJumlah] = useState("");
  const [total, setTotal] = useState("");
  const [alasan, setAlasan] = useState("");
  const [ket, setKet] = useState("");

  const n = jumlah === "" ? null : Number(jumlah);
  const sesuaikan = tipe === "penyesuaian";
  const daftarAlasan = ALASAN[tipe];
  const alasanAktif = daftarAlasan ? (daftarAlasan.includes(alasan) ? alasan : daftarAlasan[0]) : "";
  const lainnya = alasanAktif === "Lainnya";

  // Pratinjau stok setelah dicatat, agar salah ketik langsung terlihat
  const hasil = n === null || !Number.isFinite(n) ? null : tipe === "masuk" ? stok + n : tipe === "keluar" ? stok - n : n;
  const kurang = hasil !== null && hasil < 0;
  const totalN = total === "" ? null : Number(total);
  const perSatuan = tipe === "masuk" && n && n > 0 && totalN !== null && Number.isFinite(totalN) ? totalN / n : null;

  const catatan = !daftarAlasan ? ket : lainnya ? ket : ket ? `${alasanAktif} - ${ket}` : alasanAktif;

  return (
    <>
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="branch_id" value={branchId} />
      <input type="hidden" name="tipe" value={tipe} />
      <input type="hidden" name="catatan" value={catatan} />

      <div role="radiogroup" aria-label="Jenis perubahan" className="grid grid-cols-3 overflow-hidden rounded-lg border border-line">
        {tipeList.map((t, i) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={tipe === t.value}
            onClick={() => setTipe(t.value)}
            className={`min-h-12 text-[15px] font-medium ${i > 0 ? "border-l border-line" : ""} ${tipe === t.value ? "bg-accent text-on-accent" : "bg-surface text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="jumlah" className="label">{sesuaikan ? "Jumlah sebenarnya di rak" : "Jumlah"}</label>
        <input
          id="jumlah" name="jumlah" type="number" min={sesuaikan ? 0 : 1} step={1} inputMode="numeric" required autoFocus
          value={jumlah} onChange={(e) => setJumlah(e.target.value)}
          className="input text-xl font-semibold num" placeholder="0"
        />
        <p className={`mt-1.5 text-[15px] num ${kurang ? "font-medium text-danger" : "text-muted"}`}>
          {kurang
            ? `Melebihi stok yang ada (${stok} ${satuan})`
            : sesuaikan && hasil === null
              ? "Hitung barang yang benar-benar ada, lalu isi angkanya."
              : <>Stok {stok} → <b className="text-ink">{hasil ?? "…"}</b> {satuan}</>}
        </p>
      </div>

      {tipe === "masuk" && (
        <div>
          <label htmlFor="total_harga" className="label">Total harga beli{n && n > 0 ? ` untuk ${n} ${satuan}` : ""} (Rp)</label>
          <input
            id="total_harga" name="total_harga" type="number" min={0} step="any" inputMode="decimal"
            value={total} onChange={(e) => setTotal(e.target.value)} className="input num" placeholder="mis. 350000"
          />
          <p className="mt-1.5 text-[15px] text-muted num">
            {perSatuan !== null ? <>Setara <b className="text-ink">{rupiah(Math.round(perSatuan))}</b> per {satuan}</> : "Isi total yang Anda bayar untuk semua jumlah di atas. Boleh dikosongkan."}
          </p>
        </div>
      )}

      {daftarAlasan && (
        <div>
          <p className="label">{sesuaikan ? "Alasan koreksi" : "Alasan keluar"}</p>
          <div role="radiogroup" aria-label="Alasan" className="flex flex-wrap gap-2">
            {daftarAlasan.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={alasanAktif === a}
                onClick={() => setAlasan(a)}
                className={`min-h-11 rounded-full border px-4 text-[15px] font-medium ${alasanAktif === a ? "border-ink bg-ink text-paper" : "border-line bg-surface"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="ket" className="label">{lainnya ? "Tulis alasannya" : "Keterangan (opsional)"}</label>
        <input
          id="ket" value={ket} onChange={(e) => setKet(e.target.value)} required={lainnya} className="input"
          placeholder={tipe === "masuk" ? "mis. restock dari supplier" : lainnya ? "mis. dipakai untuk display" : "mis. dibeli pelanggan A"}
        />
      </div>
    </>
  );
}
