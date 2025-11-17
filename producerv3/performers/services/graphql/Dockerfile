# Rust GraphQL Service Dockerfile
# Development stage
FROM rust:latest as development

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install cargo-watch for hot reload
# Use specific version that works with current Rust version
RUN cargo install cargo-watch --version 8.5.2 || cargo install cargo-watch

# Copy Cargo files
COPY Cargo.toml Cargo.lock* ./

# Copy source code
COPY src ./src

EXPOSE 8080

# Development command with hot reload
CMD ["cargo", "watch", "-x", "run"]

# Production builder stage
FROM rust:latest as builder

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Cargo files
COPY Cargo.toml Cargo.lock* ./

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

# Production runtime stage
FROM debian:bookworm-slim as production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/epub-editor-graphql /app/epub-editor-graphql

EXPOSE 8080

CMD ["./epub-editor-graphql"]

