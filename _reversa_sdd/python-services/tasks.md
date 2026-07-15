# Python Services, Tarefas de Implementação

> Template do arquivo `tasks.md`. Foca em uma sequência de tarefas executáveis para reimplementar a unit a partir do legado, com rastreabilidade ao código original.

## Pré-requisitos
- [ ] Vertex AI API KEY ou Credentials.
- [ ] Postgres rodando e populado.

## Tarefas

- [ ] T-01, Main e Pika Blocking Connection
  - Origem no legado: `python-services/crew-worker/src/main.py`
  - Critério de pronto: While True loop pegando queue com basic_qos(1).
  - Confiança: 🟢

- [ ] T-02, CrewAI Adapter Setup
  - Origem no legado: `crewai_adapter.py`
  - Critério de pronto: Instancia Vertex AI ou MockLLM validando Variavel de dev.
  - Confiança: 🟢

- [ ] T-03, Sandbox Parser (AST)
  - Origem no legado: ADR-002, `_load_custom_tools`
  - Critério de pronto: Parser sintático estrito de código fonte recusa imports perigosos.
  - Confiança: 🟢

- [ ] T-04, Injeção Dinâmica de Ferramentas (Tags)
  - Origem no legado: `crewai_adapter.py` linhas de Tag Matching
  - Critério de pronto: Se tag for `piso`, injeta função `calculate_floor_specs`.
  - Confiança: 🟢

## Tarefas de Teste
- [ ] TT-01, Enviar um Job sem GCP Key (Apenas mock) para ver E2E não quebrando.
- [ ] TT-02, Submeter arquivo ZIP simulado contendo import `os` e esperar bloqueio.

## Ordem Sugerida
1. Main Pika Loop (T-01) - Boilerplate
2. CrewAI (T-02) - O cerne Cognitivo
3. Ferramentas Locais (T-04) - Lógica de Negócio
4. Sandbox AST (T-03) - Segurança Refinada.

## Lacunas Pendentes (🔴)
Nenhuma. Todo o fluxo mental foi desconstruído na revisão da `crewai_adapter.execute()`.
