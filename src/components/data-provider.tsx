"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ShellData } from "@/lib/types";

const Ctx = createContext<ShellData | null>(null);

export function useShell(): ShellData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShell harus dipakai di dalam DataProvider");
  return v;
}

/** Daftar cabang {id, nama} yang stabil antar render */
export function useBranchOptions() {
  const { branches } = useShell();
  return useMemo(() => branches.map((b) => ({ id: b.id, nama: b.nama })), [branches]);
}

export function useSumberList() {
  const { products } = useShell();
  return useMemo(() => [...new Set(products.map((p) => p.sumber).filter((s): s is string => !!s))].sort(), [products]);
}

const MAKS_DIAM_MS = 30_000;

/**
 * Menyediakan data ke semua halaman. Data disegarkan dari server saat aplikasi dibuka kembali
 * setelah lebih dari 30 detik di latar belakang, supaya perubahan dari perangkat lain ikut terlihat.
 */
export function DataProvider({ data, children }: { data: ShellData; children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    let tersembunyiSejak = 0;
    const saatBerubah = () => {
      if (document.visibilityState === "hidden") tersembunyiSejak = Date.now();
      else if (tersembunyiSejak && Date.now() - tersembunyiSejak > MAKS_DIAM_MS) {
        tersembunyiSejak = 0;
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", saatBerubah);
    return () => document.removeEventListener("visibilitychange", saatBerubah);
  }, [router]);

  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}
