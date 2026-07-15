# Infrastructure, Design Técnico

> Template do arquivo `design.md`. Foca no COMO a unit é construída, com base no código legado lido.

## Fluxo Principal
1. Caddy recebe HTTPS.
2. Faz match por prefixo de path (`/api/*`). Redireciona via proxy reverso ao Spring Boot container.
3. Se não match, redireciona ao Frontend container.
4. Redes de Docker segregadas isolam o banco e broker do Caddy, acessíveis apenas pelos Workers e Backend.

## Decisões de Design Identificadas
| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Caddy em vez de Nginx | Pasta `caddy/` predominante (substituiu nginx) | 🟢 |
| PG Vector custom init | `postgres/` init scripts para habilitar extension | 🟢 |
