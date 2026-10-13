import type { MetadataRoute } from "next";

// Agar aplikasi bisa dipasang ke layar utama HP dan terbuka layar penuh seperti aplikasi biasa
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stok Toko",
    short_name: "Stok Toko",
    description: "Pencatatan stok barang multi-cabang",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
