import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fpt-esporthub/shared"],
  // Keep the dev badge off the sidebar collapse button (bottom-left).
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
