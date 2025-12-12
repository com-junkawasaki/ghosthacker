# Development stage
FROM golang:1.25-alpine AS development

# Install development dependencies
RUN apk add --no-cache git ca-certificates curl

# Install buf CLI
RUN curl -sSL "https://github.com/bufbuild/buf/releases/latest/download/buf-Linux-x86_64" -o "/usr/local/bin/buf" && \
    chmod +x /usr/local/bin/buf

# Install air for hot reload (using v1.61.0 which supports Go 1.24)
RUN go install github.com/air-verse/air@v1.61.0

# Set working directory
WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Generate protobuf code (run from proto directory)
RUN cd proto && buf generate --template ../buf.gen.yaml

# Generate sqlc code
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest && sqlc generate

# Expose port
EXPOSE 8081

# Run with air for hot reload in development
CMD ["air", "-c", ".air.toml"]

# Build stage
FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates curl

# Install buf CLI
RUN curl -sSL "https://github.com/bufbuild/buf/releases/latest/download/buf-Linux-x86_64" -o "/usr/local/bin/buf" && \
    chmod +x /usr/local/bin/buf

# Set working directory
WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Generate protobuf code (run from proto directory)
RUN cd proto && buf generate --template ../buf.gen.yaml

# Generate sqlc code
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest && sqlc generate

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /grpc-server ./cmd/server

# Runtime stage
FROM alpine:3.19 AS production

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata wget

# Create non-root user
RUN adduser -D -g '' appuser

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /grpc-server .

# Copy migrations for runtime execution if needed
COPY --from=builder /app/migrations ./migrations

# Use non-root user
USER appuser

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8081/health || exit 1

# Set environment variables
ENV PORT=8081
ENV HOST=0.0.0.0

# Run the application
CMD ["./grpc-server"]
