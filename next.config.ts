import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* standard App Router config */
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
