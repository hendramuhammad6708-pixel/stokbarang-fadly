import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Font dimuat dari server sendiri saat build (tanpa permintaan ke Google), jadi cepat dan tidak berkedip
const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Stok Toko",
  description: "Pencatatan stok barang multi-cabang",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={plex.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
