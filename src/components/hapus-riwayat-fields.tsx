"use client";

import { useState } from "react";
import { Field } from "@/components/form-dialog";

const PILIHAN = [
  { v: "30", label: "Lebih lama dari 30 hari" },
  { v: "90", label: "Lebih lama dari 90 hari" },
  { v: "365", label: "Lebih lama dari 1 tahun" },
  { v: "semua", label: "Semua riwayat" },
];

// Pilihan rentang penghapusan; menghapus semuanya wajib mengetik HAPUS
export function HapusRiwayatFields() {
  const [rentang, setRentang] = useState("90");
  return (
    <>
      <div role="radiogroup" aria-label="Rentang riwayat yang dihapus" className="space-y-2">
        {PILIHAN.map((p) => (
          <button
            key={p.v}
            type="button"
            role="radio"
            aria-checked={rentang === p.v}
            onClick={() => setRentang(p.v)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-4 text-left text-[15px] font-medium ${rentang === p.v ? "border-ink bg-ink text-paper" : "border-line bg-surface"}`}
          >
            <span className={`size-4 shrink-0 rounded-full border-2 ${rentang === p.v ? "border-paper bg-paper" : "border-line"}`} aria-hidden />
            {p.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="rentang" value={rentang} />
      {rentang === "semua" && (
        <Field label="Ketik HAPUS untuk melanjutkan" name="konfirmasi" required autoComplete="off" autoCapitalize="characters" placeholder="HAPUS" />
      )}
      <p className="border-l-4 border-warn bg-warn/10 px-3 py-2 text-[15px]">
        Jumlah stok <b>tidak berubah</b>. Yang dihapus hanya catatan di halaman Riwayat, dan <b>tidak bisa dikembalikan</b>.
      </p>
    </>
  );
}
