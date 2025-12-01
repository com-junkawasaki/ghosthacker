/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['reactflow', '@protobuf-ts/runtime', '@protobuf-ts/runtime-rpc', '@protobuf-ts/grpcweb-transport'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // pnpmのシンボリックリンクを正しく解決
    config.resolve.symlinks = true;
    
    // @protobuf-tsパッケージを明示的にエイリアス設定
    config.resolve.alias = {
      ...config.resolve.alias,
      '@protobuf-ts/runtime': path.resolve(__dirname, 'node_modules/@protobuf-ts/runtime'),
      '@protobuf-ts/runtime-rpc': path.resolve(__dirname, 'node_modules/@protobuf-ts/runtime-rpc'),
      '@protobuf-ts/grpcweb-transport': path.resolve(__dirname, 'node_modules/@protobuf-ts/grpcweb-transport'),
    };
    
    // reactflowをESMとして解決
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx', '.mjs'],
      '.mjs': ['.mjs', '.js'],
    };
    
    // node_modulesの解決パスを明示的に設定（pnpmの.pnpmディレクトリも含める）
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      ...(config.resolve.modules || []),
    ];
    
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
