# crew-worker

Serviço Python (CrewAI) responsável pela execução dos agentes autônomos LLM
da plataforma Alfabra Vector. Consome jobs de execução do RabbitMQ, monta o
runtime CrewAI a partir do pacote do agente (instruções + arquivos de
conhecimento) e publica o resultado de volta para o java-core.

## Estrutura

```
src/
  main.py                 # entrypoint do worker (consumer RabbitMQ)
  runtime/                # adapter CrewAI, execução dos agentes
  tools/                  # tools customizadas (busca, execução de script, etc.)
  mock_agents/            # conteúdo mockado dos 4 agentes de demo
  seed_mock_agents.py     # cria/publica os 4 agentes mockados (idempotente)
  demo_agents.py          # demo end-to-end: seed + perguntas de exemplo
tests/                    # testes pytest
```

## Agentes mockados

Para demonstração da plataforma sem depender de conteúdo real de clientes,
o repositório inclui 4 agentes mockados em `src/mock_agents/`:

| Tag            | Nome                                          | Conteúdo                                                      |
|----------------|-----------------------------------------------|------------------------------------------------------------------|
| `compliance`   | Agente de Compliance de Elevadores            | Normas mockadas ABNT NBR 7192 e NR-18                            |
| `piso`         | Agente de Piso                                | Especificações de piso de cabine + calculadora determinística    |
| `catalogo`     | Agente Catálogo Elevadores Alfabra            | Catálogo mockado de modelos de elevadores (ALF-R4, ALF-C13, etc.) |
| `orquestrador` | Agente Orquestrador                           | Delega perguntas para o especialista correto (`route_to_agent`)  |

### Criar/publicar os agentes (seed)

Pré-requisito: stack completa rodando (`docker compose up -d`, ou
`./scripts/setup.sh` / `./scripts/dev.sh` a partir da raiz do repo).

```bash
cd python-services/crew-worker
python src/seed_mock_agents.py [--base-url http://localhost:8080] [--tenant-id <uuid>]
```

O script é **idempotente**: antes de criar um agente, ele consulta
`GET /api/agents` e casa por `tag`. Se um agente com a mesma tag já existir,
ele é reaproveitado (publicando-o caso ainda não esteja `PUBLISHED`) em vez
de criar um duplicado — rodar o comando várias vezes é seguro.

### Demo com perguntas de exemplo

`src/demo_agents.py` reutiliza o seed acima e, em seguida, envia uma
pergunta de exemplo para cada um dos 4 agentes através da mesma API de
chat/execução usada pelo frontend (`POST /api/executions` +
`GET /api/executions/{id}`), imprimindo pergunta e resposta de forma legível.
É o jeito mais rápido de demonstrar a plataforma sem precisar montar
requisições manualmente no curl/Postman.

```bash
# a partir da raiz do repo
./scripts/demo-agents.sh [--base-url http://localhost:8080] [--tenant-id <uuid>] [--timeout 60]

# ou diretamente
cd python-services/crew-worker
python src/demo_agents.py
```

Perguntas de exemplo usadas (uma por agente, escolhidas para exercitar
conteúdo real dos arquivos mockados de cada um):

- **compliance:** "Qual é a velocidade máxima de operação permitida para
  elevadores de carga em obras, segundo a NR-18?" (item 18.14.1.3 do mock)
- **piso:** "Preciso do piso para um elevador comercial modelo ALF-C8, com
  carga nominal de 630 kg e cabine de 1100 x 1400 mm. Qual material,
  espessura mínima e resistência à compressão devo usar?" (exercita a tool
  `calculate_floor_specs` / `floor_calculator.py`)
- **catalogo:** "Quais são as especificações técnicas e o preço de
  referência do elevador ALF-C13?" (seção "Linha Comercial" do catálogo)
- **orquestrador:** "Qual é a carga nominal mínima exigida pela ABNT NBR
  7192 para elevadores de passageiros?" (valida que o orquestrador delega
  corretamente para o Agente de Compliance via `route_to_agent`)

### Modo mock vs. credenciais reais

Para obter respostas determinísticas sem configurar credenciais reais do
Vertex AI/Gemini, rode a stack com `CREW_WORKER_MODE=mock` (ver
`docker-compose.yml` / `.env.example`). `demo_agents.py` não assume esse
modo — ele apenas consome a API pública de execução — então também funciona
sem alterações contra uma stack configurada com credenciais reais; nesse
caso as respostas deixam de ser mockadas.

## Testes

```bash
cd python-services/crew-worker
pip install -r requirements.txt pytest
pytest
```
