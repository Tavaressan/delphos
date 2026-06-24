# Requirements: CrewAI Parametrizado por Agent ID

> Identificador: `017-crewai-parametrizado-agent-id`
> Data: `2026-06-19`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O `crew-worker` Python instancia atualmente o agente CrewAI com identidade fixa (`role="Elevator Specialist"`, `goal` e `backstory` hardcoded em código). O `agent_id` enviado pelo `ExecutionController` no payload RabbitMQ é ignorado por `main.py` e não chega ao adaptador. Esta feature elimina esse hardcode: o worker lê `agent_id` do payload, consulta a tabela `agents`, e usa um parser de YAML frontmatter para extrair `role`, `goal` e `backstory` do `system_instructions` armazenado no banco — tornando o crew-worker agnóstico ao domínio do agente.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.4` | `crewai_adapter.py` instancia `Agent(role="Elevator Specialist", ...)` com goal e backstory hardcoded; `main.py` não extrai `agent_id` do payload | 🟢 |
| `_reversa_sdd/code-analysis.md#2.2` | `ExecutionController.java` publica `agent_id` no payload JSON enviado à fila `agent.execution.jobs` (campo verificado em `payload.put("agent_id", ...)`) | 🟢 |
| `_reversa_sdd/domain.md#1` | `agents.system_instructions` é o texto extraído do primeiro `.md` raiz do ZIP de cadastro — conteúdo comportamental do agente segundo o framework de governança | 🟢 |
| `_reversa_sdd/code-analysis.md#2.3` | `rag-worker` filtra `document_chunks` por `tenant_id AND (agent_id = X OR agent_id IS NULL)`; o crew-worker (`_search_db`) filtra apenas por `tenant_id` | 🟢 |
| `_reversa_sdd/domain.md#4.Agent` | `agents.name` é obrigatório (persistido no `AgentService`); fallback de `tenantId` com UUID zero é dívida conhecida | 🟡 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Administrador de Agentes | Criar agentes de domínios distintos (HVAC, jurídico, RH) que respondam com comportamento próprio | Cadastra agente "Jurídico Especialista" com `system_instructions` contendo frontmatter YAML; executa conversa e espera resposta alinhada ao domínio |
| Usuário final | Obter respostas relevantes ao agente que selecionou na UI | Seleciona agente A na UI; a resposta do CrewAI reflete o `role`/`goal`/`backstory` do agente A, não de um especialista genérico de elevadores |
| Desenvolvedor | Garantir que o crew-worker não retorne chunks de outros agentes do mesmo tenant | Valida que `_search_db` isola corretamente chunks por `agent_id` (incluindo documentos sem agente) |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** O crew-worker deve ler `agent_id` do payload do job e carregar `name` e `system_instructions` da tabela `agents` antes de instanciar o `Agent` CrewAI. 🟢
   - Origem no legado: `_reversa_sdd/code-analysis.md#2.4` — campo presente no payload mas ignorado
   - Tipo: nova

2. **RN-02:** Se `agent_id` estiver presente no payload mas não existir na tabela `agents`, o worker deve publicar `AgentExecutionFailed` e NACK sem requeue. Se `agent_id` estiver ausente, usar o comportamento de fallback (RN-04) sem falhar. 🟡
   - Tipo: nova

3. **RN-03:** A busca vetorial (`_search_db`) deve filtrar chunks com `d.agent_id = agent_id OR d.agent_id IS NULL`, alinhando com o `DocumentChunkRepository.java` que inclui documentos não vinculados a agente. 🟢
   - Origem no legado: `_reversa_sdd/code-analysis.md#2.3`
   - Tipo: alterada

4. **RN-04:** O campo `role`, `goal` e `backstory` do `Agent` CrewAI são extraídos via parser YAML frontmatter de `system_instructions`. O frontmatter segue o formato do framework de governança de agentes: chaves `role`, `goal`, `backstory` dentro de bloco `---`. Fallback quando frontmatter ausente ou incompleto: `agents.name` → role, texto genérico fixo em português → goal, `system_instructions` completo → backstory. 🟢
   - Tipo: nova

5. **RN-05:** Quando `system_instructions` for NULL, vazio ou sem frontmatter válido, o worker usa o backstory padrão atual em inglês ("You are an expert in elevators…") sem lançar erro — preservando comportamento legado. 🟡
   - Tipo: nova

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `main.py` extrai `agent_id` do payload JSON do job e o passa ao `CrewAiRuntimeAdapter`; se ausente, passa `None` | Must | `job_data.get("agent_id")` passado ao adaptador; `None` ativa fallback sem NACK | 🟢 |
| RF-02 | `CrewAiRuntimeAdapter.__init__` recebe `agent_id`; se não-nulo, executa `SELECT name, system_instructions FROM agents WHERE id = %s` via psycopg2 e chama `instruction_parser.parse(system_instructions, name)` | Must | Query executada antes do `execute()`; resultado armazenado em `self._agent_role`, `self._agent_goal`, `self._agent_backstory` | 🟢 |
| RF-03 | Novo módulo `instruction_parser.py` expõe `parse(text: str, name: str) -> dict` que: (1) tenta extrair YAML frontmatter (`---` … `---`) com chaves `role`, `goal`, `backstory`; (2) fallback: `name` → role, `system_instructions` completo → backstory, goal genérico fixo | Must | Agente com frontmatter `role: HVAC Specialist` gera `Agent(role="HVAC Specialist", ...)`; agente sem frontmatter usa `agents.name` como role | 🟢 |
| RF-04 | O `Agent` CrewAI usa `self._agent_role`, `self._agent_goal`, `self._agent_backstory` extraídos pelo parser | Must | Agente "HVAC Specialist" com frontmatter correto executa sem hardcode de "Elevator Specialist" | 🟢 |
| RF-05 | Se `agent_id` não-nulo e não encontrado na tabela `agents`, publicar `AgentExecutionFailed` e NACK sem requeue | Must | Job com `agent_id` inválido resulta em `AgentExecutionFailed` publicado; mensagem não re-enfileirada | 🟡 |
| RF-06 | `_search_db` filtra chunks com `d.agent_id = %s OR d.agent_id IS NULL` via JOIN com tabela `documents` | Should | Chunks do agente A e chunks sem agente são retornados; chunks do agente B são excluídos | 🟢 |
| RF-07 | Se `system_instructions` for NULL/vazio ou frontmatter inválido, usar backstory padrão em inglês atual | Should | Agente com `system_instructions` vazio executa sem erro com backstory "You are an expert in elevators…" | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | O `SELECT` na tabela `agents` ocorre uma única vez por execução, antes do `kickoff()` | Latência adicional esperada < 50 ms (conexão local ao container PostgreSQL) | 🟡 |
| Observabilidade | Log do `agent_id`, `role` extraído e primeiros 80 chars de `backstory` antes do kickoff | Facilita rastreio de qual agente foi executado em cada job sem expor o texto completo | 🟢 |
| Resiliência | Falha de conexão ao DB durante lookup do agente publica `AgentExecutionFailed` e NACK; não deixa a execução em estado indefinido | Alinhado ao padrão de tratamento de exceções já em `main.py` (bloco `except Exception`) | 🟡 |
| Manutenibilidade | `instruction_parser.py` é um módulo isolado sem dependências de infra (sem DB, sem RabbitMQ) — testável unitariamente | Facilita evolução futura do formato do framework de governança sem alterar o adaptador | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Agente com frontmatter YAML carregado com sucesso
  Dado que existe um agente com id="abc-123", name="HVAC Specialist"
  E system_instructions contém frontmatter com role="HVAC Specialist", goal="Analisar HVAC...", backstory="Você é especialista..."
  E um job publicado em "agent.execution.jobs" com agent_id="abc-123"
  Quando o crew-worker consome o job
  Então o Agent CrewAI é instanciado com role="HVAC Specialist" e backstory="Você é especialista..."
  E o evento AgentExecutionFinished é publicado

Cenário: Agente sem frontmatter usa fallback
  Dado que existe um agente com id="abc-456", name="Jurídico"
  E system_instructions não contém bloco frontmatter YAML
  Quando o crew-worker consome o job com agent_id="abc-456"
  Então o Agent CrewAI é instanciado com role="Jurídico"
  E backstory recebe o system_instructions completo
  E nenhum erro é publicado

Cenário: agent_id presente e inválido
  Dado que um job é publicado com agent_id="nao-existe"
  Quando o crew-worker consome o job
  Então o evento AgentExecutionFailed é publicado
  E a mensagem recebe NACK sem requeue

Cenário: agent_id ausente usa fallback hardcoded
  Dado que um job é publicado sem o campo agent_id (execução de teste)
  Quando o crew-worker consome o job
  Então o Agent CrewAI é instanciado com o role/backstory padrão legado
  E o evento AgentExecutionFinished é publicado normalmente

Cenário: Busca vetorial isolada por agent_id com documentos compartilhados
  Dado que existem chunks do agente A, chunks do agente B e chunks sem agente no mesmo tenant
  Quando o crew-worker executa _search_db com agent_id=A
  Então chunks do agente A e chunks sem agente são retornados
  E chunks do agente B são excluídos
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 — extrair agent_id em main.py | Must | Pré-condição de todos os outros requisitos |
| RF-02 — lookup no banco + chamar parser | Must | Núcleo da feature |
| RF-03 — instruction_parser.py com frontmatter YAML | Must | Elimina hardcode; parser isolado facilita testes |
| RF-04 — role/goal/backstory dinâmicos no Agent | Must | Objetivo primário da feature |
| RF-05 — NACK se agent_id inválido | Must | Evita execuções silenciosamente erradas |
| RF-06 — filtrar chunks por agent_id OR IS NULL | Should | Correção de isolamento de dados; alinha com rag-worker e DocumentChunkRepository |
| RF-07 — fallback backstory legado | Should | Robustez; zero regressão em execuções de teste sem agente |
| RNF Observabilidade — log do agente | Should | Essencial para debug em produção |

## 9. Esclarecimentos

### Sessão 2026-06-19

- **Q:** Como mapear `system_instructions` para `role`, `goal` e `backstory` do CrewAI? O framework de governança tem estrutura bem definida — é necessário um parser?
  **R:** Adotar parser de YAML frontmatter (Nível 1): o `.md` do framework contém bloco `---` com chaves `role`, `goal`, `backstory`. Parser implementado em `instruction_parser.py` isolado. Fallback quando frontmatter ausente: `agents.name` → role, `system_instructions` completo → backstory, goal genérico fixo. Escopo futuro: suporte a múltiplos `.md` no ZIP (ver Lacunas).

- **Q:** Jobs sem `agent_id`: executar fallback ou NACK?
  **R:** Fallback — usar comportamento hardcoded legado sem falhar. Jobs de teste chegam legitimamente sem `agent_id`. NACK apenas se `agent_id` estiver presente e não existir no banco.

- **Q:** Filtro de chunks no `_search_db`: incluir `OR agent_id IS NULL`?
  **R:** Sim — filtrar com `d.agent_id = agent_id OR d.agent_id IS NULL`, replicando `DocumentChunkRepository.java`. Além dos documentos do agente, documentos de RAG genéricos (sem agente associado) também devem ser incluídos.

- **Q:** Idioma do backstory de fallback quando `system_instructions` é vazio?
  **R:** Manter texto atual em inglês — zero mudança de comportamento para agentes legados ou execuções de teste.

## 10. Lacunas

- 🟡 `AgentService.java` captura apenas o PRIMEIRO `.md` raiz do ZIP como `system_instructions`, ignorando os demais arquivos `.md` que compõem o agente segundo o framework de governança. Os demais são vectorizados como base de conhecimento. Concatenação de todos os `.md` raiz em `system_instructions` é dívida fora do escopo desta feature — candidato a item de backlog separado.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-19 | Versão inicial gerada por `reversa-requirements` | reversa |
| 2026-06-19 | Esclarecimentos integrados via `reversa-clarify` (4 respostas; 1 [DÚVIDA] resolvida) | reversa |
