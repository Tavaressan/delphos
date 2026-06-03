FROM rust:1.80-slim as builder
WORKDIR /app
COPY . .
RUN cargo build --release --package document-processing

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/document-processing /usr/local/bin/service
EXPOSE 8000
CMD ["service"]
