"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

// Tahan lama (±0,5 detik) pada sebuah baris. Batal bila jari bergeser (menggulir) atau dilepas lebih awal.
// Klik yang menyusul setelah tahan lama diabaikan, supaya baris yang bisa diklik tidak ikut terbuka.
export function useTahan(onTahan: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const awal = useRef({ x: 0, y: 0 });
  const terpicu = useRef(false);
  const batal = () => clearTimeout(timer.current);

  return {
    onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      terpicu.current = false;
      awal.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        terpicu.current = true;
        navigator.vibrate?.(15);
        onTahan();
      }, ms);
    },
    onPointerMove(e: PointerEvent) {
      if (Math.hypot(e.clientX - awal.current.x, e.clientY - awal.current.y) > 10) batal();
    },
    onPointerUp: batal,
    onPointerCancel: batal,
    onPointerLeave: batal,
    onContextMenu(e: MouseEvent) { e.preventDefault(); }, // cegah menu salin/bagikan bawaan HP saat ditahan
    onClickCapture(e: MouseEvent) {
      if (!terpicu.current) return;
      terpicu.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}
