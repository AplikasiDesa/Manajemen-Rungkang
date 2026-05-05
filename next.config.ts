import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // trailingSlash sangat penting untuk Firebase Hosting agar rute statis tidak pecah saat refresh/navigasi
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
