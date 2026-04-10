import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: process.env.PROXY_CLIENT_MAX_BODY_SIZE ?? "100mb",
  } as unknown as NextConfig["experimental"],
};

export default nextConfig;
