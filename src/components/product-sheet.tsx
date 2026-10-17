"use client";

import { useState } from "react";
import { Field, FormSheet } from "@/components/form-dialog";
import { PembayaranFields } from "@/components/pembayaran-fields";
import type { Product } from "@/lib/types";
import { simpanBarang } from "@/app/actions";

type Props = {
  product?: Product;
  branches: { id: string; nama: string }[];
  sumberList: string[];
  onClose: () => void;
};

// Form tambah/ubah barang. Saat menambah, stok awal tiap cabang bisa langsung diisi.
export function ProductSheet({ product: p, branches, sumberList, onClose }: Props) {
  const [total, setTotal] = useState("");
  const totalAngka = total !== "" && Number(total) > 0 ? Number(total) : null;
  return (
    <FormSheet title={p ? "Ubah barang" : "Barang baru"} action={simpanBarang} onClose={onClose}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="Nama barang" name="nama" required defaultValue={p?.nama} placeholder="mis. Kaos Polos Hitam - M" autoFocus={!p} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori" name="kategori" defaultValue={p?.kategori ?? ""} placeholder="mis. Kaos" />
        <Field label="Satuan" name="satuan" defaultValue={p?.satuan ?? "pcs"} placeholder="pcs, set, lusin" />
      </div>
      <Field label="Dibeli dari" name="sumber" list="daftar-sumber" defaultValue={p?.sumber ?? ""} placeholder="mis. Grosir Tanah Abang" autoComplete="off" />
      <datalist id="daftar-sumber">{sumberList.map((s) => <option key={s} value={s} />)}</datalist>
      <Field label="Harga jual per satuan (Rp)" name="harga_jual" type="number" min={0} step="any" inputMode="decimal" defaultValue={p?.harga_jual ?? ""} />
      <Field
        label="Stok minimum" name="stok_minimum" type="number" min={0} step={1} inputMode="numeric" defaultValue={p?.stok_minimum ?? 0}
        hint="Muncul di “Perlu restock” saat stok sama dengan atau di bawah angka ini. Isi 0 untuk mematikan."
      />

      {!p && branches.length > 0 && (
        <fieldset className="space-y-3 rounded-lg border border-line p-3.5">
          <legend className="px-1.5 text-sm font-semibold">Stok awal (opsional)</legend>
          <div className="grid grid-cols-2 gap-3">
            {branches.map((b) => (
              <Field key={b.id} label={b.nama} name={`awal_${b.id}`} type="number" min={0} step={1} inputMode="numeric" placeholder="0" />
            ))}
          </div>
          <Field
            label="Total harga beli stok awal (Rp)" name="total_harga" type="number" min={0} step="any" inputMode="decimal" placeholder="mis. 350000"
            value={total} onChange={(e) => setTotal(e.target.value)}
            hint="Total harga seluruh stok awal di atas (bukan yang dibayar sekarang). Dipakai menghitung modal per satuan."
          />
          <PembayaranFields total={totalAngka} catatanUtang="Utang dicatat atas nama supplier di kolom “Dibeli dari” di atas." />
        </fieldset>
      )}

      <Field label="Catatan" name="catatan" defaultValue={p?.catatan ?? ""} />
    </FormSheet>
  );
}
