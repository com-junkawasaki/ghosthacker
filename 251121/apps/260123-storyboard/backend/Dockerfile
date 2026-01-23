# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Generate proto files (if needed)
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/worker ./cmd/worker/main.go

# Development stage
FROM golang:1.24-alpine AS development

WORKDIR /app

RUN apk add --no-cache git ca-certificates

# Install air for hot reload
RUN go install github.com/cosmtrek/air@latest

COPY --from=builder /app/server /app/server
COPY --from=builder /app/worker /app/worker
COPY go.mod go.sum ./
RUN go mod download

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
