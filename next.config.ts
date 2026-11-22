import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Enlaces viejos: /cris y /melck eran editables; ahora la portada es pública y se edita en /editar/*.
  async redirects() {
    return [
      { source: "/cris", destination: "/ver/cris", permanent: false },
      { source: "/melck", destination: "/ver/melck", permanent: false },
    ];
  },
  partialPrefetching: true,
  // Las fotos (JPEG ≤ 900 px) viajan a las server actions como FormData; el límite por defecto es 1 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
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
