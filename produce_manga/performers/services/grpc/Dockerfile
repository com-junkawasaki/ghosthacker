# Rust gRPC Service Dockerfile
# Development stage
FROM rust:latest as development

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Install cargo-watch for hot reload
RUN cargo install cargo-watch --version 8.5.2 || cargo install cargo-watch

# Copy Cargo files
COPY Cargo.toml Cargo.lock* ./

# Copy migrations directory
COPY migrations ./migrations

# Copy proto files
COPY proto ./proto

# Copy build.rs
COPY build.rs ./

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
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Copy Cargo files
COPY Cargo.toml Cargo.lock* ./

# Copy migrations directory
COPY migrations ./migrations

# Copy proto files
COPY proto ./proto

# Copy build.rs
COPY build.rs ./

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
COPY --from=builder /app/target/release/manga-editor-grpc /app/manga-editor-grpc

EXPOSE 8080

CMD ["./manga-editor-grpc"]

