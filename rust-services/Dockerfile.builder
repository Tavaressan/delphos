# syntax=docker/dockerfile:1

# Imagem base compartilhada pelos 4 serviços Rust: carrega a árvore de
# dependências do workspace já compilada em release.
#
# Motivo de existir: os Dockerfiles dos serviços usavam
# `RUN --mount=type=cache` para preservar /app/target e o registry do cargo,
# mas o BuildKit não preserva cache mounts no cache do GitHub Actions
# (docs.docker.com/build/ci/github-actions/cache). Cada build no CI recompilava
# os 418 crates do lock do zero — quatro vezes por run, uma por serviço.
#
# Publicada como ghcr.io/<repo>/rust-builder:deps-<hash do Cargo.lock>, só é
# reconstruída quando o Cargo.lock muda.

FROM rust:slim-bookworm AS chef
RUN cargo install cargo-chef --locked
WORKDIR /app

# Extrai o "esqueleto" de dependências (Cargo.toml/Cargo.lock de todos os
# membros) sem o código-fonte, para que a compilação abaixo dependa apenas das
# dependências declaradas.
FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
