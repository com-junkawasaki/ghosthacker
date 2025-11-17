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
	@echo "Frontend: http://localhost:3000"
	@echo "GraphQL: http://localhost:8080/graphql"
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
	docker exec -i epub-editor-neo4j cypher-shell -u neo4j -p password < performers/services/graphql/neo4j-schema.cypher

frontend:
	docker-compose up -d frontend

graphql:
	docker-compose up -d graphql

neo4j:
	docker-compose up -d neo4j

# Production commands
prod-build:
	docker-compose -f docker-compose.prod.yaml build

prod-up:
	docker-compose -f docker-compose.prod.yaml up -d

prod-down:
	docker-compose -f docker-compose.prod.yaml down

