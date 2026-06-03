# ADR 0003 - Arquitetura de Rede Híbrida e Segurança Host-Container (UFW + Caddy)

## Status
🟢 CONFIRMADO (Extraído das regras em `setup_firewall.sh`, `Caddyfile` e `docker-compose.yml`)

## Contexto
Por processar informações corporativas proprietárias através do sistema RAG, a infraestrutura deve ser protegida contra acessos externos maliciosos nas portas internas (como as portas do banco de dados PostgreSQL e cache Redis) e conexões não criptografadas em produção. Ao mesmo tempo, o sistema precisa se conectar a APIs de IA externas para a geração de embeddings e finalização de consultas.

## Decisão
Implementar um modelo de rede híbrido composto por:
1. Um firewall de host UFW (Ubuntu Server) com uma política rígida de entrada baseada em whitelist de IPs corporativos para administração (SSH porta 22) e interface web (HTTP 80 e HTTPS 443).
2. Uso do proxy reverso **Caddy** como único ponto de entrada para o Next.js, configurado com certificados SSL automáticos via DuckDNS TLS Challenge.
3. Isolamento completo de containers de apoio (Postgres, Redis, Java Core e Rust Services) na rede interna do Docker, sem mapear ou expor portas físicas ao host externo.

## Justificativa
1. **Redução da Superfície de Ataque:** Ao não expor as portas padrão do Postgres (5432) e do Redis (6379) no host, elimina-se o risco de ataques de força bruta de credenciais e exploração direta de vulnerabilidades no banco.
2. **Segurança Corporativa Whitelist:** Garante que apenas IPs legítimos da intranet corporativa acessem a plataforma web, e apenas IPs de administração acessem a porta SSH do host.
3. **Facilidade de TLS Challenge com DuckDNS:** O Caddy automatiza a renovação de certificados SSL sem expor endpoints de ACME públicos à internet, permitindo HTTPS interno seguro usando DNS-01 Challenge com o DuckDNS.
4. **Liberdade de Conexão de Saída:** O firewall permite conexões de saída padrão (`ufw default allow outgoing`), necessárias para que o gateway e os microsserviços enviem requisições para provedores externos de modelos de linguagem (LLM).
