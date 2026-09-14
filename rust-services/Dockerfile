# Dockerfile for Rust Services (generic placeholder)

# Use the official Rust image for building
FROM rust:1.98 as builder
WORKDIR /app
# Copy Cargo files (assuming a workspace will be added later)
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() { println!(\"Rust service placeholder\"); }" > src/main.rs
RUN cargo build --release

# Runtime image (slim)
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/* /usr/local/bin/
EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/rust-service-placeholder"]
