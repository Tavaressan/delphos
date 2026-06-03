# Stage 1: Build Caddy with the DuckDNS plugin
FROM caddy:builder AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/duckdns

# Stage 2: Create the final image
FROM caddy:alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
