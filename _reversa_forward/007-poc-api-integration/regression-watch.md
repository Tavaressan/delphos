# Regression Watch: Monitoramento de Regressão Semântica

> Identificador da feature: `007-poc-api-integration`
> Requirements: `_reversa_forward/007-poc-api-integration/requirements.md`

Este documento lista as regras e contratos semânticos críticos estabelecidos por esta feature, que devem ser monitorados nas próximas rodadas de extração reversa para evitar regressões acidentais.

---

## 1. Watch Items Principais

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|------------------------------|---------------------|-------------------|
| W001 | `_reversa_forward/007-poc-api-integration/legacy-impact.md#1` | O arquivo `infrastructure/caddy/Caddyfile` deve conter o bloco `handle /api/* { reverse_proxy core:8080 }` para roteamento de chamadas do backend. | presença | Ausência de bloco handle para `/api/*` ou proxy apontando para porta incorreta. |
| W002 | `_reversa_forward/007-poc-api-integration/legacy-impact.md#1` | O arquivo `infrastructure/caddy/Caddyfile` deve conter o bloco `handle /actuator/* { reverse_proxy core:8080 }` para monitoramento de health check. | presença | Ausência de bloco handle para `/actuator/*`. |
| W003 | `_reversa_forward/007-poc-api-integration/legacy-impact.md#1` | A variável `NEXT_PUBLIC_BACKEND_URL` no arquivo `.env` do monorepo deve apontar para o domínio público HTTPS DuckDNS do projeto. | redação | Valor da variável alterado para `http://localhost:8000` ou outro protocolo sem SSL. |

---

## 2. Histórico de re-extrações

*(Preenchido automaticamente pelas próximas rodadas de re-extração reversa `/reversa`)*

---

## 3. Observações

*(Regras baseadas em premissas ou fontes amareladas/vermelhas sem peso formal de watch principal)*

- A rota `/` (home page) deve carregar com sucesso o `ChatCanvas` utilizando o `apiClient` com o `fetch` nativo para garantir o carregamento do bundle leve do frontend.
- A página de `/catalog` e `/knowledge-base` devem ser acessíveis de forma física no App Router para validar a componentização de rotas.

---

## 4. Arquivadas

*(Itens depreciados ou desativados em evoluções futuras)*
