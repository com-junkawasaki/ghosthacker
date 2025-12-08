.PHONY: help install dev build test clean docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  make install     - Install dependencies (pnpm + cargo)"
	@echo "  make dev         - Start development servers"
	@echo "  make build       - Build all services"
	@echo "  make test        - Run tests"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make docker-up   - Start services with Docker Compose"
	@echo "  make docker-down - Stop Docker Compose services"

install:
	@echo "Installing frontend dependencies..."
	pnpm install
	@echo "Installing backend dependencies..."
	cd performers/services/grpc && cargo fetch

dev:
	@echo "Starting development servers..."
	docker-compose up

build:
	@echo "Building frontend..."
	pnpm build
	@echo "Building backend..."
	cd performers/services/grpc && cargo build --release

test:
	@echo "Running frontend tests..."
	pnpm test
	@echo "Running backend tests..."
	cd performers/services/grpc && cargo test

clean:
	@echo "Cleaning frontend..."
	rm -rf node_modules .svelte-kit build
	@echo "Cleaning backend..."
	cd performers/services/grpc && cargo clean

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f
