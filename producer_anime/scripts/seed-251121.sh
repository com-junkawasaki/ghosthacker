#!/bin/bash
# Seed Data Import Script for 251121
# 251121フォルダ内のJSON-LDファイルをシードデータとしてインポート

set -e

echo "🌱 Starting seed data import from 251121..."

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# GraphQLサービスディレクトリに移動
cd producer_anime/performers/services/graphql

# シードデータインポートスクリプトを実行
cargo run --bin seed_251121

echo "✅ Seed data import completed!"

