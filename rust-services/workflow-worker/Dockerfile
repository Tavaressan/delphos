FROM rust:slim as builder
WORKDIR /app
COPY . .
RUN cargo build --release --package workflow-worker

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/workflow-worker /usr/local/bin/service
CMD ["service"]
