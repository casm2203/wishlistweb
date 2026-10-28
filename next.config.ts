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
