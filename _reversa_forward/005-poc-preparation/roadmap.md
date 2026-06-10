# Roadmap: Validação e Preparação para Apresentação do POC

> Identificador: `005-poc-preparation`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/005-poc-preparation/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Para viabilizar a apresentação do POC hoje, implementamos a integração técnica real com as APIs da Vertex AI para processamento cognitivo e RAG. O microsserviço `embedding-service` (Rust) foi desenvolvido para expor o endpoint REST `/embeddings`, que repassa os textos para vetorização real no modelo `text-embedding-004` da Vertex AI usando a chamada `:predict` com a chave `VERTEX_AI_API_KEY`. O `ingestion-worker` (Rust) agora delega a vetorização de chunks de documentos para esse serviço via HTTP, indexando os embeddings finais de 768 dimensões diretamente na extensão `pgvector` do PostgreSQL.

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Desacoplamento de Provedores | O pipeline central não conhece o provedor de embeddings; a trait no `embedding-service` encapsula a chamada ao Vertex AI. | respeita |
| Modularidade de IA | O `ingestion-worker` delega a chamada de IA para um microsserviço focado em embeddings, mantendo responsabilidades separadas. | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Uso de REST HTTP entre workers e embedding-service | Mantém o ecossistema modular e fácil de testar via curl. | Chamada SQL direta ao banco, gRPC (desnecessário para o escopo). | 🟢 |
| D-02 | Autenticação dupla com Bearer e x-goog-api-key | Garante compatibilidade robusta com diferentes versões do gateway de APIs do Google. | Apenas um tipo de cabeçalho (risco de 401). | 🟢 |

## 4. Premissas

Todas as dúvidas foram esclarecidas pelo usuário na etapa anterior. Nenhuma premissa sob dúvida não resolvida foi adotada para este planejamento.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `embedding-service` | `_reversa_sdd/architecture.md#2` | contrato-novo | Criada a rota `POST /embeddings` para vetorização real via Vertex AI. |
| `ingestion-worker` | `_reversa_sdd/architecture.md#3` | regra-alterada | Geração de embeddings agora é delegada via REST HTTP ao `embedding-service`. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Nenhuma modificação de esquema de banco de dados é necessária, pois a coluna `embedding` do tipo `vector(768)` já está criada em `document_chunks`.
- Detalhe completo em: `_reversa_forward/005-poc-preparation/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| `embeddings` | HTTP | `_reversa_forward/005-poc-preparation/interfaces/embeddings.md` |

## 8. Plano de migração

Nenhuma migração de dados é necessária para o funcionamento desta feature no POC (n/a).

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Latência da API do Vertex AI | médio | médio | Configuração de timeout de 25 segundos no client HTTP `reqwest`. |
| Credenciais inválidas na env | alto | baixo | Logs informativos detalhados em caso de status 401/403 retornado pela Vertex AI. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado e validado
- [ ] Testes end-to-end validados com sucesso no container `core`

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-05 | Versão inicial gerada por `/reversa-plan` | reversa |
