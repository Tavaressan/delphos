# Alfabra Vector — Claude Code Context

## Projeto

Plataforma corporativa de RAG (Retrieval-Augmented Generation) para busca semântica em documentos privados, com orquestração de agentes de IA. Monorepo multi-linguagem com Docker Compose.

## Arquitetura

| Diretório | Stack | Responsabilidade |
|-----------|-------|------------------|
| `frontend/` | Next.js 14, React, Tailwind | UI web |
| `java-core/` | Java 17, Spring Boot 3, Flyway | Core API REST, RBAC, JWT, metadados |
| `rust-services/ingestion-worker/` | Rust, Tokio | Ingestão de documentos, polling PostgreSQL |
| `rust-services/embedding-service/` | Rust, Axum | Geração de embeddings via Vertex AI/Gemini |
| `rust-services/rag-worker/` | Rust | Busca vetorial pgvector, resposta RAG |
| `rust-services/document-processing/` | Rust | Extração de texto de documentos |
| `rust-services/workflow-worker/` | Rust | Orquestração de fluxos |
| `python-services/crew-worker/` | Python, CrewAI | Agentes autônomos LLM |

**Infra:** PostgreSQL + pgvector, MinIO (S3), RabbitMQ, Caddy (proxy/TLS)

## Reversa Framework

O projeto usa o **Reversa** (`reversa@^1.2.43` em `package.json`) como framework de engenharia e skills de IA.

- **Skills disponíveis:** `.agents/skills/reversa-*/SKILL.md` (~50 skills)
- **Documentação gerada:** `_reversa_sdd/` (architecture, domain, ERD, ADRs, etc.)
- **Features em andamento:** `_reversa_forward/NNN-nome/` (actions.md, requirements.md, progress.jsonl)
- **Ativar:** digitar `reversa` sozinho carrega `.agents/skills/reversa/SKILL.md`

**Regra não-negociável:** nunca apagar, modificar ou sobrescrever arquivos pré-existentes do projeto. O Reversa escreve **apenas** em `.reversa/` e `_reversa_sdd/`.

## Documentação chave

- `_reversa_sdd/architecture.md` — visão arquitetural completa
- `_reversa_sdd/domain.md` — domínio e entidades
- `_reversa_sdd/dependencies.md` — mapa de dependências
- `_reversa_sdd/gaps.md` — dívidas técnicas e gaps
- `AGENTS.md` — instruções do Reversa para agentes

## Comandos comuns

```bash
# Subir toda a stack
docker-compose up -d

# Desenvolvimento local
./scripts/dev.sh

# Java Core
cd java-core && ./gradlew bootRun
cd java-core && ./gradlew test

# Rust (todos os serviços)
cd rust-services && cargo build
cd rust-services && cargo test

# Frontend
cd frontend && npm run dev
cd frontend && npm run build

# E2E
npm run test:e2e

# Logs / Reset
./scripts/logs.sh
./scripts/reset.sh
```

## Convenções

- Comunicação Java → Rust: polling PostgreSQL (ingestion) e HTTP REST interno (porta 8000)
- Auth: JWT stateless via header HTTP
- Embeddings: Vertex AI / Gemini (sem fallback atual — dívida técnica)
- Migrações de banco: Flyway (em `java-core/src/main/resources/db/migration/`)

## Sessão tmux (recomendado)

Para sobreviver a sleep/lock do macOS, rode o Claude Code CLI dentro de uma sessão tmux. O script abaixo cria automaticamente uma janela de shell e uma janela `claude` para o root + uma janela por worktree ativo:

```bash
./scripts/tmux-session.sh          # cria ou reanexe a sessão
./scripts/tmux-session.sh --kill   # recria do zero (fecha a sessão atual)
```

**Fluxo diário:**
1. `./scripts/tmux-session.sh` — abre tudo
2. `Ctrl+B <número>` — navega entre janelas (0 = shell, 1 = claude-root, 2+ = worktrees)
3. `Ctrl+B D` — **desanexa antes de bloquear a tela** (sessão continua em background)
4. Ao voltar: `./scripts/tmux-session.sh` — reanexe onde parou

Se um novo worktree for criado durante a sessão, rode `--kill` para regenerar as janelas.

## Git
- Never commit directly to main or master
- Always work on a feature branch
- Use conventional commits: feat/fix/chore/refactor/test
- Run ./gradlew build before creating any PR

## Desambiguação de Issues do GitHub
Quando houver possibilidade de confusão entre uma funcionalidade numerada (e.g. '016-bdd') e um número de issue do GitHub (e.g. #16), confirme explicitamente a qual delas o usuário se refere antes de prosseguir.

## Fluxo de sessão com worktree

Este projeto tem um skill dedicado para gerenciar sessões de desenvolvimento com isolamento via Git worktree. **Lembre o usuário deste fluxo ao iniciar qualquer sessão nova**, especialmente quando ele mencionar que vai desenvolver uma feature, fix ou refatoração.

**Como ativar:** `/worktree-session` ou digitar "iniciar sessão"

**O que o skill faz:**
1. Pergunta se o trabalho será no root ou em worktree isolado
2. Lista worktrees existentes ou cria um novo dentro da raiz do projeto, em `.claude/worktrees/` (branch descritiva + worktree separado)
3. Conduz o desenvolvimento com commits incrementais no worktree
4. Abre PR como draft, monitora CI, resolve falhas automaticamente
5. Ao fazer merge, sincroniza o root com master e oferece limpeza do worktree

O skill está em `.claude/skills/worktree-session/SKILL.md`.

---

# Reversa

> Framework de Engenharia Reversa instalado neste projeto.

## Como usar

Digite `/reversa` para ativar o Reversa e iniciar ou retomar a análise do projeto.

## Comportamento ao ativar

Quando o usuário digitar `/reversa` ou a palavra `reversa` sozinha em uma mensagem:

1. Ative o skill `reversa` disponível em `.claude/skills/reversa/SKILL.md`
2. Se não encontrar em `.claude/skills/`, tente `.agents/skills/reversa/SKILL.md`
3. Leia o SKILL.md na íntegra e siga exatamente as instruções do Reversa

## Regra não-negociável

Nunca apague, modifique ou sobrescreva arquivos pré-existentes do projeto legado.
O Reversa escreve **apenas** em `.reversa/` e `_reversa_sdd/`.

---

## Migrações de Banco de Dados
Após adicionar ou editar uma migração do Flyway (por exemplo, V7), sempre verifique se a migração foi incluída no JAR gerado e se é realmente executada (confirme se o esquema/tabela existe) antes de declarar o serviço como saudável. Limpe o cache de build caso a migração esteja ausente.

## CI — Validação retroativa pendente (issue #87)
O bug do path-filter auto-referente (issue #77) esteve presente desde a introdução do
path-filtering, o que significa que PRs mergeados nesse período podem ter pulado checks
obrigatórios silenciosamente. As correções de #77/#87 evitam que isso volte a acontecer, mas
**não re-executam retroativamente** os testes dos PRs já mergeados (#55, #73, #74, #75, #76).
Essa verificação manual — rodar as suites completas de cada módulo alterado nesses PRs contra o
estado atual do `master` — ainda precisa ser feita por um humano; não faz parte do escopo
automatizado deste fix.

## CI — Gate de imagens Docker
Além dos builds/testes nativos (Rust/Java/Frontend/Python), o workflow `.github/workflows/ci.yml`
possui jobs `docker-build-*` que executam `docker build` (via `docker/build-push-action`, sem push)
para cada serviço com Dockerfile, em paralelo aos jobs nativos e escopados pelo mesmo path-filter do
job `changes`. Esses jobs também fazem parte do gate de CI obrigatório — um PR só deve ser mesclado
se tanto o build nativo quanto o build da imagem Docker do módulo alterado passarem.

## Verificação no Sandbox
Se os comandos `docker compose build`, `up` ou `exec`, ou chamadas de rede externas, forem bloqueados pelo sandbox, pare de tentar após **uma única tentativa**, informe claramente a limitação e forneça ao usuário uma lista de comandos prontos para executar manualmente, incluindo o output esperado de cada um. Não repita tentativas bloqueadas esperando resultado diferente.