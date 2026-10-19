import Link from "next/link";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { FormDialog } from "@/components/form-dialog";
import { HapusRiwayatFields } from "@/components/hapus-riwayat-fields";
import { RiwayatBaris } from "@/components/riwayat-baris";
import { Empty, PageHeader } from "@/components/page-header";
import { jam, kunciHari, labelHari, rupiah } from "@/lib/format";
import type { Branch, Movement } from "@/lib/types";
import { hapusRiwayatBanyak } from "../../actions";

type Row = Movement & { products: { nama: string; satuan: string } | null; branches: { nama: string } | null };
const PER_HALAMAN = 25;
const TIPE_LABEL = { masuk: "Masuk", keluar: "Keluar", penyesuaian: "Koreksi stok" } as const;

export default async function RiwayatPage({ searchParams }: { searchParams: Promise<{ cabang?: string; tipe?: string; hal?: string }> }) {
  const { cabang = "", tipe = "", hal = "1" } = await searchParams;
  const halaman = Math.max(1, parseInt(hal) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("stock_movements")
    .select("*, products(nama, satuan), branches(nama)")
    .order("created_at", { ascending: false })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN); // 1 baris ekstra untuk mengetahui ada halaman berikutnya
  if (cabang) query = query.eq("branch_id", cabang);
  if (Object.hasOwn(TIPE_LABEL, tipe)) query = query.eq("tipe", tipe);

  const [{ data }, { data: cb }] = await Promise.all([
    query,
    supabase.from("branches").select("id, nama").eq("is_archived", false).order("created_at"),
  ]);
  const semua = (data ?? []) as unknown as Row[];
  const rows = semua.slice(0, PER_HALAMAN);
  const adaBerikutnya = semua.length > PER_HALAMAN;
  const branches = (cb ?? []) as Pick<Branch, "id" | "nama">[];

  // Kelompokkan per hari
  const grup: { kunci: string; label: string; rows: Row[] }[] = [];
  for (const m of rows) {
    const kunci = kunciHari(m.created_at);
    const terakhir = grup[grup.length - 1];
    if (terakhir?.kunci === kunci) terakhir.rows.push(m);
    else grup.push({ kunci, label: labelHari(m.created_at), rows: [m] });
  }

  const href = (hal: number) => {
    const sp = new URLSearchParams();
    if (cabang) sp.set("cabang", cabang);
    if (tipe) sp.set("tipe", tipe);
    sp.set("hal", String(hal));
    return `/riwayat?${sp}`;
  };

  return (
    <>
      <PageHeader
        title="Riwayat"
        subtitle="Semua perubahan stok, terbaru di atas"
        action={
          rows.length > 0 ? (
            <FormDialog
              trigger={<><Trash2 size={18} /> Hapus</>}
              triggerClassName="btn-soft shrink-0 whitespace-nowrap !px-4"
              triggerLabel="Hapus riwayat"
              title="Hapus riwayat"
              description="Pilih riwayat mana yang ingin dihapus."
              action={hapusRiwayatBanyak}
              submitLabel="Hapus"
              danger
            >
              <HapusRiwayatFields />
            </FormDialog>
          ) : undefined
        }
      />

      <form className="mb-5 grid grid-cols-2 gap-3">
        <AutoSubmitSelect name="cabang" defaultValue={cabang} aria-label="Filter cabang">
          <option value="">Semua cabang</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}
        </AutoSubmitSelect>
        <AutoSubmitSelect name="tipe" defaultValue={tipe} aria-label="Filter jenis">
          <option value="">Semua jenis</option>
          {Object.entries(TIPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </AutoSubmitSelect>
      </form>

      {rows.length === 0 ? (
        <Empty>Belum ada riwayat stok{cabang || tipe ? " untuk filter ini" : ""}.</Empty>
      ) : (
        grup.map((g) => (
          <section key={g.kunci} className="mb-5">
            <h2 className="mb-1.5 text-sm font-semibold text-muted">{g.label}</h2>
            <ul className="panel divide-y divide-line">
              {g.rows.map((m) => {
                const delta = m.stok_sesudah - m.stok_sebelum;
                // Pembelian yang masih berutang tidak boleh dihapus (lunasi dulu di menu Utang)
                const berutang = m.total_harga != null && (m.dibayar ?? m.total_harga) < m.total_harga;
                return (
                  <RiwayatBaris
                    key={m.id}
                    id={m.id}
                    nama={m.products?.nama ?? ""}
                    ringkas={`${m.products?.nama ?? "Barang"} · ${m.branches?.nama ?? ""} · ${delta > 0 ? "+" : ""}${delta}`}
                    berutang={berutang}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.products?.nama ?? "Barang dihapus"}</p>
                      <p className="truncate text-sm text-muted">{m.branches?.nama} · {jam(m.created_at)} · {TIPE_LABEL[m.tipe]}</p>
                      {m.total_harga != null && m.tipe === "masuk" && (
                        <p className="num mt-0.5 text-sm">Dibeli {rupiah(m.total_harga)} <span className="text-muted">({rupiah(Math.round(m.total_harga / m.jumlah))}/{m.products?.satuan ?? "pcs"})</span>
                          {(m.dibayar ?? m.total_harga) < m.total_harga
                            ? <span className="font-medium text-danger"> · Sisa utang {rupiah(m.total_harga - (m.dibayar ?? 0))}{m.supplier ? ` ke ${m.supplier}` : ""}</span>
                            : <span className="text-muted"> · Lunas</span>}
                        </p>
                      )}
                      {m.catatan && <p className="mt-0.5 text-sm">{m.catatan}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`num text-lg font-bold leading-tight ${delta >= 0 ? "text-ok" : "text-danger"}`}>{delta > 0 ? "+" : ""}{delta}</p>
                      <p className="num text-xs text-muted">{m.stok_sebelum} → {m.stok_sesudah}</p>
                    </div>
                  </RiwayatBaris>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {(halaman > 1 || adaBerikutnya) && (
        <div className="flex items-center justify-between gap-3">
          {halaman > 1 ? <Link href={href(halaman - 1)} className="btn-soft">← Sebelumnya</Link> : <span />}
          <span className="text-sm text-muted">Hal. {halaman}</span>
          {adaBerikutnya ? <Link href={href(halaman + 1)} className="btn-soft">Berikutnya →</Link> : <span />}
        </div>
      )}
    </>
  );
}
