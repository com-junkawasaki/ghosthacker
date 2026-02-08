# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git curl

# Install buf CLI
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; elif [ "$ARCH" != "x86_64" ]; then ARCH="x86_64"; fi && \
    curl -sSL "https://github.com/bufbuild/buf/releases/latest/download/buf-Linux-${ARCH}" -o "/usr/local/bin/buf" && \
    chmod +x /usr/local/bin/buf

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy proto files and buf config
COPY proto/ ./proto/
COPY buf.yaml buf.gen.yaml ./

# Generate proto files using buf (run from proto directory)
RUN cd proto && buf generate

# Copy source code
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/worker ./cmd/worker/main.go

# Development stage
FROM golang:1.23-alpine AS development

WORKDIR /app

RUN apk add --no-cache git ca-certificates curl

# Install buf CLI
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; elif [ "$ARCH" != "x86_64" ]; then ARCH="x86_64"; fi && \
    curl -sSL "https://github.com/bufbuild/buf/releases/latest/download/buf-Linux-${ARCH}" -o "/usr/local/bin/buf" && \
    chmod +x /usr/local/bin/buf

# Install air for hot reload (use compatible version)
RUN go install github.com/cosmtrek/air@v1.51.0

COPY go.mod go.sum ./
RUN go mod download

# Copy proto files and buf config
COPY proto/ ./proto/
COPY buf.yaml buf.gen.yaml ./

# Generate proto files (run from proto directory)
RUN cd proto && buf generate

# Copy source for hot reload
COPY . .

EXPOSE 8081

CMD ["air", "-c", ".air.toml"]

# Production stage
FROM alpine:latest AS production

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/server /app/server
COPY --from=builder /app/worker /app/worker

EXPOSE 8081

CMD ["/app/server"]
