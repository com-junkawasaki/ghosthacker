.PHONY: help test test-unit test-integration test-bdd test-coverage docker-up docker-down docker-logs

help:
	@echo "Available commands:"
	@echo "  make test              - Run all TDD tests"
	@echo "  make test-unit         - Run unit tests only"
	@echo "  make test-integration  - Run integration tests only"
	@echo "  make test-bdd          - Run BDD tests (requires GraphQL API)"
	@echo "  make test-coverage     - Generate test coverage report"
	@echo "  make docker-up         - Start all Docker services"
	@echo "  make docker-down       - Stop all Docker services"
	@echo "  make docker-logs       - Show Docker logs"

test:
	pnpm test

test-unit:
	pnpm test -- tests/tdd/unit

test-integration:
	pnpm test:integration

test-bdd:
	pnpm test:bdd

test-coverage:
	pnpm test:coverage

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f
