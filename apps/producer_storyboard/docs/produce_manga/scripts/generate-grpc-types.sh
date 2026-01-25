#!/bin/bash
# Generate TypeScript types from proto files for gRPC-Web client

set -e

PROTO_DIR="./performers/services/grpc/proto"
OUT_DIR="./src/lib/grpc/generated"

# Create output directory
mkdir -p "$OUT_DIR"

# Check if protoc is installed
if ! command -v protoc &> /dev/null; then
    echo "Error: protoc is not installed. Please install Protocol Buffers compiler."
    echo "On macOS: brew install protobuf"
    echo "On Ubuntu: sudo apt-get install protobuf-compiler"
    exit 1
fi

# Check if protoc-gen-grpc-web is installed
if ! command -v protoc-gen-grpc-web &> /dev/null; then
    echo "Warning: protoc-gen-grpc-web is not installed. Installing via npm..."
    npm install -g protoc-gen-grpc-web
fi

# Generate TypeScript types using protoc with grpc-web plugin
protoc \
    --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
    --plugin=protoc-gen-grpc-web=./node_modules/.bin/protoc-gen-grpc-web \
    --ts_out=import_style=commonjs,binary:"$OUT_DIR" \
    --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$OUT_DIR" \
    --proto_path="$PROTO_DIR" \
    "$PROTO_DIR"/*.proto

echo "Generated TypeScript types in $OUT_DIR"


