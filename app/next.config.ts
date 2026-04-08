import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Webpack instead of Turbopack for Cloudflare Workers compat
  // Turbopack generates individual chunk files that Workers can't resolve
};

export default nextConfig;
