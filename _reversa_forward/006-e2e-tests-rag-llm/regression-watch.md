# Regression Watch: Testes End-to-End e Validação de Scripts

> Identificador: `006-e2e-tests-rag-llm`

Este arquivo define itens de monitoramento obrigatórios para impedir regressões nas próximas extrações do sistema.

## 1. Tabela de Regression Watch

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|--------------------------|-----------------------------|---------------------|-------------------|
| W001 | `docker-compose.yml` | O contêiner do `embedding-service` deve permanecer declarado na orquestração Docker local, assegurando que o `ingestion-worker` consiga localizá-lo por nome na rede interna. | presença | O serviço `embedding-service` é removido de `docker-compose.yml` ou a dependência dele é apagada em `ingestion-worker`. |
| W002 | `package.json` | O atalho `test:e2e` deve permanecer registrado nos scripts do repositório apontando para `node --test tests/e2e/runner.test.js`. | presença | O script de execução `test:e2e` é removido ou renomeado na raiz do projeto. |

## 2. Histórico de re-extrações

*Nenhuma re-extração efetuada nesta sessão.*

## 3. Arquivadas

*Nenhuma regra arquivada.*

## 4. Observações

*Nenhuma observação de baixa confidência registrada.*

### Re-extração 2026-07-15 11:00

| ID | Veredito | Observação |
|----|----------|------------|
|  W001  | 🟢 verde | preservado |
|  W002  | 🟢 verde | preservado |
