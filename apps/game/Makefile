.PHONY: build run test clean docker-up docker-down

# Build all crates
build:
	cargo build

# Run GraphQL service
run:
	cd game-graphql && cargo run

# Run tests
test:
	cargo test

# Clean build artifacts
clean:
	cargo clean

# Start Docker services
docker-up:
	docker-compose up -d

# Stop Docker services
docker-down:
	docker-compose down

# Build GraphQL Docker image
docker-build:
	docker-compose build graphql

# Run GraphQL service in Docker
docker-run: docker-build docker-up
	@echo "GraphQL service running at http://localhost:8080/graphql"

# iOS build (requires Xcode)
ios-build:
	cd game-ios && cargo build --target aarch64-apple-ios

# Android build (requires Android NDK)
android-build:
	cd game-android && cargo build --target aarch64-linux-android

# WASM build
wasm-build:
	cd game-wasm && wasm-pack build --target web

