"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useShell } from "@/components/data-provider";
import { Empty, PageHeader, Section } from "@/components/page-header";
import { angka, jam, labelHari, rupiah } from "@/lib/format";
import { kelompokkanUtang, totalUtang } from "@/lib/utang";

type Menipis = { produk: string; satuan: string; cabang: string; cabangId: string; stok: number; min: number };

export function BerandaView() {
  const { branches, products, stok, terbaru, utang } = useShell();
  const jmlSupplier = kelompokkanUtang(utang, []).length;

  // Satu putaran untuk semua angka ringkasan
  const { nilai, totalUnit, perCabang, menipis } = useMemo(() => {
    let nilai = 0;
    let totalUnit = 0;
    const perCabang = branches.map(() => ({ unit: 0, nilai: 0 }));
    const menipis: Menipis[] = [];
    for (const p of products) {
      const baris = stok[p.id] ?? [];
      branches.forEach((b, i) => {
        const n = baris[i] ?? 0;
        const harga = n * (p.harga_beli ?? 0);
        nilai += harga;
        totalUnit += n;
        perCabang[i].unit += n;
        perCabang[i].nilai += harga;
        if (p.stok_minimum > 0 && n <= p.stok_minimum) {
          menipis.push({ produk: p.nama, satuan: p.satuan, cabang: b.nama, cabangId: b.id, stok: n, min: p.stok_minimum });
        }
      });
    }
    menipis.sort((a, b) => a.stok - b.stok);
    return { nilai, totalUnit, perCabang, menipis };
  }, [branches, products, stok]);

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
          ].map(([label, jumlah]) => (
            <div key={label} className="px-2 py-3">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="num text-xl font-semibold">{angka(jumlah as number)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {utang.length > 0 && (
        <Link href="/utang" className="panel mb-8 flex items-center justify-between gap-3 px-4 py-3.5 active:bg-line/40">
          <span>
            <span className="block text-sm font-medium text-danger">Utang ke supplier</span>
            <span className="num block text-xl font-bold text-danger">{rupiah(totalUtang(utang))}</span>
            <span className="block text-sm text-muted">{jmlSupplier} supplier · {utang.length} pembelian</span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-muted" />
        </Link>
      )}

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
        {branches.length === 0 ? (
          <Empty>Belum ada cabang.</Empty>
        ) : (
          <ul className="panel divide-y divide-line">
            {branches.map((b, i) => (
              <li key={b.id}>
                <Link href={`/stok?cabang=${b.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 active:bg-line/40">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.nama}</p>
                    <p className="num text-sm text-muted">{angka(perCabang[i].unit)} unit · {rupiah(perCabang[i].nilai)}</p>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Terakhir dicatat" aside={<Link href="/riwayat" className="text-sm font-medium text-accent">Lihat semua</Link>}>
        {terbaru.length === 0 ? (
          <Empty>Belum ada aktivitas. Tambah barang di menu Stok, lalu catat stoknya.</Empty>
        ) : (
          <ul className="panel divide-y divide-line">
            {terbaru.map((m) => {
              const delta = m.stok_sesudah - m.stok_sebelum;
              return (
                <li key={m.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.products?.nama}</p>
                    <p className="truncate text-sm text-muted" suppressHydrationWarning>{m.branches?.nama} · {labelHari(m.created_at)}, {jam(m.created_at)}</p>
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
