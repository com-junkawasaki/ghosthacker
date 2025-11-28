import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Components で外部パッケージとして扱う（Next.js 15）
  serverExternalPackages: ['fs', 'path'],
};

export default nextConfig;
