# Serviços Python (CrewAI Worker)

## Visão Geral
Serviço isolado responsável por executar agentes de inteligência artificial via biblioteca CrewAI. Seu objetivo é orquestrar chamadas ao LLM (Google AI Studio/Vertex), acionar o serviço de RAG quando necessário, e rodar _Custom Tools_ em um sandbox seguro baseado em subprocessos (para rodar scripts `.py` injetados pelos usuários de forma controlada).

## Responsabilidades
- Consumir trabalhos da fila `agent.execution.jobs` via RabbitMQ.
- Isolar cada Job num `contextvars.Context` (evitar que vazamento de um afete o outro).
- Chamar as APIs LLM do Google (AI Studio ou Vertex) montando o System Prompt dinamicamente.
- Interceptar solicitações de uso de ferramentas (Tool Calls) e rotear adequadamente (Busca Vetorial ou Subprocesso Python).
- Validar via Abstract Syntax Tree (AST) a segurança das Custom Tools (sandbox defensivo).
- Emitir mensagens de progresso (`Thinking`, `RetrievalStarted`, `ToolCallStarted`) de volta para a fila `agent.execution.events`.

## Regras de Negócio
- Execuções de Custom Tools devem possuir restrições rígidas de _timeout_ e um máximo de caracteres na saída padrão `MAX_OUTPUT_CHARS`. 🟢
- O AST Validator obrigatoriamente bloqueia dunder methods (`__class__`, etc) e bibliotecas de sistema (`os`, `sys`, `subprocess`) dentro das Custom Tools. 🟢
- Se exceções contínuas de loop (como o `StackDepthExceededError`) passarem de um limite configurável, o worker deve forçar a saída do processo pai `os._exit(1)` para evitar poluição da JVM e deixar o Kubernetes/Docker reiniciar um container zerado. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Adapter do CrewAI | Must | Injetar prompt e executar task, publicando eventos nos ciclos de vida (início, execução, término). |
| RF-02 | Validação AST Sandbox | Must | Rejeitar estaticamente qualquer Tool que tenha import de `os`, com retorno explícito de falha. |
| RF-03 | Subprocess Executor | Must | O Tool customizado roda num `python3 -I`, lendo payload e devolvendo output JSON serializado via stdout. |
| RF-04 | Fallback de Provedor LLM | Should | Em caso de HTTP Error 429 ou 503 na Google AI Studio, redirecionar transparante para Vertex AI. |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Confiabilidade | Thread / Context Isolation | Uso de `contextvars.Context` | 🟢 |
| Segurança | Poison Pill Threshold Limit | Constante `POISON_THRESHOLD` | 🟢 |
| Performance | Limite de Output Tool | Constante `MAX_OUTPUT_CHARS` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um Custom Tool com `import os; os.system('rm -rf /')`
Quando o CrewWorker tentar parsear e subir o Tool
Então o `sandboxed_script_tool._validate_script` vai levantar Exception de Security e abortar execução

Dado um loop de reflexão infinita do LLM
Quando o stacktrace capturar a exceção repetidas vezes passando do THRESHOLD
Então o worker mata seu processo via `os._exit` imediatamente
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Sandbox de Ferramentas | Must | Código executado pelo usuário com riscos RCE altíssimos se não contido. |
| Integração CrewAI / RabbitMQ | Must | A IA é inútil sem o gateway central de AMQP. |
| Mitigação do Poison Pill | Must | Evita fila congelada e timeout invisível para o usuário final. |
| Query Rewriting (Opt-in) | Could | Reescrever query do usuário pra ter melhor embedding gasta mais tokens e timeout; pode ficar inativo. |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `python-services/crew-worker/main.py` | RabbitMQ / Contexts | 🟢 |
| `python-services/crew-worker/crewai_adapter.py` | Adapter | 🟢 |
| `python-services/crew-worker/sandboxed_script_tool.py` | AST Validation | 🟢 |
| `python-services/crew-worker/executor_core.py` | Python Sandbox CLI | 🟢 |
