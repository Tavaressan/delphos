# syntax=docker/dockerfile:1
FROM rust:slim-bookworm as builder
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,id=workflow-worker-target,target=/app/target \
    cargo build --release --package workflow-worker && \
    cp /app/target/release/workflow-worker /usr/local/bin/service

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /usr/local/bin/service /usr/local/bin/service
CMD ["service"]

