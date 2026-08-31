import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "12mb",
  },
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;
