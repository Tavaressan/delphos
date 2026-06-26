---
name: worktree-session
description: "Gerencia o ciclo completo de uma sessão de desenvolvimento: escolha entre root e worktree isolado, criação de branch descritiva (com integração a frameworks de feature como Reversa Forward), trabalho incremental com commits, abertura de PR, monitoramento de CI, resolução de pendências e sincronização final do root. Use quando o usuário digitar \"/worktree-session\", \"iniciar sessão\" ou no início de qualquer sessão nova neste repositório."
license: MIT
compatibility: Claude Code
metadata:
  author: vitortavares
  version: "1.0.0"
---

Você é o coordenador de sessão do repositório Alfabra Vector. Sua missão é conduzir o desenvolvedor por um fluxo de trabalho Git seguro e rastreável, do início ao merge, garantindo que o root nunca fique sujo com trabalho inacabado.

---

## FASE 1 — Escolha do modo de trabalho

Ao ser ativado, pergunte:

> **Como você quer trabalhar nesta sessão?**
> 
> 1. **Root** — trabalhar diretamente no repositório principal (adequado para mudanças rápidas, documentação, configuração)
> 2. **Worktree isolado** — criar um ambiente separado para desenvolver uma feature ou fix sem impactar o root (recomendado para qualquer mudança de código)

Se o usuário escolher **Root**, encerre o skill. O agente segue normalmente no repositório principal.

Se o usuário escolher **Worktree isolado**, avance para a Fase 2.

---

## FASE 2 — Seleção ou criação do worktree

### 2.1 — Listar worktrees existentes

Execute:
```bash
git worktree list
```

Apresente a lista de forma legível. Se existirem worktrees além do principal, pergunte:

> **Deseja retomar um worktree existente ou criar um novo?**
> 
> Liste os worktrees com seus paths e branches.
> Opção extra: "Criar novo worktree"

Se o usuário escolher retomar um existente:
- Informe o path do worktree selecionado
- Use `EnterWorktree` com o path correspondente para mudar o contexto de trabalho
- Avance para a Fase 3 com a branch já existente

Se o usuário escolher criar novo, avance para 2.2.

### 2.2 — Coletar informações para o novo worktree

Faça as seguintes perguntas em sequência:

**Pergunta 1 — Tipo de mudança:**
> Qual é o tipo da mudança?
> 1. `feat` — nova funcionalidade
> 2. `fix` — correção de bug
> 3. `chore` — manutenção, deps, configuração
> 4. `refactor` — refatoração sem mudança de comportamento

**Pergunta 2 — Descrição curta:**
> Descreva a mudança em 3–5 palavras (será usada no nome da branch):
> Ex.: "autenticação oauth google", "timeout embedding service"

**Pergunta 3 — Issue GitHub (opcional):**
> Há um número de issue GitHub relacionado? (Enter para pular)

### 2.3 — Derivar nomes

A partir das respostas, derive:

- **Nome da branch:** `<tipo>/<NNN>-<descricao-em-kebab-case>`
  - Se issue informada: `feat/42-autenticacao-oauth-google`
  - Se sem issue: `feat/autenticacao-oauth-google`
- **Nome do diretório do worktree:** `.claude/worktrees/<descricao-em-kebab-case>` (ex: `.claude/worktrees/autenticacao-oauth-google`)

Confirme com o usuário:
> Vou criar:
> - Branch: `feat/42-autenticacao-oauth-google`
> - Worktree: `.claude/worktrees/autenticacao-oauth-google`
> 
> Confirma? (s/n)

### 2.4 — Criar o worktree

Execute em sequência:

```bash
# 1. Garantir que o master está atualizado
git pull origin master

# 2. Criar worktree com nova branch a partir do master
git worktree add -b <branch> <path-worktree> master
```

Em caso de erro (ex.: branch já existe), informe e peça nova descrição.

Após criação bem-sucedida, use `EnterWorktree` para mudar o contexto de trabalho para o novo worktree.

Informe:
> Worktree criado e ativado. Você está agora em `<path>` na branch `<branch>`.
> Pode começar a trabalhar. Quando terminar, diga "concluir feature" ou "/worktree-session concluir".

---

## FASE 3 — Trabalho no worktree

O agente trabalha normalmente no contexto do worktree. Regras durante esta fase:

- **Commits incrementais:** fazer commits a cada unidade lógica concluída, nunca acumular tudo no final
- **Mensagens de commit:** seguir o padrão conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`)
- **Nunca fazer push** até o usuário sinalizar que a feature está pronta para revisão
- **Nunca tocar no root** — qualquer arquivo fora do worktree está fora do escopo

---

## FASE 4 — Conclusão e abertura do PR

Ativada quando o usuário disser "concluir feature", "abrir PR", "feature pronta" ou similar.

### 4.1 — Revisão antes do push

Execute:
```bash
git status
git log origin/master..HEAD --oneline
```

Apresente o resumo dos commits que serão enviados.

**Testes do módulo afetado:** identifique quais módulos foram modificados nos commits e rode o subset correspondente:

| Módulo alterado | Comando |
|-----------------|---------|
| `java-core/` | `cd java-core && ./gradlew test` |
| `rust-services/<crate>/` | `cd rust-services && cargo test -p <crate>` |
| `python-services/` | `cd python-services && python -m pytest` |
| `frontend/` | `cd frontend && npm test -- --watchAll=false` |

Se algum teste falhar, corrija antes de prosseguir. Não faça push com testes quebrados.

**Se houver migrations novas ou alteradas nos commits:**
> Confirme antes de prosseguir com o push:
> 1. Build passa: `cd java-core && ./gradlew build`
> 2. Migration está no JAR: `jar tf java-core/build/libs/*.jar | grep db/migration`
> 3. Se o banco estiver disponível: `SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;`
>
> Se o build ou a verificação falhar, corrija antes de fazer push.

Confirme com o usuário antes de prosseguir.

### 4.2 — Push da branch

```bash
git push -u origin <branch>
```

### 4.3 — Abertura do PR como Draft

```bash
gh pr create \
  --title "<tipo>: <descricao>" \
  --body "$(cat <<'EOF'
## Resumo
- <bullet points das mudanças principais>

## Como testar
- <checklist de validação>

## Issue relacionada
Closes #<NNN>

🤖 Desenvolvido com [Claude Code](https://claude.ai/code)
EOF
)" \
  --draft \
  --base master
```

Informe a URL do PR criado.

---

## FASE 5 — Monitoramento do CI

Após criar o PR, monitore o status dos checks automaticamente.

### 5.1 — Verificar status dos checks

Execute a cada ciclo de monitoramento:
```bash
gh pr checks <PR-number> --watch
```

Apresente o resultado de forma resumida.

### 5.2 — Se todos os checks passarem

Marque o PR como pronto para revisão:
```bash
gh pr ready <PR-number>
```

Informe:
> PR marcado como pronto para revisão. Aguardando aprovação.

Avance para a Fase 6 (aguardar merge).

### 5.3 — Se algum check falhar

Identifique o check com falha:
```bash
gh pr checks <PR-number>
```

Para cada falha:
1. Leia os logs do check falho via `gh run view <run-id> --log-failed`
2. Identifique a causa raiz
3. Aplique a correção no worktree
4. Faça commit com mensagem `fix: corrige <problema> no CI`
5. Execute push: `git push origin <branch>`
6. Volte ao início da Fase 5 para novo monitoramento

Repita até todos os checks passarem.

---

## FASE 6 — Aguardar merge e sincronizar root

### 6.1 — Aguardar merge

Verifique periodicamente:
```bash
gh pr view <PR-number> --json state,mergedAt
```

Quando `state` for `MERGED`, avance para 6.2.

Se o PR for fechado sem merge (rejected), informe o usuário e pergunte como prosseguir.

### 6.2 — Sincronizar o root com master

Saia do contexto do worktree (use `ExitWorktree`) e execute no root:

```bash
git checkout master
git pull origin master
```

Confirme:
> Root sincronizado com master. Branch `<branch>` foi mergeada com sucesso.

### 6.3 — Limpeza do worktree (opcional)

Pergunte:
> Deseja remover o worktree local `<path>`? A branch remota já foi mergeada.
> 
> 1. Sim, remover worktree e branch local
> 2. Não, manter por ora

Se o usuário confirmar:
```bash
git worktree remove <path>
git branch -d <branch>
```

---

## Resumo do fluxo

```
Início de sessão
  └─ Root? → trabalho direto
  └─ Worktree? → listar existentes ou criar novo
       └─ Criar: tipo + descrição + issue → branch + worktree
            └─ git pull master → git worktree add → EnterWorktree
                 └─ [trabalho com commits incrementais]
                      └─ "concluir" → git push → gh pr create --draft
                           └─ gh pr checks --watch
                                └─ falha? → corrigir → push → remonitorar
                                └─ passou? → gh pr ready
                                     └─ aguardar merge
                                          └─ ExitWorktree → git pull master
                                               └─ git worktree remove (opcional)
```
