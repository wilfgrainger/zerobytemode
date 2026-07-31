import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  webpack: (config, { dev }) => {
    // Disable persistent cache in production to avoid RealContentHashPlugin errors.
    if (!dev) {
      config.cache = false;
    }

    // Enable async WASM for @jsquash codec binaries.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // Serve .wasm files as standalone assets fetched by the codec glue code.
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
