# Legacy Impact: Testes End-to-End e Validação de Scripts

> Identificador: `006-e2e-tests-rag-llm`
> Data: `2026-06-05`
> Documento principal: `_reversa_forward/006-e2e-tests-rag-llm/roadmap.md`

Este documento apresenta a análise de impactos conceituais e estruturais causados pela implantação da suíte de testes E2E e validação de scripts.

## 1. Tabela de Impacto

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `package.json` | `Raiz do Monorepo` | regra-nova | LOW | Adição da dependência do driver `pg` e do script `test:e2e` para execução dos testes integrados. |
| `docker-compose.yml` | `Infraestrutura (DevOps)` | componente-novo | LOW | Registro formal do container `embedding-service` que estava ausente na orquestração Docker Compose padrão, e estabelecimento de dependência direta no `ingestion-worker`. |
| `docker-compose.override.yml` | `Infraestrutura (DevOps)` | regra-nova | LOW | Mapeamento da porta pública `8000:8000` para o `embedding-service` em ambiente de desenvolvimento local. |
| `tests/e2e/config.js` | `Test Runner (Novo)` | componente-novo | LOW | Criação do arquivo de suporte para carga e higienização das variáveis de ambiente. |
| `tests/e2e/runner.test.js` | `Test Runner (Novo)` | componente-novo | LOW | Implementação de testes automatizados E2E cobrindo ciclo de vida de scripts, upload de PDF, fila de ingestão RabbitMQ, persistência vetorial pgvector e resposta chat/RAG. |

## 2. Diff Conceitual por Componente

### DevOps e Orquestração Local
O arquivo `docker-compose.yml` foi corrigido para conter a definição do contêiner `embedding-service` (Rust), que existia fisicamente no repositório mas estava fora do fluxo de inicialização automática. O `ingestion-worker` agora depende diretamente da saúde do `embedding-service` (`condition: service_healthy`) antes de iniciar, garantindo a consistência das conexões de rede interna do Docker.

### Suíte de Testes (Novo Componente)
Foi criada a pasta `tests/e2e` contendo o runner de testes nativos de integração. Este componente simula os comportamentos do usuário final e DevOps, exercitando de forma integrada os limites entre bancos, mensagerias, microsserviços Rust, backend Spring Boot e scripts shell.

## 3. Preservadas

As seguintes regras de domínio confirmadas em `_reversa_sdd/domain.md` permanecem inalteradas e válidas no ecossistema:

*   **`[DR05] Heartbeat de Ingestão`**: O loop assíncrono de 60 segundos do `ingestion-worker` continua ativo e emitindo logs de batimento cardíaco.
*   **`[DR06] Monitoramento de Microsserviços`**: O endpoint `/healthz` na porta `8000` continua respondendo com "OK" em ambos os microsserviços e é formalmente validado na suíte de testes.
*   **`[DR03] Dimensionalidade Parametrizável de Vetores`**: O banco e o `embedding-service` continuam gerando vetores em 1536 dimensões, validados atômica e programaticamente pelo runner de teste.

## 4. Modificadas

Nenhuma regra de negócio preexistente no legado foi alterada ou removida por esta feature. O runner atua apenas de forma externa como validador de sanidade, sem alterar comportamentos de lógica de negócio do Spring Boot ou dos microsserviços Rust.
