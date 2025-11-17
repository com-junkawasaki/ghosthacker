.PHONY: build run test clean generate

# Generate GraphQL code
generate:
	go run github.com/99designs/gqlgen generate

# Build the application
build:
	go build -o bin/epub-editor-graphql-go ./cmd/server

# Run the application
run: build
	./bin/epub-editor-graphql-go

# Run tests
test:
	go test ./...

# Clean build artifacts
clean:
	rm -rf bin/ tmp/ graph/generated.go graph/model/models_gen.go

# Install dependencies
deps:
	go mod download
	go mod tidy

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

