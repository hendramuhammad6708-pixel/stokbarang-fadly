"use client";

import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { FormSheet } from "@/components/form-dialog";
import { useTahan } from "@/components/use-tahan";
import { hapusRiwayat } from "@/app/actions";

// Satu baris riwayat: tahan lama atau tombol tempat sampah membuka konfirmasi hapus.
// Pembelian yang masih berutang tidak bisa dihapus (lunasi dulu di menu Utang).
export function RiwayatBaris({ id, nama, ringkas, berutang, children }: { id: string; nama: string; ringkas: string; berutang: boolean; children: ReactNode }) {
  const [buka, setBuka] = useState(false);
  const tahan = useTahan(() => !berutang && setBuka(true));

  return (
    <li className="flex touch-pan-y select-none items-start [-webkit-touch-callout:none]" {...tahan}>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3 py-3 pl-4">{children}</div>
      {berutang ? (
        <span className="w-12 shrink-0" aria-hidden />
      ) : (
        <button onClick={() => setBuka(true)} aria-label={`Hapus riwayat ${nama}`} className="icon-btn !size-12 shrink-0">
          <Trash2 size={17} />
        </button>
      )}
      {buka && (
        <FormSheet
          title="Hapus riwayat ini?"
          description={`${ringkas}. Jumlah stok tidak berubah; hanya catatan ini yang dihapus.`}
          action={hapusRiwayat}
          submitLabel="Hapus"
          danger
          onClose={() => setBuka(false)}
        >
          <input type="hidden" name="id" value={id} />
        </FormSheet>
      )}
    </li>
  );
}
