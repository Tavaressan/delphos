# Núcleo Java

## Visão Geral
Serviço Spring Boot que atua como API Gateway, gerenciador de estado central (banco de dados PostgreSQL), e orquestrador via RabbitMQ. É o guardião do multitenancy e garantidor das regras de segurança de acesso.

## Responsabilidades
- Expor APIs REST (Upload de agentes, base de conhecimento, execuções de chat).
- Validar as regras de pacote ZIP (estrutura, magic bytes, limits de segurança).
- Salvar estados de `Agent`, `Document` e `AgentExecution` no PostgreSQL (JPA).
- Enfileirar Jobs para Ingestão e RAG via RabbitMQ.
- Ouvir eventos do RabbitMQ (ex. `AgentExecutionStarted`, `ToolCallStarted`) e traduzi-los para persistência de estado e streaming SSE para o frontend.

## Regras de Negócio
- Não permite salvar eventos na base se a entidade pai não pertencer ao mesmo Tenant. 🟢
- O envio de mensagens ao RabbitMQ só deve ocorrer caso o commit da persistência no banco de dados tenha sucesso (Transacional). 🟢
- Processos em falha (Exception do RabbitMQ) devem usar transação em Nova Sessão (`REQUIRES_NEW`) para conseguir salvar o status `FAILED` antes de rejeitar a mensagem para a DLQ. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Validador de Agentes | Must | Rejeitar arquivos não-ZIP ou ZIP sem `.md` na raiz com HTTP 415. |
| RF-02 | Segurança de Upload Docs | Must | Omitir payloads com mime-type forjado ou PDF com tags de execução de JS. |
| RF-03 | Gerenciamento de Execuções | Must | Salvar RAG chunks (`RetrievalEvent`) atrelados a execução do chat. |
| RF-04 | Isolamento Tenant | Must | Falhar operações de CRUD se o tenant da URL diferir do token de autenticação. |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Assincronismo | Uso extensivo do RabbitMQ para tarefas IO-bound. | 🟢 |
| Segurança | Controle de Acesso (RBAC) | Enum `ROLE_ADMIN` e `ROLE_USER`. | 🟢 |
| Segurança | Validação contra Path Traversal | Método `validateDocumentEntryName`. | 🟢 |
| Confiabilidade| Sincronização Transacional de Eventos | `TransactionSynchronizationManager.registerSynchronization` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um upload de pacote ZIP
Quando o arquivo contém entradas maliciosas do tipo `../../../etc/shadow`
Então o Java Core rejeita a operação com erro de validação (Path Traversal)

Dado um job de ingestão que deve ser disparado
Quando a operação de salvar no PostgreSQL falha
Então o Java Core cancela a emissão da mensagem pro RabbitMQ preventivamente
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Banco e Fila Sincronizados | Must | Evita eventos fantasmas e filas mortas (Mensagem mandada, commit falho). |
| Segurança ZIP/RAG | Must | Risco Crítico - Execução Remota via Python sandbox. |
| Path Traversal Protection | Must | Isolamento de recursos de infraestrutura. |
| Paginação (Documents/Audits) | Should | Impede sobrecarga de RAM no DB em Tenants gigantes. |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `AgentService.java` | `createAgent`, `parseZip` | 🟢 |
| `AgentExecutionEventListener.java` | `onMessage` | 🟢 |
| `AgentController.java` | Endpoints HTTP REST | 🟢 |
