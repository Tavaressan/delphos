# Infraestrutura, Tarefas de Implementação

## Pré-requisitos
- [ ] VM baseada em Linux Ubuntu Server com docker-compose instalado.
- [ ] Token ativo no DuckDNS e um domínio associado (ex: `exemplo.duckdns.org`).

---

## Tarefas

- [ ] **T-01: Configuração do Caddyfile**
  - Origem no legado: `infrastructure/caddy/Caddyfile`
  - Critério de pronto: Configurar regras de proxy reverso vinculando o domínio `${DOMAIN_NAME}` ao container `frontend:3000` com suporte ao DNS challenge com DuckDNS token.
  - Confiança: 🟢 CONFIRMADO
  
- [ ] **T-02: Setup do script de Firewall**
  - Origem no legado: `infrastructure/setup_firewall.sh`
  - Critério de pronto: Configurar script executável que defina as regras UFW, permitindo SSH apenas para infraestrutura e portas 80/443 apenas para rede corporativa.
  - Confiança: 🟢 CONFIRMADO

- [ ] **T-03: Script de inicialização do Postgres (init.sql)**
  - Origem no legado: `infrastructure/postgres/init.sql`
  - Critério de pronto: Configurar script SQL que inicializa as extensões `vector` e `uuid-ossp` na primeira execução do container PostgreSQL.
  - Confiança: 🟢 CONFIRMADO

---

## Tarefas de Teste

- [ ] **TT-01: Teste de conexões de entrada do Host**
  - Tentar conectar via SSH e HTTP a partir de IPs fora das faixas whitelists configuradas e certificar-se de que são bloqueados.
- [ ] **TT-02: Teste de geração e expiração de certificado TLS**
  - Iniciar o Caddy e validar nos logs se o desafio DNS-01 é concluído com sucesso e se o arquivo de certificado Let's Encrypt é gravado no diretório `/data`.
- [ ] **TT-03: Teste de inicialização de banco**
  - Validar se ao subir o docker-compose, o postgres_init executa o script SQL com sucesso e inicializa as extensões sem quebras.
