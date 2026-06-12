# syntax=docker/dockerfile:1
FROM rust:slim-bookworm as builder
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=embedding-service-target,target=/app/target \
    cargo build --release --package embedding-service && \
    cp /app/target/release/embedding-service /usr/local/bin/service

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /usr/local/bin/service /usr/local/bin/service
EXPOSE 8000
CMD ["service"]

