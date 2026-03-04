import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  webpack: (config, { dev }) => {
    // Disable persistent cache in production to avoid RealContentHashPlugin errors
    if (!dev) {
      config.cache = false;
    }

    // Enable async WASM for @jsquash codec binaries
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // Serve .wasm files as standalone assets (fetched by WASM glue code at runtime)
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
