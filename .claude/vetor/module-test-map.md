# Module Test Map — Auto-Gerado

Gerado pela auto-detecção do Vetor (runtime: **deno**).
Revise os comandos: eles são executados de forma headless pelo `fix-loop-agent` e pelo `worktree-ship`.

---

## Comandos por módulo

| Módulo | Comando headless | Notas |
|--------|------------------|-------|
| `frontend` | `cd frontend && deno task test` | Auto-detectado |
| `python-services` | `cd python-services/crew-worker && pytest` | Auto-detectado |
| `plugins` | `cd plugins/vetor && deno task test` | Auto-detectado |
| `rust-services` | `cd rust-services && cargo test` | Auto-detectado |
| `scripts` | `cd scripts && deno test -A` | Auto-detectado |
| `java-core` | `cd java-core && ./gradlew test` | Auto-detectado |
| `infrastructure` | `cd infrastructure && deno test -A` | Auto-detectado |

## Detecção de módulo por arquivos alterados

| Prefixo do path | Módulo |
|-----------------|--------|
| `frontend/` | `frontend` |
| `python-services/` | `python-services` |
| `plugins/` | `plugins` |
| `rust-services/` | `rust-services` |
| `scripts/` | `scripts` |
| `java-core/` | `java-core` |
| `infrastructure/` | `infrastructure` |

## Regras de execução

### Exclusões obrigatórias
Todo `find`/`grep` executado pelas skills deve excluir:
`.claude/worktrees/*`, `node_modules/`, `target/`, `build/`, `dist/`, `.venv/`, `__pycache__/`.

### Módulos sem suíte de testes (documentais)
`_reversa_sdd/` e `_reversa_forward/` contêm apenas documentação e specs gerados pelo framework
Reversa (architecture, domain, ADRs, roadmaps de feature) — não são código-fonte e não possuem
suíte de testes. Alterações nesses diretórios não devem disparar comando de teste algum no
`fix-loop-agent` nem no `worktree-ship`.
