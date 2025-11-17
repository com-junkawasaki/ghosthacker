# Go GraphQL Service Dockerfile
# Development stage
FROM golang:1.22-alpine as development

WORKDIR /app

# Install air for hot reload (use compatible version for Go 1.22)
RUN go install github.com/cosmtrek/air@v1.49.0

# Copy go mod files first for better layer caching
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code (only necessary files, .dockerignore handles exclusions)
COPY . .

EXPOSE 8080

# Development command with hot reload
CMD ["air", "-c", ".air.toml"]

# Production builder stage
FROM golang:1.22-alpine as builder

WORKDIR /app

# Copy go mod files first for better layer caching
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code (only necessary files, .dockerignore handles exclusions)
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o epub-editor-graphql-go ./cmd/server

# Production runtime stage
FROM alpine:latest as production

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy binary from builder
COPY --from=builder /app/epub-editor-graphql-go /app/epub-editor-graphql-go

EXPOSE 8080

CMD ["./epub-editor-graphql-go"]

