# syntax=docker/dockerfile:1

# A base já traz as dependências do workspace compiladas em release (ver
# rust-services/Dockerfile.builder). Aqui só o código dos crates do próprio
# workspace é compilado — as 418 dependências externas não são recompiladas.
# A tag é injetada pelo CI a partir do hash do Cargo.lock; o default cobre o
# build local via docker compose.
ARG RUST_BUILDER_IMAGE=ghcr.io/tavaressan/alfabra-vector/rust-builder:latest

FROM ${RUST_BUILDER_IMAGE} AS builder
WORKDIR /app
# O .dockerignore exclui target/, então o diretório compilado que veio na
# imagem base sobrevive a este COPY.
COPY . .
RUN cargo build --release --package rag-worker && \
    cp /app/target/release/rag-worker /usr/local/bin/service

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /usr/local/bin/service /usr/local/bin/service
CMD ["service"]
