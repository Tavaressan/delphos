# Requirements: Compartimentação e Integração do RAG Worker com AnythingLLM

> Identificador: `003-rag-worker-rust`
> Data: `2026-06-03`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta feature estabelece os requisitos para o desenvolvimento do `rag-worker` em Rust. O `rag-worker` atuará como um worker assíncrono consumindo tarefas de busca semântica e recuperação contextualizada (RAG). Em vez de executar buscas locais diretamente via queries de banco ou chamadas ad-hoc a LLMs externas, o worker delegará a orquestração cognitiva e a busca vetorial ao **AnythingLLM** por meio de sua API REST. Isso resolve a ausência de um processamento estruturado de RAG no monorepo Rust e desacopla a orquestração do LLM para um motor especializado.

## 2. Contexto a partir do legado

A especificação está ancorada nos seguintes artefatos de engenharia reversa do sistema legado:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#1.-Visao-Geral-do-Sistema` | Apresenta a divisão entre orquestrador em Java e o pipeline vetorial em Rust (`rust-services`). | 🟢 |
| `_reversa_sdd/domain.md#2.2.-Pipeline-RAG-e-Processamento` | Regras sobre a busca por similaridade HNSW ([DR04]) e a exigência de monitoramento `/healthz` na porta 8000 ([DR06]). | 🟢 |
| `_reversa_sdd/migration/target_architecture.md#2.3` | Define o papel dos workers de dados (`ingestion-worker` e `rag-worker`) como processadores de consultas de similaridade. | 🟢 |
| `_reversa_sdd/migration/execution_lifecycle.md#3` | Mapeia os eventos obrigatórios do ciclo de vida, incluindo `RetrievalStarted` e `RetrievalCompleted` publicados pelo `rag-worker`. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| **Colaborador (User)** | Obter respostas precisas com base em documentos internos. | O colaborador envia uma pergunta no chat, o `java-core` enfileira a requisição de RAG no RabbitMQ, o `rag-worker` consome a tarefa, consulta o AnythingLLM e devolve a resposta contextualizada com os chunks originais. |
| **Administrador (Admin)** | Garantir auditoria e segregação das consultas. | O administrador visualiza os logs de auditoria contendo as transições de estado do RAG registradas durante o processamento do job. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Orquestração de RAG Delegada):** O `rag-worker` não deve conter lógica própria de busca vetorial em pgvector ou chamadas diretas a LLMs de conversação (como Vertex AI ou OpenAI). Todo o processamento cognitivo deve ser delegado à API de chat do AnythingLLM.
   - Origem no legado: `_reversa_sdd/migration/target_architecture.md#2.3`
   - Tipo: alterada 🟡
2. **RN-02 (Isolamento por Workspace no AnythingLLM):** Para suportar múltiplos inquilinos (multi-tenancy) de maneira segura, haverá um workspace no AnythingLLM para cada Tenant do usuário, e o worker deve realizar as requisições de RAG direcionando-as ao workspace correspondente. 🟢
   - Origem no esclarecimento: Sessão 2026-06-03
   - Tipo: nova 🟢
3. **RN-03 (Transição de Estados de Execução):** O `rag-worker` deve notificar o barramento RabbitMQ ao iniciar a consulta (`RetrievalStarted`) e ao finalizar (`RetrievalCompleted`), garantindo conformidade com a máquina de estados global da plataforma.
   - Origem no legado: `_reversa_sdd/migration/execution_lifecycle.md#3`
   - Tipo: nova 🟢
4. **RN-04 (Padronização da Porta do AnythingLLM):** A porta interna e externa de escuta e acesso do AnythingLLM deve ser padronizada em `3001` (mapeamento "3001:3001" no Docker Compose), alinhando o tráfego interno dos microsserviços com as configurações de healthcheck da infraestrutura. 🟢
   - Origem no esclarecimento: Sessão 2026-06-03
   - Tipo: nova 🟢

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | **Consumo de Mensagens do RabbitMQ:** Conectar-se ao broker do RabbitMQ e consumir mensagens da fila `agent.retrieval.queue` (exchange `agent.execution.exchange`, routing key `agent.retrieval.requested`). | Must | O worker consome mensagens com sucesso, extraindo payloads JSON contendo `query`, `workspace_slug` (ou `tenant_id`) e `execution_id`. | 🟢 |
| RF-02 | **Integração REST com AnythingLLM:** Efetuar chamadas POST para o endpoint `/api/v1/workspace/{slug}/chat` do AnythingLLM contendo a pergunta do usuário. | Must | O payload HTTP enviado deve conter o token Bearer de autorização e receber um JSON estruturado contendo a resposta e as fontes (chunks) utilizadas. | 🟢 |
| RF-03 | **Publicação de Eventos de Ciclo de Vida:** Publicar mensagens na exchange do RabbitMQ com os eventos `RetrievalStarted` (no início) e `RetrievalCompleted` ou `AgentExecutionFinished` (no fim). | Must | Os eventos são gravados na exchange com o `correlation_id` correto e consumidos pela camada `java-core`. | 🟢 |
| RF-04 | **Autenticação via Variáveis de Ambiente:** Carregar a API Key e a URL base do AnythingLLM das variáveis ambientais do container. | Must | Se as variáveis `ANYTHINGLLM_API_KEY` ou `ANYTHINGLLM_API_URL` estiverem ausentes, o worker deve falhar na inicialização com log descritivo. | 🟢 |
| RF-05 | **Porta e Endpoint de Healthcheck:** Expor um servidor HTTP Axum na porta 8000 com a rota GET `/healthz` retornando "OK". | Must | O container passa pelo healthcheck do Docker Compose ao responder com status 200 HTTP. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | O overhead de processamento interno do Rust worker (descarte de rede de e para o AnythingLLM) deve ser menor que 50ms por job. | Minimizar latência de ponta a ponta na resposta do chat. | 🟡 |
| Segurança | O Bearer Token do AnythingLLM e dados confidenciais de credenciais devem ser omitidos de qualquer saída de logs do worker. | Prevenir vazamento de chaves de API em sistemas de logs centralizados. | 🟢 |
| Observabilidade | Emissão de logs estruturados a nível de `INFO` para início/fim de processamento de tarefas, e `ERROR` com stack traces para falhas de rede. | Permitir depuração rápida em produção. | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Execução de RAG com sucesso pelo Worker
  Dado que o RabbitMQ e o AnythingLLM estão ativos e saudáveis
  E a variável de ambiente ANYTHINGLLM_API_KEY está configurada
  Quando uma mensagem de Job de RAG é publicada com a query "Controles de segurança da Alfabra" no workspace "default"
  Então o rag-worker deve consumir o job do RabbitMQ
  E deve publicar o evento "RetrievalStarted"
  E deve enviar uma chamada HTTP POST para o AnythingLLM em http://anythingllm:3001/api/v1/workspace/default/chat
  E ao receber a resposta com sucesso, deve publicar o evento "RetrievalCompleted" com o texto da resposta e os chunks mapeados
  E deve enviar o ACK da mensagem original para o RabbitMQ

Cenário: Falha de conexão ou timeout na API do AnythingLLM
  Dado que o AnythingLLM está temporariamente indisponível ou fora do ar
  Quando uma mensagem de Job de RAG é processada pelo rag-worker
  Então o rag-worker deve realizar até 3 retentativas automáticas de chamada à API
  E se a falha persistir, deve publicar o evento "AgentExecutionFailed" no RabbitMQ
  E deve enviar um NACK sem reenfileiramento para a fila para evitar loops infinitos
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 (Consumo do RabbitMQ) | Must | Funcionalidade básica de ativação assíncrona orientada a eventos. |
| RF-02 (Integração AnythingLLM) | Must | Core da feature de RAG delegada solicitada pelo usuário. |
| RF-04 (Credenciais no Env) | Must | Configuração básica de segurança do microsserviço. |
| RF-05 (Healthcheck `/healthz`) | Must | Requisito do compose e monitoramento do host legado ([DR06]). |
| RF-03 (Eventos de Ciclo de Vida) | Should | Necessário para alimentar a máquina de estados global do `java-core`. |
| RNF de Segurança (Omissão de Token) | Should | Prática recomendada para conformidade de auditoria. |

## 9. Esclarecimentos

### Sessão 2026-06-03

- **Q:** Como o isolamento de dados por Tenant será gerenciado no AnythingLLM? Usaremos um Workspace do AnythingLLM para cada Tenant ID (ex: slug dinâmico criado sob demanda) ou a API Key utilizada terá acesso a múltiplos workspaces e o slug será enviado explicitamente no payload da mensagem do RabbitMQ?
- **R:** Um workspace do AnythingLLM por tenant.
- **R:** Exchange: `agent.execution.exchange`, Fila: `agent.retrieval.queue`, Routing Key: `agent.retrieval.requested`.
- **Q:** No docker-compose, a porta configurada para o AnythingLLM é 3000, mas o healthcheck pinga na porta 3001. Qual é a porta interna real de escuta da API que o worker Rust deve atingir dentro do container Docker?
- **R:** Padronizar a porta do AnythingLLM em 3001, usando mapeamento "3001:3001" no Docker Compose.

## 10. Lacunas

- Nenhuma lacuna de conhecimento pendente nesta feature.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-03 | Versão inicial gerada por `/reversa-requirements` | Reversa |
