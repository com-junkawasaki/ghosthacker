#!/bin/bash

set -e

echo "🚀 Setting up Sora Storyboard Video Generator..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing..."
    npm install -g pnpm
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo is not installed. Please install Rust: https://rustup.rs/"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker: https://www.docker.com/"
    exit 1
fi

if ! command -v buf &> /dev/null; then
    echo "⚠️  buf CLI is not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install bufbuild/buf/buf
    else
        echo "Please install buf CLI: https://buf.build/docs/installation"
    fi
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
pnpm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd performers/services/grpc
cargo fetch
cd ../../..

# Generate gRPC types (if buf is available)
if command -v buf &> /dev/null; then
    echo "🔧 Generating gRPC types..."
    pnpm grpc:generate || echo "⚠️  gRPC type generation failed. You may need to configure buf."
else
    echo "⚠️  Skipping gRPC type generation (buf not installed)"
fi

# Create .envrc if it doesn't exist
if [ ! -f .envrc ]; then
    echo "📝 Creating .envrc from example..."
    cp .envrc.example .envrc
    echo "⚠️  Please edit .envrc and set your OPENAI_API_KEY"
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .envrc and set your OPENAI_API_KEY"
echo "2. Run 'make docker-up' to start services"
echo "3. Run 'pnpm dev' in another terminal to start frontend"
