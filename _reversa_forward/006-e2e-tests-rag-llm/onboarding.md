# Onboarding: Testes End-to-End e Validação de Scripts

> Identificador: `006-e2e-tests-rag-llm`
> Data: `2026-06-05`
> Documento principal: `_reversa_forward/006-e2e-tests-rag-llm/roadmap.md`

Este documento descreve os passos para configurar, executar e depurar a suíte de testes E2E do Alfabra Vector.

## 1. Pré-requisitos locais

Para rodar os testes, a máquina de desenvolvimento ou container CI deve possuir:
- Docker e Docker Compose instalados.
- Node.js (v20 ou superior recomendado para suporte estável ao runner nativo).
- Configuração de portas padrão liberadas: `3000` (frontend), `8080` (java-core), `8000` (rust-services).

## 2. Preparando a Raiz do Monorepo

Antes de iniciar os testes pela primeira vez, instale as dependências mínimas necessárias na raiz do monorepo (neste caso, apenas o driver do PostgreSQL para Node.js):

```bash
# Executar na raiz do monorepo
npm install pg
```

## 3. Estrutura de Execução dos Testes E2E

Para validar a feature, utilize os comandos do runner nativo do Node.js:

### 3.1. Execução Completa (Default - Modo Mock)
Por padrão, o teste subirá o ambiente Docker e executará os testes com o provedor de embeddings em modo de simulação local (offline, sem dependências externas):

```bash
# Executar os testes E2E em modo mockado
npm run test:e2e
```
*(Se o script `test:e2e` não estiver registrado no package.json, execute diretamente com o node)*:
```bash
node --test tests/e2e/runner.test.js
```

### 3.2. Execução com Provedores Reais (Vertex AI)
Para validar a integração real de RAG contra o endpoint da Vertex AI, assegure-se de exportar as chaves no ambiente ou no arquivo `.env` antes da execução:

```bash
# Exemplo de variáveis para Vertex AI real
export EMBEDDING_PROVIDER=real
export VERTEX_AI_PROJECT_ID=alfabra-platform
export VERTEX_AI_REGION=us-central1
export VERTEX_AI_API_KEY=sua_chave_secreta_aqui

# Rodar os testes E2E com Vertex AI ativa
node --test tests/e2e/runner.test.js
```

## 4. Passos Manuais de Verificação e Logs

Se um teste falhar, você pode verificar o estado do ecossistema local rodando os comandos abaixo:

```bash
# 1. Inspecionar se todos os containers estão saudáveis
docker compose ps

# 2. Monitorar os logs do Ingestion Worker (Rust) para rastrear o processamento do RAG
docker compose logs -f ingestion-worker

# 3. Executar consultas manuais no PostgreSQL para validar se os chunks foram apagados do banco
docker compose exec postgres psql -U postgres -d rag_db -c "SELECT count(*) FROM document_chunks;"
```
