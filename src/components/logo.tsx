// Logo yang sama dengan ikon aplikasi (src/app/icon.svg), dipakai sebagai SVG inline agar tanpa permintaan tambahan
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} role="img" aria-label="Stok Toko">
      <rect width="512" height="512" rx="112" fill="var(--accent)" />
      <rect x="160" y="140" width="192" height="72" rx="20" fill="var(--on-accent)" />
      <rect x="128" y="220" width="256" height="72" rx="20" fill="var(--on-accent)" fillOpacity="0.78" />
      <rect x="96" y="300" width="320" height="72" rx="20" fill="var(--on-accent)" fillOpacity="0.56" />
    </svg>
  );
}
