import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // 强制忽略类型检查报错
    ignoreBuildErrors: true,
  },
  eslint: {
    // 强制忽略 ESLint 格式报错
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;