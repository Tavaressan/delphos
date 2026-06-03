FROM rust:1.80-slim as builder
WORKDIR /app
COPY . .
RUN cargo build --release --package embedding-service

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/embedding-service /usr/local/bin/service
EXPOSE 8000
CMD ["service"]
