"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-10 max-w-sm text-center">
      <h1 className="text-xl font-semibold">Data gagal dimuat</h1>
      <p className="mb-5 mt-1 text-muted">Periksa koneksi internet Anda, lalu coba lagi.</p>
      <button onClick={reset} className="btn-primary w-full">Coba lagi</button>
    </div>
  );
}
