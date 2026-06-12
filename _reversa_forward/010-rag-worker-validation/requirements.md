# Requirements: Validação e Testes E2E do RAG Worker Rust

> Identificador: `010-rag-worker-validation`
> Data: `2026-06-12`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta feature tem por objetivo validar de ponta a ponta o pipeline cognitivo e de RAG executado de forma assíncrona pelo `rag-worker` em Rust. O worker consome mensagens do RabbitMQ, realiza buscas de similaridade cossena utilizando a extensão `pgvector` do PostgreSQL e gera respostas finais através de chamadas de API nativas para o Google Vertex AI (Gemini), reportando o status da execução até a conclusão.

## 2. Contexto a partir do legado

A especificação está ancorada nos seguintes artefatos de engenharia reversa do sistema legado:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md` | Divisão entre o backend Java Core, o barramento RabbitMQ e os workers em Rust/Python. | 🟢 |
| `_reversa_sdd/domain.md` | Regras de busca semântica em pgvector e persistência na tabela `document_chunks`. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| **Administrador (Admin)** | Validar a estabilidade do fluxo cognitivo de RAG antes da entrada em produção. | O administrador executa os testes automatizados E2E que simulam a ingestão de PDFs, geração de chunks vetoriais e consultas ao chat RAG. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Descomissionamento de AnythingLLM):** O fluxo de orquestração RAG e busca vetorial não deve passar pelo AnythingLLM. Deve utilizar diretamente o `rag-worker` integrado a Postgres e Vertex AI. 🟢
2. **RN-02 (Dimensionalidade de Vetores):** A dimensionalidade configurada para o modelo do Vertex AI (`text-embedding-004`) deve ser de 768 elementos no banco. 🟢

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | **Healthcheck de Serviços:** Validar que os containers (Java, Rust workers, Python worker, Redis, Postgres e RabbitMQ) subam e respondam saudável nos healthchecks. | Must | Retorno 200 HTTP nas portas designadas. | 🟢 |
| RF-02 | **Ingestão e Vetorização:** Validar que documentos carregados sejam indexados e que chunks com dimensões corretas (768) sejam criados na tabela `document_chunks`. | Must | A busca no banco retorna chunks com vetor de 768 posições para o documento inserido. | 🟢 |
| RF-03 | **Resposta RAG Ponta a Ponta:** Enviar uma chamada de chat no `/api/executions` e verificar a resposta completa do Gemini após a similaridade vetorial. | Must | Transição do status da execução de chat para `COMPLETED` com payload de saída preenchido. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | Tempo de resposta do RAG completo (Similaridade + LLM) deve ser menor que 10s no ambiente local. | UX fluida de resposta no chat. | 🟡 |
| Resiliência | Tolerar indisponibilidade temporária do RabbitMQ, reconectando-se automaticamente. | Garantir estabilidade da orquestração assíncrona. | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Inicialização e Verificação de Healthcheck de Serviços
  Dado que o ambiente Docker do Alfabra Vector está configurado
  Quando os serviços são iniciados
  Então o backend em 8080/actuator/health e o Rust worker em 8000/healthz devem retornar HTTP 200

Cenário: Fluxo Completo de Chat RAG
  Dado que um documento de teste foi ingerido e indexado como INDEXED
  Quando uma requisição de chat é feita no endpoint /api/executions com a pergunta "periodicidade de manutenção"
  Então o backend deve publicar o evento no RabbitMQ
  E o rag-worker deve processar, realizar a busca no Postgres, consultar o Vertex AI
  E a execução do chat deve transicionar para status COMPLETED retornando a resposta em menos de 10 segundos
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 (Healthchecks) | Must | Pré-requisito para execução do sistema. |
| RF-02 (Ingestão/pgvector) | Must | Core do armazenamento de contexto do RAG. |
| RF-03 (Resposta RAG) | Must | Core de resposta contextualizada da plataforma. |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda. Rode `/reversa-clarify` quando houver `[DÚVIDA]` pendente.

## 10. Lacunas

- Nenhum ponto duvidoso pendente de homologação técnica.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-12 | Versão inicial gerada por `/reversa-requirements` | reversa |
