/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['reactflow', '@protobuf-ts/runtime', '@protobuf-ts/runtime-rpc', '@protobuf-ts/grpcweb-transport'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // reactflowの解決を明示的に設定
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // reactflowをESMとして解決
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.js'],
    };
    
    // @protobuf-tsパッケージを正しく解決
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.js', '.ts', '.tsx', '.mjs'],
    };
    
    return config;
  },
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
