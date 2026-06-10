FROM rust:slim-bookworm as builder
WORKDIR /app
COPY . .
RUN cargo build --release --package ingestion-worker

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/ingestion-worker /usr/local/bin/service
CMD ["service"]
