import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/payments", destination: "/", permanent: true },
      { source: "/payments/:path*", destination: "/", permanent: true },
      { source: "/films", destination: "/", permanent: true },
      { source: "/films/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
