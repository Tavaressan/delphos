# Backlog — Documentação Obsidian para agentes de IA

> Sessão `/backlog` (backlog-ideator) — 2026-08-06

## Objetivo

Avaliar dois caminhos para documentação voltada a agentes de IA: (1) transcrever a documentação atual do Reversa para o Obsidian, ou (2) usar uma skill/plugin pronto para isso.

## Contexto levantado

- O pipeline `reversa-docs-mapper` / `reversa-docs-publisher` (já existente no projeto, `.agents/skills/`) gera um mini-site HTML standalone (Code City 3D via Three.js, grafo 2D via D3, dashboards Highcharts), não um vault Obsidian. Não resolve o caminho 2 diretamente.
- Pesquisa de práticas da comunidade (Context7): não existe plugin que "transcreva" documentação automaticamente para Obsidian. O padrão é o vault ser Markdown + frontmatter + wikilinks, acessado por agentes via **MCP server** conversando com o plugin `Local REST API`. Opções mais maduras: `markuspfundstein/mcp-obsidian` (benchmark 89.71), `cyanheads/obsidian-mcp-server`, `aaronsb/obsidian-mcp-plugin`, `joch/obsidian-connect-mcp`.

## Decisão de arquitetura (validada com o usuário)

- **Objetivo do vault:** camada de acesso via MCP, apontando para `_reversa_sdd/` e demais docs existentes — **sem transcrever/duplicar conteúdo** (evita desatualização, já que `_reversa_sdd/` é regenerado pelo Reversa a cada rodada).
- **Escopo de uso:** complemento à leitura direta de arquivos (Read/Grep) pelos agentes, não substituição. O vault/MCP entra quando o path não é conhecido de antemão (descoberta, navegação por grafo, busca semântica).

## Issues criadas (`Tavaressan/Alfabra-Vector`)

Labels em todas: `backlog, ai-generated, documentation` + tipo mapeado (`feat`→`enhancement`, `chore`→`chore`, por ausência de labels `feat`/`feature` no repo).

| # | Título | Tipo | Depende de |
|---|--------|------|------------|
| [#360](https://github.com/Tavaressan/Alfabra-Vector/issues/360) | Inicializar vault Obsidian na raiz do repo apontando para a documentação existente | chore | — |
| [#361](https://github.com/Tavaressan/Alfabra-Vector/issues/361) | Configurar plugin Local REST API do Obsidian para acesso programático ao vault | enhancement | #360 |
| [#362](https://github.com/Tavaressan/Alfabra-Vector/issues/362) | Integrar MCP server do Obsidian ao Claude Code | enhancement | #361 |
| [#363](https://github.com/Tavaressan/Alfabra-Vector/issues/363) | Criar MOCs (Maps of Content) linkando `_reversa_sdd/` sem duplicar conteúdo | chore | #360 |
| [#364](https://github.com/Tavaressan/Alfabra-Vector/issues/364) | Documentar o fluxo vault Obsidian + MCP no `CLAUDE.md` | chore | #360–#363 |

Nenhuma duplicata encontrada nas buscas (`Obsidian`, `vault`, `MCP documentação`) antes da criação.

## Pesquisa complementar — padrões de documentação que acompanham a evolução do software

Pergunta de acompanhamento do usuário: existe padrão da comunidade (Obsidian ou similar ao Reversa) para manter documentação atualizada conforme o software evolui?

**Princípio geral — docs-as-code / living documentation:** documentação versionada no mesmo repositório do código, revisada no mesmo fluxo de PR/CI, derivada de uma única fonte de verdade. Adotado por Google, GitLab, Pinterest, Stripe. Evita o antipadrão de duas fontes de verdade dessincronizando.

**Camada de IA sobre esse princípio (ferramentas com detecção de drift):**
- **Swimm** — acopla trechos de doc a linhas de código específicas; sinaliza doc desatualizada no IDE/PR, bloqueia merge até atualização.
- **Mintlify (Autopilot)** — monitora o repo, detecta mudanças relevantes, gera rascunhos de atualização para revisão humana.
- **DeepWiki** — gera wiki navegável a partir de análise estática de qualquer repo GitHub; papel equivalente ao que o **Reversa já cumpre** neste projeto para `_reversa_sdd/`.

**Caso concreto mais próximo do cenário deste projeto (Obsidian + agente Claude Code):** relato de Kevin P. Davison ([quevin.ai, 2026-03-27](https://www.quevin.ai/blog/2026-03-27-obsidian-agent-knowledge-base)) —
- Organização **type-first** (prefixos `JIRA-`, `CR-`, `INC-`, `DOC-`), assunto como tag de frontmatter (segunda camada de descoberta).
- Frontmatter YAML consistente (`title`, `prefix`, `category`, `author`, `date`, `status`, `tags`).
- Todo o diretório de notas, **incluindo `.obsidian/`**, versionado no mesmo repositório — sem sincronização externa.
- **Acionamento manual, com approval gate**: o agente nunca organiza/move conteúdo sem aprovação explícita do usuário.

**Conclusão aplicada a este projeto:** o Reversa já cumpre o papel de "Swimm/DeepWiki" (docs derivadas de análise do código, regeneradas a cada rodada). O que falta — e é o que as issues #360–#364 endereçam — é a camada de curadoria versionada estilo Davison: MOCs com frontmatter, comitados no mesmo repo, sem duplicar `_reversa_sdd/`. Extensão possível, ainda não decidida: adotar convenção de frontmatter type-first (ex.: prefixos `ADR-`, `GAP-`, `ARCH-`) nos MOCs da issue #363.

## Estado ao final da sessão

- Nenhuma alteração de código ou commit realizada — apenas leitura de arquivos e criação de issues via `gh`.
- Nenhuma tarefa pendente desta sessão; as 5 issues aguardam implementação (via `/coordinator` ou manual).
