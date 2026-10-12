import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sembunyikan ikon "N" mode development yang menutupi tab Beranda di HP
  devIndicators: false,
  // Izinkan membuka server development dari HP di Wi-Fi yang sama (hanya berlaku saat `npm run dev`)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
