# Legacy Impact: Integração de PoC do Frontend com Backend Real

> Identificador da feature: `007-poc-api-integration`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/007-poc-api-integration/requirements.md`

Este documento consolida os impactos técnicos causados nos componentes legados mapeados pela extração reversa em `_reversa_sdd/`.

---

## 1. Tabela de Impactos no Legado

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `frontend/src/app/page.tsx` | `frontend` | `regra-alterada` | `MEDIUM` | Decomposição do monolito de visualização mockado de 1109 linhas em componentes e rotas do App Router. |
| `frontend/src/app/layout.tsx` | `frontend` | `regra-alterada` | `LOW` | Inclusão do `AuthProvider` no layout de nível raiz para controle de contexto reativo de sessão. |
| `.env` | `infrastructure` | `regra-alterada` | `LOW` | Alteração da variável `NEXT_PUBLIC_BACKEND_URL` para apontar para a API corporativa HTTPS. |
| `infrastructure/caddy/Caddyfile` | `infrastructure` | `contrato-alterado` | `MEDIUM` | Inclusão das rotas `/api/*` e `/actuator/*` direcionadas para o backend (`core:8080`) antes de rotear para o frontend. |

---

## 2. Diff Conceitual por Componente

* **Componente `frontend`:**
  O módulo de frontend do Next.js deixou de conter uma interface monolítica puramente lógica baseada em mocks em um único arquivo. A estrutura arquitetural limpa foi populada, separando a lógica de negócio do domínio (entities, use cases, ports) da lógica técnica de rede (apiClient, adapters) e componentes puros de visualização (ui, layout, forms). As interações agora realizam requisições HTTP REST de verdade integradas ao Spring Boot.
* **Componente `infrastructure` (Proxy Reverso Caddy):**
  O Caddy foi estendido para centralizar a segurança e o roteamento das requisições REST da web. Agora, ele atua como proxy reverso não apenas para o Next.js, mas também como gateway unificado sob o mesmo domínio DuckDNS (`https://<seu-subdominio-duckdns>.duckdns.org`), eliminando problemas de CORS adicionais no deploy final.

---

## 3. Regras de Domínio Preservadas

As seguintes regras mapeadas no legado em `_reversa_sdd/domain.md` continuam intactas e respeitadas pela implementação:

* **`[DR01] Hierarquia de Papéis`** (ROLE_ADMIN, ROLE_USER) 🟢: A simulação de login local gera usuários e metadados de sessão em localStorage espelhando os IDs e nomes dos papéis seedados no banco.
* **`[DR03] Dimensionalidade de Vetores`** e **`[DR04] Busca por Similaridade`** 🟢: O prompt é submetido e as mensagens são armazenadas no banco de forma reativa, sem interferir no pipeline do Ingestion Worker.
* **`[DR06] Monitoramento de Microsserviços`** 🟢: O health check consumido pelo cabeçalho no frontend reflete a integridade física do actuator do backend Spring Boot.

---

## 4. Regras de Domínio Modificadas

Nenhuma regra de domínio do legado foi alterada ou infringida por esta feature.
