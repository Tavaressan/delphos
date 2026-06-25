# Regression Watch: Prompt Injection Protection

> Identificador: `018-prompt-injection-protection`

Este documento lista as regras de negócio e asserções que devem continuar válidas nas futuras extrações reversas e modificações de código do projeto.

## 1. Watch Items de Regressão

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|------------------------------|---------------------|-------------------|
| W001 | `requirements.md#rn-03` | O prompt de tarefa do `crew-worker` deve encapsular o input do usuário e o contexto recuperado em tags XML estruturadas (`<user_query>` e `<knowledge_base_chunks>`). | presença | Remoção das tags XML da concatenação do prompt da Task no `crewai_adapter.py`. |
| W002 | `requirements.md#rn-03` | O prompt de chat do `rag-worker` deve encapsular o input do usuário e o contexto recuperado em tags XML estruturadas (`<user_query>` e `<knowledge_base_chunks>`). | presença | Remoção das tags XML do prompt enviado à API do Vertex AI Gemini em `rabbitmq.rs`. |
| W003 | `requirements.md#rn-01` | Toda query de execução deve passar por validação de tamanho limitando a entrada a 4000 caracteres físicos máximos. | presença | Remoção do limite ou permissão de inputs superiores a 4000 caracteres. |
| W004 | `requirements.md#rn-02` | Toda query de execução com expressões regex de jailbreak conhecidas deve ser rejeitada antes de acionar a geração do LLM. | presença | Execuções contendo termos de bypass completando com sucesso sem gerar erro de segurança. |

## 2. Observações
*Não há regras de confidência média (inferida) ou baixa sob escopo de regressão nesta feature.*

## 3. Histórico de re-extrações
*(Esta seção será preenchida automaticamente pelo Reversa em futuras execuções do Scout/Detective/Writer).*

## 4. Arquivadas
*(Lista de watches inativados em iterações de evolução futuras).*
