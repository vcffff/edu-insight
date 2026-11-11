import type { NextConfig } from "next";
const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
  async rewrites() {
    const backend = process.env.BACKEND_API_URL?.trim().replace(/\/+$/, "").replace(/\/api$/, "");
    return backend ? [{ source: "/api/:path*", destination: `${backend}/api/:path*` }] : [];
  },
};
export default config;
