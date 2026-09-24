import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["framer-motion", "motion-dom"],
  serverExternalPackages: ["better-auth", "@neondatabase/serverless", "ws"],
  experimental: {
    staleTimes: {
      dynamic: 30, // Keep dynamic pages cached in client router memory for 30s for instant back/forth navigation
      static: 180, // 3 minutes for static content
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
