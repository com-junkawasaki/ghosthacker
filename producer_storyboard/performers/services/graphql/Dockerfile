# GraphQL API Service Dockerfile
# Development stage
FROM rust:latest as development

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install cargo-watch for hot reload
RUN cargo install cargo-watch --version 8.5.2 || cargo install cargo-watch

# Copy Cargo files
COPY Cargo.toml Cargo.lock* ./

# Copy source code
COPY . .

# Development command (with hot reload)
CMD ["cargo", "watch", "-x", "run --bin storyboard-editor-graphql", "--ignore", "target/**", "--delay", "0.5", "--clear", "--watch-when-idle"]

# Production builder stage
FROM rust:latest as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Cargo files
COPY Cargo.toml Cargo.lock* ./

# Build dependencies first (for better caching)
RUN mkdir src && echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy source code
COPY . .

# Build the application
RUN cargo build --release

# Production runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/storyboard-editor-graphql /app/storyboard-editor-graphql

# Copy migrations
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

CMD ["./storyboard-editor-graphql"]
