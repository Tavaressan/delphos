# Roadmap: Validação e Testes E2E do RAG Worker Rust

> Identificador: `010-rag-worker-validation`
> Data: `2026-06-12`
> Requirements: `_reversa_forward/010-rag-worker-validation/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Nossa abordagem de testes para a validação do pipeline do RAG consistirá em executar a suíte de testes E2E do repositório (`npm run test:e2e`), que gerencia o ciclo de vida do docker compose localmente. Isso nos permitirá verificar:
1. Subida saudável do Rust `rag-worker` e do Spring Boot backend `core`.
2. O fluxo de mensageria assíncrona de chat através do RabbitMQ.
3. A similaridade vetorial cossena contra o PostgreSQL (`pgvector`) na dimensão 768.
4. A integração nativa do Rust com a API do Google Vertex AI (Gemini).

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| I. Estabilidade e Robustez | Executar suíte de testes ponta a ponta garante que regressões não passem despercebidas. | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Remoção de Mock do RAG | Validar o fluxo com Vertex AI e Postgres reais. | Uso do AnythingLLM ou chamadas mockadas locais. | 🟢 |
| D-02 | Validação na Suite E2E | Reutilizar o runner `runner.test.js` para gerenciar o lifecycle docker compose automaticamente. | Execução de testes manuais fora do compose. | 🟢 |

## 4. Premissas

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|----------|----------------------------------|-----------------|
| Credenciais GCS no host estão corretas e válidas | 5. Requisitos Funcionais | Falha nas chamadas ao Vertex AI e ingestão de arquivos. |

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `rag-worker` | `_reversa_sdd/architecture.md` | contrato-alterado | Comunicação direta com pgvector e Vertex AI, eliminando o AnythingLLM. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Nenhuma mudança estrutural no banco de dados além de garantir que a coluna `embedding` do `document_chunks` esteja tipada com dimensão 768.
- Detalhe completo em: `_reversa_forward/010-rag-worker-validation/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| n/a | - | - |

## 8. Plano de migração

n/a

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Lentidão ou falha de timeout nas APIs de IA | alto | médio | Configurar timeouts e tratamentos adequados nos workers de Rust. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado
- [ ] Logs dos serviços em execução sem erros fatais

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-12 | Versão inicial gerada por `/reversa-plan` | reversa |
