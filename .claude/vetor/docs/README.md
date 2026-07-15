# Contexto para o Vetor

O `/vetor:backlog-ideator` lê este diretório para propor issues contextualizadas. Em vez de
duplicar documentação já mantida em outro lugar, este arquivo aponta para as fontes vivas do
projeto — evita ficar desatualizado quando a fonte original muda.

## Arquitetura e domínio

Gerados e mantidos pelo framework Reversa (ver `CLAUDE.md` na raiz):

- `_reversa_sdd/domain.md` — domínio e entidades
- `_reversa_sdd/dependencies.md` — mapa de dependências
- `_reversa_sdd/data-dictionary.md` — dicionário de dados
- `_reversa_sdd/code-analysis.md` — análise de código por módulo
- `_reversa_sdd/state-machines.md` — máquinas de estado
- `_reversa_sdd/permissions.md` — matriz de permissões
- `_reversa_sdd/adrs/` — decisões de arquitetura (ADRs)
- `_reversa_sdd/flowcharts/` — fluxogramas por módulo

**Nota:** `_reversa_sdd/` é escrito exclusivamente pelo Reversa — não editar manualmente. Se
`architecture.md` ou `gaps.md` não existirem no momento da leitura, é porque uma sessão de
regeneração do Reversa está em andamento; rode `/reversa` para completá-la.

## Padrões do projeto

- `CLAUDE.md` (raiz) — stack, convenções de commit, comandos comuns, regras de branch/PR
- `.claude/rules/vetor/deno.md` — convenções de teste Deno detectadas automaticamente
- `.claude/vetor/module-test-map.md` — comando de teste headless por módulo

## Dívidas técnicas conhecidas

- Embeddings via Vertex AI/Gemini sem fallback (ver `CLAUDE.md`, seção Convenções)
- Free tier do Vertex AI expirado — fallback para Google AI Studio rastreado nas issues #192/#193/#194
