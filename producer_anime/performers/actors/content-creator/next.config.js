/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // distDirはデフォルトの.nextを使用（content-creatorディレクトリ内）
  // distDir: path.resolve(__dirname, '../../.next'),
  // src/appディレクトリを明示的に指定
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
};

module.exports = nextConfig;
