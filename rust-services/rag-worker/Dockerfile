FROM rust:slim-bookworm as builder
WORKDIR /app
COPY . .
RUN cargo build --release --package rag-worker

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/rag-worker /usr/local/bin/service
CMD ["service"]
