.PHONY: help dev build up down logs clean neo4j-init

help:
	@echo "EPUB Editor Tool - Docker Commands"
	@echo ""
	@echo "  make dev          - Start development environment"
	@echo "  make build        - Build all Docker images"
	@echo "  make up           - Start services"
	@echo "  make down         - Stop services"
	@echo "  make logs         - Show logs from all services"
	@echo "  make clean        - Remove containers, volumes, and images"
	@echo "  make neo4j-init   - Initialize Neo4j schema"
	@echo "  make frontend     - Start only frontend service"
	@echo "  make graphql      - Start only GraphQL service"
	@echo "  make neo4j        - Start only Neo4j service"

dev: build up
	@echo "Development environment started!"
	@echo "Frontend: http://localhost:25320"
	@echo "GraphQL: http://localhost:25325/graphql"
	@echo "Neo4j Browser: http://localhost:7474"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	docker-compose down -v --rmi all
	docker volume prune -f

neo4j-init:
	@echo "Initializing Neo4j schema..."
	@if ! docker ps | grep -q epub-editor-neo4j; then \
		echo "Error: Neo4j container is not running. Please start it first with 'make up' or 'make neo4j'"; \
		exit 1; \
	fi
	@echo "Waiting for Neo4j to be ready..."
	@timeout=30; \
	while [ $$timeout -gt 0 ]; do \
		if docker exec epub-editor-neo4j cypher-shell -u neo4j -p password "RETURN 1" > /dev/null 2>&1; then \
			break; \
		fi; \
		echo "Waiting for Neo4j... ($$timeout seconds remaining)"; \
		sleep 1; \
		timeout=$$((timeout - 1)); \
	done; \
	if [ $$timeout -eq 0 ]; then \
		echo "Error: Neo4j is not responding. Please check the container logs."; \
		exit 1; \
	fi
	@docker exec -i epub-editor-neo4j cypher-shell -u neo4j -p password < performers/services/graphql/neo4j-schema-init.cypher || \
		(echo "Error: Failed to initialize Neo4j schema. Make sure Neo4j is ready." && exit 1)
	@echo "Neo4j schema initialized successfully!"

frontend:
	docker-compose up -d frontend

graphql:
	docker-compose up -d graphql

neo4j:
	docker-compose up -d neo4j

# Test commands
test: test-rust test-ts

test-rust:
	cd performers/services/graphql && cargo test -- --test-threads=1

test-ts:
	pnpm test

test-coverage: test-rust-coverage test-ts-coverage

test-rust-coverage:
	cd performers/services/graphql && cargo test -- --test-threads=1

test-ts-coverage:
	pnpm test:coverage

test-watch:
	pnpm test:watch

# Production commands
prod-build:
	docker-compose -f docker-compose.prod.yaml build

prod-up:
	docker-compose -f docker-compose.prod.yaml up -d

prod-down:
	docker-compose -f docker-compose.prod.yaml down

