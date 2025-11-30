#!/usr/bin/env node

/**
 * Generate TypeScript client code from .proto files using protobuf-ts
 * protobuf-tsプラグインを使用して.protoファイルからTypeScriptクライアントコードを生成
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// __dirnameはscriptsディレクトリなので、../../でcontent-creatorの親ディレクトリに移動
// そこから services/grpc/proto にアクセス
const PROTO_DIR = path.join(__dirname, '../../../services/grpc/proto');
const OUT_DIR = path.join(__dirname, '../src/internal/grpc/generated');

// 出力ディレクトリを作成
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// protocがインストールされているか確認
try {
  execSync('protoc --version', { stdio: 'ignore' });
} catch (error) {
  console.error('Error: protoc is not installed');
  console.error('Install protoc: https://grpc.io/docs/protoc-installation/');
  process.exit(1);
}

// @protobuf-ts/pluginがインストールされているか確認
// pnpmの場合は、.pnpmディレクトリ内のパスを使用
let pluginPath = path.join(__dirname, '../node_modules/.pnpm/@protobuf-ts+plugin@2.11.1/node_modules/@protobuf-ts/plugin/bin/protoc-gen-ts');
if (!fs.existsSync(pluginPath)) {
  // フォールバック: node_modules/.binを使用
  pluginPath = path.join(__dirname, '../node_modules/.bin/protoc-gen-ts');
  if (!fs.existsSync(pluginPath)) {
    console.error('Error: @protobuf-ts/plugin is not installed');
    console.error('Run: pnpm install');
    process.exit(1);
  }
}

console.log('Generating TypeScript types from proto files using protobuf-ts...');

const protoFiles = [
  'common.proto',
  'producer.proto',
  'graph.proto',
];

try {
  // protobuf-tsプラグインを使用してTypeScriptコードを生成
  // 各protoファイルを個別に処理
  protoFiles.forEach((protoFile) => {
    const protoPath = path.join(PROTO_DIR, protoFile);
    
    // protobuf-tsプラグインのオプション:
    // - generate_dependencies: 依存関係も生成
    // - client_grpc1: gRPC-Webクライアントを生成（gRPC-Web用）
    const command = [
      'protoc',
      `--plugin=protoc-gen-ts=${pluginPath}`,
      `--ts_out=${OUT_DIR}`,
      `--ts_opt=generate_dependencies,client_grpc1`,
      `--proto_path=${PROTO_DIR}`,
      protoPath,
    ].join(' ');

    console.log(`\nGenerating from ${protoFile}...`);
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: __dirname });
  });
  
  console.log(`\nTypeScript types generated successfully in ${OUT_DIR}`);
  console.log('\nGenerated files:');
  
  // 生成されたファイルをリスト表示
  const files = fs.readdirSync(OUT_DIR, { recursive: true });
  files.forEach(file => {
    if (typeof file === 'string' && file.endsWith('.ts')) {
      console.log(`  - ${file}`);
    }
  });
  
} catch (error) {
  console.error('Error generating TypeScript types:', error.message);
  process.exit(1);
}

