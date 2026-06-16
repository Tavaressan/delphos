# Onboarding: Usando o Product Backlog da Alfabra Vector

> Feature: `011-product-backlog-definition`
> Data: `2026-06-15`
> Público: Product Owner, Scrum Master, Desenvolvedores, QA

---

## 🎯 O que é este Documento?

Um **guia prático passo-a-passo** para usar o product backlog estruturado que foi definido na feature 011. Ele explica como consultar, executar e parallelizar as próximas features (012–016).

---

## 📋 Parte 1: Entendendo o Backlog

### 1.1 Onde está o backlog?

O backlog é definido em:

```
_reversa_forward/011-product-backlog-definition/requirements.md
  └─ Seção 10. Lacunas → "Backlog Preliminar Consolidado"
```

Leia a tabela ali. Ela lista:

- **Identificador** (012, 013, ..., 016)
- **Nome da feature**
- **Descrição curta**
- **Dependências** (qual feature precisa estar pronta antes)
- **Prioridade MoSCoW** (Must, Should, Nice to Have)
- **Tamanho estimado** (Small, Medium, Large, XL)
- **Razão** (por que essa sequência)

### 1.2 Quais features podem rodar em paralelo?

**Paralelo SIM:**
- **012 (Upload)** + **013 (Admin Agents)** → Ambas independentes

**Sequencial (bloqueia):**
- **014 (Crew Worker)** depende de ✅ 012 (RAG) + ✅ 013 (Agentes disponíveis)
- **015 (Chat History)** pode começar após 012 em roadmap pronto (não bloqueada antes)

### 1.3 Visão Geral da Sequência

```
Sprint 1        Sprint 2         Sprint 3        Sprint 4
════════════════════════════════════════════════════════════

[012 Plan]      [012 Coding]    [014 Plan]      [014 Coding]
    ↓               ↓                ↓                ↓
[013 Plan]      [013 Coding]    [015 Plan]      [015 Coding]
    ↓               ↓                ↓                ↓
                            [E2E Tests 012+013+014]
                                                        ✅ Deploy 1
```

---

## 🚀 Parte 2: Iniciando a Feature 012 (Document Upload)

### 2.1 Prerequisito

Você está lendo este `onboarding.md` **depois** que Feature 011 foi planejada (roadmap.md concluído).

### 2.2 Passos

#### **Passo 1: Abra Terminal**

```bash
cd /Users/vitortavares/Desktop/Alfabra\ Vector
```

#### **Passo 2: Inicie a Feature 012**

Abra VS Code e na Chat do Copilot, digite:

```
/reversa-requirements Document Upload & RAG Integration
```

Esto ativará:
- Leitura de `requirements.md` novo
- Criação da pasta `_reversa_forward/012-document-upload-rag/`
- Atualização de `.reversa/active-requirements.json` para 012

#### **Passo 3: Valide o `requirements.md` de 012**

Uma vez que 012 esteja gerado, leia `_reversa_forward/012-document-upload-rag/requirements.md`.

**Checklist de validação:**

- [ ] Resumo executivo está claro?
- [ ] Contexto a partir do legado cita as fontes (`_reversa_sdd/...#...`) corretas?
- [ ] Requisitos funcionais (RF-01 a RF-05) são verificáveis?
- [ ] Há no máximo 3 marcadores `[DÚVIDA]`? Se sim, rode `/reversa-clarify`
- [ ] MoSCoW faz sentido? (Esperado: RF-01 e RF-02 = Must)

**Assinador:** Product Owner

#### **Passo 4: Rode `/reversa-plan` para 012**

Na Chat:

```
/reversa-plan
```

Isto vai gerar:
- `_reversa_forward/012-document-upload-rag/roadmap.md`
- `_reversa_forward/012-document-upload-rag/investigation.md`
- `_reversa_forward/012-document-upload-rag/data-delta.md`
- `_reversa_forward/012-document-upload-rag/onboarding.md`

**Leia o roadmap.md.** Confirme que:

- [ ] Delta arquitetural faz sentido?
- [ ] Não há conflito entre novas APIs e código legado?
- [ ] Plano de migração (Flyway) está claro?
- [ ] Riscos e mitigações foram considerados?

**Assinador:** Tech Lead

#### **Passo 5: Rode `/reversa-to-do` para 012**

Na Chat:

```
/reversa-to-do
```

Isto decompõe o roadmap em **ações atômicas** (T001, T002, ..., T0XX) com:
- IDs estáveis
- Dependências explícitas
- Paralelismo (marker `[//]`)
- Arquivo alvo
- Confidência

**Resultado:** `_reversa_forward/012-document-upload-rag/actions.md`

#### **Passo 6: Começe a Codificar (Sprint 1, Semana 1)**

Na Chat:

```
/reversa-coding
```

Isto vai:
- Ler `actions.md` e inicializar `progress.jsonl`
- Executar cada ação T001, T002, ..., até T0XX
- Marcar checkboxes `[X]` conforme completar
- Gerar `legacy-impact.md` e `regression-watch.md`

---

## 🔄 Parte 3: Paralelizando com Feature 013

### 3.1 Quando Iniciar Feature 013?

**Timing:** Assim que Feature 012 entrar em estágio `/reversa-plan` ou `/reversa-to-do`.

**Por quê?** Não há bloqueio entre elas. Começar cedo permite que:
- Tim de Backend A trabalha em 012 (upload + embeddings)
- Tim de Backend B trabalha em 013 (admin agents)
- Ambos prontos para integração simultânea (Feature 014)

### 3.2 Passos

Repita exatamente o workflow de 012:

```bash
/reversa-requirements Agent Creation by Admin Interface
/reversa-plan
/reversa-to-do
/reversa-coding  # Start coding, parallel to 012
```

---

## ✅ Parte 4: Critério de Conclusão por Feature

### Feature Considerada "Pronta" quando:

- [ ] `requirements.md` ✅ (sem `[DÚVIDA]`)
- [ ] `roadmap.md` ✅
- [ ] `to-do.md` (actions.md) ✅ (todas as ações com `[X]`)
- [ ] `progress.jsonl` ✅ (100% completed)
- [ ] `legacy-impact.md` ✅ (gerado, reviewed)
- [ ] `regression-watch.md` ✅ (gerado, testes passam)
- [ ] E2E tests validados ✅
- [ ] Code review aprovado ✅

**Indicador Visual:** Arquivo `actions.md` com **todas as linhas de ação terminando em `[X]`**.

---

## 🎓 Parte 5: Comandos Rápidos de Referência

### Iniciar Nova Feature

```bash
/reversa-requirements "Seu título aqui"
```

### Planejar Feature Ativa

```bash
/reversa-plan
```

### Decompor em Tarefas

```bash
/reversa-to-do
```

### Começar a Codificar

```bash
/reversa-coding
```

### Esclarecer Dúvidas

```bash
/reversa-clarify
```

### Revisar Qualidade de Requisitos

```bash
/reversa-quality
```

### Auditoria de Consistência

```bash
/reversa-audit
```

### Retomar Feature Pausada

```bash
/reversa-resume
```

### Ver Estado do Projeto

```bash
/reversa-forward
```

---

## 📞 Parte 6: Suporte e Perguntas

### "Sou desenvolvedor, como sei que ações fazer?"

**R:** Consulte `_reversa_forward/<NNN-feature>/actions.md`. Cada linha é uma ação com:
- ID (T001, T002, ...)
- Descrição
- Dependências
- Arquivo alvo
- Status `[ ]` (fazer) ou `[X]` (pronto)

### "Qual feature começa próxima?"

**R:** Consulte o `requirements.md` de Feature 011, seção 10. Tabela "Backlog Preliminar Consolidado" lista a sequência + dependências.

### "Posso mudar a prioridade?"

**R:** Sim. Rode `/reversa-requirements` com a nova descrição. Se houver feature em andamento, o sistema perguntará se você quer:
1. Continuar a anterior
2. Criar nova em paralelo (pausa a anterior)
3. Abandonar a anterior

### "Preciso de mais informações sobre uma feature?"

**R:** Cada feature tem:
- `requirements.md` → "O que?" (requisitos, critérios de aceite)
- `roadmap.md` → "Como?" (abordagem técnica, decisões)
- `investigation.md` → "Por que?" (alternativas, padrões)
- `data-delta.md` → "Dados?" (mudanças ao BD)
- `onboarding.md` → "Como testar?" (passo a passo)
- `interfaces/` → "Contratos?" (APIs HTTP, filas, etc.)

---

## 🏁 Próximos Passos

1. **Agora:** Leia este documento completamente
2. **Próximo:** Abra a Chat do Copilot e digite `/reversa-requirements Document Upload & RAG Integration`
3. **Depois:** Siga os passos da **Parte 2** para inicializar Feature 012

---

**Gerado por:** `/reversa-plan` (Feature 011)  
**Data:** 2026-06-15  
**Versão:** 1.0
