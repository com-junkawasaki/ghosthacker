#!/bin/bash
set -e

# Install buf if not present
if ! command -v buf &> /dev/null; then
    ARCH=$(uname -m)
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; elif [ "$ARCH" != "x86_64" ]; then ARCH="x86_64"; fi
    curl -sSL "https://github.com/bufbuild/buf/releases/latest/download/buf-Linux-${ARCH}" -o "/tmp/buf"
    chmod +x /tmp/buf
    export PATH="/tmp:$PATH"
fi

# Generate proto files
cd proto && buf generate && cd ..

# Build both binaries
go build -o server ./cmd/server
go build -o worker ./cmd/worker
