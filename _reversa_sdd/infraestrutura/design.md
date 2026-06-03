# Infraestrutura, Design Técnico

## Interface

### Variáveis de Ambiente Necessárias (Configuration)

| Variável | Descrição | Onde é Usada | Exemplo de Valor |
|---|---|---|---|
| `DOMAIN_NAME` | Domínio DNS da plataforma | `Caddyfile` | `empresa-rag.duckdns.org` |
| `DUCKDNS_TOKEN` | Token secreto do DuckDNS | `Caddyfile` | `a1b2c3d4-e5f6-...` |
| `INFRA_IP_RANGE` | Bloco CIDR dos IPs de Infraestrutura | `setup_firewall.sh` | `10.10.10.0/24` |
| `CORP_WHITELIST_RANGE` | Bloco CIDR dos IPs Corporativos autorizados | `setup_firewall.sh` | `192.168.100.0/24` |

---

## Fluxo Principal

### 1. Inicialização do Caddy e TLS
1. O Caddy inicia e lê a variável `${DOMAIN_NAME}` e `${DUCKDNS_TOKEN}`.
2. Contata a autoridade de certificação (Let's Encrypt / ZeroSSL) e utiliza o módulo DuckDNS para criar um registro TXT temporário comprovando propriedade via DNS-01 challenge.
3. Define resolvers primários como `1.1.1.1` com delay de propagação de 60s.
4. Concluído o desafio, o Caddy serve o tráfego HTTP na porta 80 e HTTPS na 443, direcionando todo o tráfego de entrada para o container `frontend:3000`.

### 2. Configuração do Firewall Host (UFW)
1. O administrador executa o script `./setup_firewall.sh` como root.
2. O script instala o UFW via apt-get se não estiver presente.
3. Executa um reset completo das regras atuais (`ufw --force reset`).
4. Aplica políticas padrão: nega entrada (`deny incoming`), libera saída (`allow outgoing`).
5. Cria regras de entrada específicas:
   - Libera SSH (porta 22) apenas para requisições vindas do CIDR de `$INFRA_IP_RANGE`.
   - Libera HTTP e HTTPS (portas 80 e 443) apenas para requisições vindas do CIDR de `$CORP_WHITELIST_RANGE`.
6. Ativa o firewall (`ufw --force enable`).

---

## Dependências
* **Caddy Server:** Módulo compilado com suporte a duckdns plugin.
* **UFW tool:** Utilitário Ubuntu para gerenciamento simples de regras iptables.
* **PostgreSql database:** Configuração para montagem de volumes persistentes.

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| DNS-01 TLS Challenge | `infrastructure/caddy/Caddyfile:5-10` | 🟢 CONFIRMADO |
| Regras UFW Restritivas | `infrastructure/setup_firewall.sh:56-61` | 🟢 CONFIRMADO |
| Carga inicial de Extensões | `infrastructure/postgres/init.sql:4-5` | 🟢 CONFIRMADO |
| Escopo do Structurizr | Restrito a desenvolvimento local e documentação | 🟢 CONFIRMADO (Confirmado pelo usuário) |
| Imagem Docker Caddy Customizada | `infrastructure/caddy/Dockerfile` definindo build com plugin DuckDNS | 🟢 CONFIRMADO |

---

## Detalhamento Técnico dos Componentes de Infraestrutura

### Structurizr (Ferramenta de Design C4)
* **Escopo:** Exclusivamente local para desenvolvimento, visualização dos diagramas C4 e apoio à engenharia reversa/evolução do sistema.
* **Configuração de Execução:**
  * Declarado sob o perfil `dev` no Docker Compose.
  * Porta exposta localmente: `8081:8080` (recomenda-se binding exclusivo a localhost: `127.0.0.1:8081:8080`).
  * Não participa da pipeline produtivo e não deve ser implantado no ambiente produtivo corporativo.
  * Isento de regras adicionais de UFW, certificados TLS ou autenticação externa.

---

## Riscos e Lacunas
*(Nenhuma lacuna crítica pendente neste módulo)*
