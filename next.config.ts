import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.mrdn.gg",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "staging-cdn.mrdn.gg",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dock-cdn.mrdn.online",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/premium",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
