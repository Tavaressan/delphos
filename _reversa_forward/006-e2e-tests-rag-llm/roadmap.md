# Roadmap: Testes End-to-End e Validação de Scripts

> Identificador: `006-e2e-tests-rag-llm`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/006-e2e-tests-rag-llm/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A abordagem técnica consiste em criar uma suíte leve de testes End-to-End (E2E) em JavaScript, executada diretamente sobre o ambiente local (Docker Compose) através do runtime Node.js. Utilizaremos o test runner nativo do Node.js (`node:test`) e o módulo `node:assert`, eliminando dependências pesadas externas e complexidades de configuração.
A suite de testes executará os seguintes passos de forma automatizada:
1. **Validação do Ciclo de Vida do Ambiente:** Executa os scripts de ciclo de vida do repositório (`reset.sh`, `setup.sh`), verificando a criação do arquivo `.env` e checando se todos os serviços descritos no `docker-compose.yml` sobem de forma saudável e respondem em suas respectivas portas.
2. **Ingestão e RAG E2E:** Simula o fluxo completo de RAG:
   - Upload de um documento fictício para o MinIO (ou Mock local se em ambiente restrito).
   - Ingestão assíncrona disparada pelo RabbitMQ, validando as transições de estado do documento no banco PostgreSQL (`UPLOADING` -> `PROCESSING` -> `INDEXED`).
   - Confirmação de que os trechos do documento foram criados na tabela `document_chunks` com embeddings de 1536 dimensões.
   - Envio de pergunta via Chat HTTP API e verificação de que a resposta semântica é coerente e cita o documento indexado.
3. **Limpeza pós-teste:** Exclui todos os dados gerados de teste nas tabelas `document_chunks`, `documents` e `chats` para garantir que o ambiente não fique poluído.
4. **Tratamento Híbrido de LLM:** O teste roda em modo `mock` por padrão no CI, mas permite execução com a Vertex AI real caso chaves válidas sejam fornecidas nas variáveis de ambiente.

## 2. Princípios aplicados

Nenhum princípio global foi localizado no diretório `.reversa/principles.md`. A feature segue os princípios implícitos de design limpo, não poluição de dados em ambientes de testes e velocidade no pipeline de CI/CD.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Node.js com `node:test` nativo | Introduzido estavelmente no Node 20. Permite executar asserções assíncronas nativas sem carregar frameworks externos complexos como Jest ou Mocha no monorepo. | Scripts puros em Bash (difícil manipulação de JSON e queries SQL) ou Jest/Vitest (adicionam excesso de dependências no package.json). | 🟢 CONFIRMADO |
| D-02 | Validação Híbrida de Provedores | Garante builds de CI rápidos, estáveis e gratuitos usando o provedor `mock` local, enquanto mantém a capacidade de validação contra a Vertex AI real de forma agendada ou manual. | Validação 100% Real (CI instável por cotas/rede externa) ou Validação 100% Mock (falha em detectar mudanças de contratos da GCP). | 🟢 CONFIRMADO |
| D-03 | Manipulação direta do DB no teste via driver `pg` | Necessário para consultar a tabela `document_chunks` e as colunas de estado de `documents` de forma assíncrona, além de prover limpeza atômica dos dados de teste no banco PostgreSQL. | Uso de queries por `docker compose exec postgres psql` (complexo de capturar saídas formatadas e manipular concorrência no teste). | 🟢 CONFIRMADO |

## 4. Premissas

Não há premissas de dúvidas pendentes, uma vez que todas as indagações foram elucidadas na fase `/reversa-clarify`.

## 5. Delta arquitetural

Não são alterados componentes pré-existentes na especificação arquitetural, apenas adicionada a suíte de testes de integração como elemento verificador de saúde.

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| E2E Test Runner | n/a (Novo componente de suporte) | componente-novo | Suíte Node.js nativa executada a partir da raiz para verificar saúde dos scripts e do pipeline RAG. |

## 6. Delta no modelo de dados

Não existem alterações de DDL ou DML permanentes sobre o PostgreSQL. Os testes executam manipulação temporária (inserts e deletes de registros de teste) sob tabelas existentes.

- Resumo das mudanças: Nenhuma alteração estrutural no banco de dados.
- Detalhe completo em: `_reversa_forward/006-e2e-tests-rag-llm/data-delta.md`

## 7. Delta de contratos externos

Nenhum contrato externo HTTP, gRPC ou fila é alterado por esta feature. O runner apenas consome os contratos existentes do backend e dos microsserviços.

## 8. Plano de migração

Não se aplica (n/a).

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Lentidão ou falha no boot do Docker Compose | alto | média | O runner de teste utilizará uma lógica de polling ativo com timeout de até 30 segundos verificando endpoints de healthcheck, em vez de sleeps fixos que causam falsos-negativos. |
| Poluição de banco em caso de erro no meio do teste | médio | média | Os scripts de teste usarão blocos `try/finally` para assegurar que os comandos de limpeza (`DELETE`) rodem no banco de dados mesmo se uma asserção falhar durante o fluxo do RAG. |
| Falhas de conexão de rede externa no CI com Vertex AI | alto | baixa | O pipeline de CI padrão rodará com `EMBEDDING_PROVIDER=mock`, contornando riscos de conexão externa. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado sob a feature
- [ ] Scripts `setup.sh` e `reset.sh` validados e rodando sem erros locais
- [ ] Suite de teste E2E executada com sucesso local em modo `mock`
- [ ] Suite de teste E2E executada com sucesso local em modo `real` (com credenciais Vertex AI)

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-05 | Versão inicial gerada por `/reversa-plan` | reversa |
