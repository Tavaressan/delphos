# Infraestrutura, Requisitos

## Visão Geral
O módulo de `infraestrutura` gerencia as configurações do host e de rede virtual que garantem o tráfego criptografado TLS (`caddy`), o isolamento de portas internas de banco e backend em containers e a segurança do servidor físico/virtual via whitelist de IPs no firewall (`UFW`).

---

## Responsabilidades
* **Proxy Reverso e Gateway de Entrada:** Caddy gerencia conexões externas seguras TLS usando DNS challenge com DuckDNS.
* **Segurança do Host:** O script de firewall UFW limita o tráfego HTTP/HTTPS e SSH a blocos de IP de intranet corporativa autorizados.
* **Persistência Relacional/Vetorial Mínima:** Carregar as extensões `vector` e `uuid-ossp` na inicialização do Postgres para suportar as migrations subsequentes.

---

## Regras de Negócio
* **[BR01] DNS Challenge DuckDNS:** A validação e renovação de TLS do Caddy exige resolvers DNS externos (`1.1.1.1`), atraso de propagação de 60 segundos e timeout de 5 minutos.
  * *Status:* 🟢 CONFIRMADO (extraído de `infrastructure/caddy/Caddyfile`).
* **[BR02] Whitelist Corporativa UFW:** Somente conexões HTTP/HTTPS provenientes de `CORP_WHITELIST_RANGE` e conexões SSH provenientes de `INFRA_IP_RANGE` são liberadas no firewall do host. Todo o restante tráfego de entrada é bloqueado por padrão (`default deny incoming`).
  * *Status:* 🟢 CONFIRMADO (extraído de `infrastructure/setup_firewall.sh`).
* **[BR03] Isolamento Interno Docker:** Portas críticas de bancos e caches de dados (Postgres e Redis) não devem ser expostas externamente ao host, ficando restritas à rede virtual interna criada pelo Docker Compose.
  * *Status:* 🟢 CONFIRMADO (extraído de `setup_firewall.sh`).

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|------------|-------------------|
| RF-01 | Proxy Reverso com HTTPS | Must | Caddy escuta nas portas 80/443 e redireciona tráfego para a porta 3000 do container Frontend. |
| RF-02 | Geração de Certificados SSL Automatizados | Must | Caddy obtém certificados via Let's Encrypt utilizando token e DNS DuckDNS. |
| RF-03 | Configuração de Regras UFW | Must | Script que limpa regras antigas, declara regras de whitelists para SSH, HTTP, HTTPS e ativa o UFW. |
| RF-04 | Inicialização de Extensões de Banco | Must | Executar script SQL de pré-carga que ativa a extensão vector e uuid-ossp antes de criar tabelas. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | Redirecionamento e segurança SSL automáticos no proxy | `Caddyfile:5-10` | 🟢 |
| Segurança VM | Bloqueio de conexões de entrada não-autorizadas | `setup_firewall.sh:46` | 🟢 |
| Conectividade | Conexões de saída irrestritas do firewall para APIs de IA externas | `setup_firewall.sh:48` | 🟢 |

---

## Critérios de Aceitação

```gherkin
Dado que o script de firewall é executado como root
Quando o processamento termina
Então a saída do comando "ufw status verbose" deve mostrar a porta 22 restrita a INFRA_IP_RANGE e portas 80/443 restritas a CORP_WHITELIST_RANGE

Dado que o container postgres é inicializado pela primeira vez
Quando o init.sql é executado
Então as extensões vector e uuid-ossp devem estar criadas e ativas no banco de dados
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Configuração de TLS/HTTPS automática (Caddy) | Must | Permite comunicações criptografadas e seguras na web |
| Whitelist e regras do UFW | Must | Bloqueia ataques externos diretos na VM de produção |
| Habilitação das extensões SQL do Postgres | Must | Pré-requisito de banco para a vetorização do RAG |

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `infrastructure/caddy/Caddyfile` | Configuração de TLS e reverse proxy | 🟢 |
| `infrastructure/postgres/init.sql` | Extensões de inicialização Postgres | 🟢 |
| `infrastructure/setup_firewall.sh` | Configuração de firewall UFW corporativo | 🟢 |
