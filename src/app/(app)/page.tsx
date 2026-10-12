import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Empty, PageHeader, Section } from "@/components/page-header";
import { getBase } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { angka, jam, labelHari, rupiah } from "@/lib/format";
import type { Movement } from "@/lib/types";

type Row = Movement & { products: { nama: string } | null; branches: { nama: string } | null };

export default async function Beranda() {
  const supabase = await createClient();
  const [{ branches, products, getStok }, { data }] = await Promise.all([
    getBase(),
    supabase.from("stock_movements").select("*, products(nama), branches(nama)").order("created_at", { ascending: false }).limit(8),
  ]);
  const terbaru = (data ?? []) as unknown as Row[];

  // Satu putaran untuk semua angka ringkasan
  let nilai = 0;
  let totalUnit = 0;
  const perCabang = new Map(branches.map((b) => [b.id, { nama: b.nama, unit: 0, nilai: 0 }]));
  const menipis: { produk: string; satuan: string; cabang: string; cabangId: string; stok: number; min: number }[] = [];
  for (const p of products) {
    for (const b of branches) {
      const stok = getStok(p.id, b.id);
      const harga = stok * (p.harga_beli ?? 0);
      nilai += harga;
      totalUnit += stok;
      const c = perCabang.get(b.id)!;
      c.unit += stok;
      c.nilai += harga;
      if (p.stok_minimum > 0 && stok <= p.stok_minimum) {
        menipis.push({ produk: p.nama, satuan: p.satuan, cabang: b.nama, cabangId: b.id, stok, min: p.stok_minimum });
      }
    }
  }
  menipis.sort((a, b) => a.stok - b.stok);

  return (
    <>
      <PageHeader title="Beranda" subtitle="Ringkasan stok semua cabang" />

      {products.length === 0 && (
        <Section title="Mulai di sini">
          <ol className="panel divide-y divide-line">
            {[
              ["Tambah barang pertama", "Buka Stok, tekan “Barang baru”. Stok awal tiap cabang bisa langsung diisi di form yang sama.", "/stok"],
              ["Catat penjualan", "Di halaman Stok, tekan tombol − setiap ada barang terjual, atau + saat barang masuk.", "/stok"],
              ["Cek stok yang menipis", "Isi stok minimum di setiap barang. Yang hampir habis muncul di Beranda.", "/kelola"],
            ].map(([judul, isi, href], i) => (
              <li key={judul}>
                <Link href={href} className="flex gap-3 px-4 py-3.5 active:bg-line/40">
                  <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent">{i + 1}</span>
                  <span>
                    <span className="block font-medium">{judul}</span>
                    <span className="block text-sm text-muted">{isi}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <div className="panel mb-8 divide-y divide-line">
        <div className="p-4">
          <p className="text-sm text-muted">Nilai stok (harga beli)</p>
          <p className="num text-3xl font-bold">{rupiah(nilai)}</p>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-line text-center">
          {[
            ["Cabang", branches.length],
            ["Jenis barang", products.length],
            ["Total unit", totalUnit],
          ].map(([label, nilai]) => (
            <div key={label} className="px-2 py-3">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="num text-xl font-semibold">{angka(nilai as number)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Section title={`Perlu restock${menipis.length ? ` · ${menipis.length}` : ""}`}>
        {menipis.length === 0 ? (
          <Empty>Semua stok masih di atas batas minimum.</Empty>
        ) : (
          <ul className="panel divide-y divide-line">
            {menipis.slice(0, 8).map((m, i) => (
              <li key={i}>
                <Link href={`/stok?cabang=${m.cabangId}&hanya=menipis`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 active:bg-line/40">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.produk}</p>
                    <p className="truncate text-sm text-muted">{m.cabang} · minimum {m.min}</p>
                  </div>
                  <p className={`num shrink-0 text-lg font-bold ${m.stok === 0 ? "text-danger" : "text-warn"}`}>
                    {m.stok === 0 ? "Habis" : <>{m.stok} <span className="text-sm font-normal text-muted">{m.satuan}</span></>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {menipis.length > 8 && <p className="mt-2 text-sm text-muted">+{menipis.length - 8} lainnya, lihat di halaman Stok tiap cabang.</p>}
      </Section>

      <Section title="Per cabang">
        {perCabang.size === 0 ? (
          <Empty>Belum ada cabang.</Empty>
        ) : (
          <ul className="panel divide-y divide-line">
            {branches.map((b) => {
              const c = perCabang.get(b.id)!;
              return (
                <li key={b.id}>
                  <Link href={`/stok?cabang=${b.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 active:bg-line/40">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.nama}</p>
                      <p className="num text-sm text-muted">{angka(c.unit)} unit · {rupiah(c.nilai)}</p>
                    </div>
                    <ChevronRight size={20} className="shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Terakhir dicatat" aside={<Link href="/riwayat" className="text-sm font-medium text-accent">Lihat semua</Link>}>
        {terbaru.length === 0 ? (
          <Empty>Belum ada aktivitas. Tambah barang di menu Barang, lalu catat stoknya di menu Stok.</Empty>
        ) : (
          <ul className="panel divide-y divide-line">
            {terbaru.map((m) => {
              const delta = m.stok_sesudah - m.stok_sebelum;
              return (
                <li key={m.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.products?.nama}</p>
                    <p className="truncate text-sm text-muted">{m.branches?.nama} · {labelHari(m.created_at)}, {jam(m.created_at)}</p>
                  </div>
                  <p className={`num shrink-0 text-lg font-bold ${delta >= 0 ? "text-ok" : "text-danger"}`}>{delta > 0 ? "+" : ""}{delta}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
