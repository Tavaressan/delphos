# Investigation: Multi-agent Orchestration — Delegação de tarefas entre agentes

> Identificador: `018-multi-agent-orchestration`
> Data: `2026-06-25`

## 1. Pesquisa de Fundo e Padrões Aplicáveis

A delegação de tarefas entre agentes em sistemas multi-agentes baseados em frameworks como CrewAI tradicionalmente depende de ferramentas nativas fornecidas pelas bibliotecas (`@tool` no Python). No entanto, em um ecossistema com microsserviços distribuídos escritos em linguagens diferentes (Python e Rust), o acoplamento direto via RPC ou HTTP síncrono cria um gargalo e reduz a resiliência global do sistema.

### Padrões Aplicados
- **Enterprise Integration Patterns (EIP):**
  - **Message Broker:** O uso de RabbitMQ como intermediário garante que a solicitação do orquestrador não seja perdida caso o especialista esteja temporariamente sobrecarregado ou offline.
  - **Request-Reply via Filas:** O `crew-worker` atua como solicitante, enviando uma mensagem para `agent.retrieval.delegated.jobs` e aguardando uma mensagem correlacionada no canal temporário ou fila de resposta dedicada.

## 2. Alternativas Avaliadas

### Alternativa A: Chamada Síncrona via HTTP REST interna (Descartada)
- *Funcionamento:* O `crew-worker` faria um POST diretamente na porta do `rag-worker` (`http://rust-services:8000/api/retrieval`).
- *Vantagem:* Facilidade de implementação no Python (biblioteca `requests`).
- *Desvantagem:* Bloqueia a thread do worker do CrewAI de forma síncrona; em picos de concorrência, isso pode esgotar o pool de conexões do microsserviço Rust e causar falhas em cascata em toda a plataforma.

### Alternativa B: Mensageria Assíncrona via RabbitMQ com Filas Dedicadas (Escolhida)
- *Funcionamento:* O `crew-worker` publica o job de busca na fila do RabbitMQ e faz um polling passivo de curta duração (com timeout) em uma fila temporária ou de eventos para ler a resposta.
- *Vantagem:* Total isolamento de processos, controle de vazão natural (backpressure), compatibilidade com a infraestrutura e padrões existentes do legado de mensageria da Alfabra-Vector.
- *Desvantagem:* Aumento de complexidade de código no Python para gerenciar o ciclo de escuta assíncrona da resposta da fila.

## 3. Fontes e Referências
- Documentação do CrewAI Tools: https://docs.crewai.com/core-concepts/Tools/
- RabbitMQ RPC Pattern: https://www.rabbitmq.com/tutorials/tutorial-six-python.html
- Práticas de Resiliência (Retry Pattern): https://learn.microsoft.com/en-us/azure/architecture/patterns/retry
