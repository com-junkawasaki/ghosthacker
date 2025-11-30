#!/bin/bash

# gRPC TypeScript型定義生成スクリプト

set -e

# ディレクトリ設定
PROTO_DIR="../../services/grpc/proto"
OUT_DIR="src/internal/grpc/generated"

# protocがインストールされているか確認
if ! command -v protoc &> /dev/null; then
    echo "Error: protoc is not installed"
    echo "Install protoc: https://grpc.io/docs/protoc-installation/"
    exit 1
fi

# grpc-webプラグインがインストールされているか確認
if ! command -v protoc-gen-grpc-web &> /dev/null; then
    echo "Warning: protoc-gen-grpc-web is not installed"
    echo "Install grpc-web plugin: npm install -g grpc-web"
fi

# 出力ディレクトリを作成
mkdir -p "$OUT_DIR"

# protoファイルからTypeScript型定義を生成
echo "Generating TypeScript types from proto files..."

# common.proto
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out="$OUT_DIR" \
  --proto_path="$PROTO_DIR" \
  "$PROTO_DIR/common.proto"

# producer.proto
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out="$OUT_DIR" \
  --proto_path="$PROTO_DIR" \
  "$PROTO_DIR/producer.proto"

# graph.proto
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out="$OUT_DIR" \
  --proto_path="$PROTO_DIR" \
  "$PROTO_DIR/graph.proto"

# gRPC-Webクライアントコードを生成（オプション）
if command -v protoc-gen-grpc-web &> /dev/null; then
    echo "Generating gRPC-Web client code..."
    
    protoc \
      --plugin=protoc-gen-grpc-web=./node_modules/.bin/protoc-gen-grpc-web \
      --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$OUT_DIR" \
      --proto_path="$PROTO_DIR" \
      "$PROTO_DIR/producer.proto" \
      "$PROTO_DIR/graph.proto"
fi

echo "TypeScript types generated successfully in $OUT_DIR"

