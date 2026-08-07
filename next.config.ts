import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "cyberadspace.com" }],
        destination: "https://foundingtimes.com/",
        permanent: false,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.cyberadspace.com" }],
        destination: "https://foundingtimes.com/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
