import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === "true";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        pageExtensions: ["tsx", "jsx", "js"],
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;


