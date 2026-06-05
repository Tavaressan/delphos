FROM rust:slim as builder
WORKDIR /app
COPY . .
RUN cargo build --release --package embedding-service

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/embedding-service /usr/local/bin/service
EXPOSE 8000
CMD ["service"]
