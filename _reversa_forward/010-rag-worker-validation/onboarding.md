# Onboarding: Validação e Testes E2E do RAG Worker Rust

Instruções para realizar a verificação do RAG worker Rust localmente.

## 1. Pré-requisitos
* Ter o Docker e Docker Compose instalados.
* Credenciais de GCP no host no path correspondente do `.env` ou mapeadas.

## 2. Passos de Execução dos Testes E2E
1. Execute a suite completa:
   ```bash
   npm run test:e2e
   ```
2. Acompanhe os logs dos containers com:
   ```bash
   docker compose logs -f rag-worker core
   ```
3. Verifique se o teste do fluxo de Chat e Ingestão passa com sucesso.
