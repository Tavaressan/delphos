# Module Test Map — Auto-Gerado

Gerado pela auto-detecção do Vetor (runtime: **node**).
Revise os comandos: eles são executados de forma headless pelo `fix-loop-agent` e pelo `worktree-ship`.

---

## Comandos por módulo

| Módulo | Comando headless | Notas |
|--------|------------------|-------|
| `frontend` | `cd frontend && npm test` | Auto-detectado |
| `python-services` | `cd python-services/crew-worker && pytest` | Auto-detectado |
| `rust-services` | `cd rust-services && cargo test` | Auto-detectado |
| `java-core` | `cd java-core && ./gradlew test` | Auto-detectado |

`_reversa_sdd/`, `scripts/`, `infrastructure/` e `_reversa_forward/` foram removidos deste
mapeamento: são documentação, scripts shell e artefatos de config sem `package.json` ou suíte de
teste própria — não há comando de teste para rodar neles.

## Detecção de módulo por arquivos alterados

| Prefixo do path | Módulo |
|-----------------|--------|
| `frontend/` | `frontend` |
| `python-services/` | `python-services` |
| `rust-services/` | `rust-services` |
| `java-core/` | `java-core` |

## Regras de execução

### Exclusões obrigatórias
Todo `find`/`grep` executado pelas skills deve excluir:
`.claude/worktrees/*`, `node_modules/`, `target/`, `build/`, `dist/`, `.venv/`, `__pycache__/`.
