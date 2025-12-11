import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "ddragon.leagueoflegends.com" }],
  },
};

export default nextConfig;
