/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@terminusdb/terminusdb-documents-ui'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  distDir: path.resolve(__dirname, '../../.next'),
};

module.exports = nextConfig;
