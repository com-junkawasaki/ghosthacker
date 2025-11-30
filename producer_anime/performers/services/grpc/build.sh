#!/bin/bash

# gRPCビルドスクリプト
# protoファイルからRustコードを生成し、サービスをビルド

set -e

echo "Building gRPC service..."

# protoファイルのパス
PROTO_DIR="proto"
OUT_DIR="src/generated"

# 出力ディレクトリを作成
mkdir -p "$OUT_DIR"

# Rustコードはbuild.rsで自動生成されるため、ここではビルドのみ実行
echo "Building Rust gRPC service..."
cargo build --release

echo "gRPC service build completed successfully"

