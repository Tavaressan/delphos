# Relatório de Auditoria (Cross-Check): 007-poc-api-integration

> Data: 2026-06-11
> Feature: `007-poc-api-integration`
> Artefatos Analisados:
> - [Requirements](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_forward/007-poc-api-integration/requirements.md)
> - [Roadmap](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_forward/007-poc-api-integration/roadmap.md)
> - [Actions](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_forward/007-poc-api-integration/actions.md)

---

## 1. Resumo da Auditoria

| Severidade | Quantidade |
|------------|------------|
| 🔴 CRITICAL | 1 |
| 🟠 HIGH     | 0 |
| 🟡 MEDIUM   | 0 |
| 🔵 LOW      | 1 |

---

## 2. Tabela de Inconsistências (Findings)

| ID | Severidade | Eixo | Descrição | Onde está |
|----|------------|------|-----------|-----------|
| **A001** | 🔴 CRITICAL | Coerência com Legado / Infraestrutura | O container `crew_worker` no `docker-compose.yml` não possui mapeamento de volume para credenciais do GCP nem variáveis `GOOGLE_APPLICATION_CREDENTIALS` ou `VERTEX_AI_API_KEY` injetadas. Com isso, o runtime do CrewAI falha na autenticação com a Vertex AI real e reverte silenciosamente para o `MockLLM`, impedindo a chamada e o consumo real de tokens da API do Google Gemini. | [docker-compose.yml](file:///Users/vitortavares/Desktop/Alfabra%20Vector/docker-compose.yml#L187-L201) e [crewai_adapter.py](file:///Users/vitortavares/Desktop/Alfabra%20Vector/python-services/crew-worker/src/runtime/crewai_adapter.py#L29-L45) |
| **A002** | 🔵 LOW | Documentação / Sintaxe | O exemplo de payload JSON de resposta de sucesso de `GET /api/executions/{id}` no contrato de API está sem a chave de fechamento `}` no bloco de código markdown. | [api-executions.md](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_forward/007-poc-api-integration/interfaces/api-executions.md#L71-L72) |

---

## 3. Detalhamento de Impacto e Recomendações

### A001: Ausência de Credenciais do GCP no Container `crew-worker`
* **Impacto:** Embora os microsserviços em Rust possuam montagem correta de volumes para autenticação no GCP via `/app/credentials/gcp-key.json`, o serviço do orchestrador em Python (`crew-worker`) não tem acesso ao arquivo físico da conta de serviço. Consequentemente, a classe `CrewAiRuntimeAdapter` no worker Python não consegue instanciar a API real da Google Vertex AI/Gemini, caindo silenciosamente no fallback `MockLLM` e retornando dados estáticos simulados.
* **Sugestão de correção:** Ajustar a definição do serviço `crew-worker` no `docker-compose.yml` para mapear o volume das credenciais e configurar a variável `GOOGLE_APPLICATION_CREDENTIALS` de forma similar à feita no serviço `embedding-service`. A correção deve ser guiada por intervenção manual no docker-compose ou via `/reversa-coding`.

---

## 4. Itens Verificados e Aprovados (Sucessos)

### Cobertura
- [x] **RF-01 (Componentização):** Coberto pelas ações `T010` e `T011`, e pela decisão `D-03` no roadmap.
- [x] **RF-02 (apiClient Fetch):** Coberto pela ação `T006` e decisão `D-01` no roadmap.
- [x] **RF-03 (Polling de Execuções):** Coberto pelas ações `T003`, `T007`, `T009`, `T013` e `T014`, além da decisão `D-02`.
- [x] **RF-04 (Roteamento do Console):** Coberto pela ação `T012` e detalhado na mudança do delta arquitetural.
- [x] **RF-05 (Health Check):** Coberto pela ação `T015` e decisão do indicador do cabeçalho.
- [x] **RF-06 (AuthProvider):** Coberto pela ação `T008` (implementação de mock local).
- [x] **Cenários Gherkin:** Todos os fluxos de sucesso e de perda de conexão com o backend foram cobertos pelas rotas e hooks implementados no frontend.

### Consistência
- [x] **Terminologia:** Os termos relacionados a "executions", "status", "polling" e "timeline" foram mantidos consistentes nos três documentos.
- [x] **Estrutura de Contratos:** Os campos listados nos DTOs do frontend (`GetExecutionResponse`) correspondem exatamente aos payloads JSON documentados nas interfaces e expostos no `ExecutionController` do backend Java.

### Coerência com o Legado
- [x] **Regras de Negócio do Legado:** A tipagem de dados de DTOs e entidades respeita as colunas de banco de dados especificadas no inventário do Spring Boot e nos dados persistidos de `AgentExecution`.
