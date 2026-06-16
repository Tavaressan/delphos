agy# Data Delta: Definição e Priorização do Product Backlog

> Feature: `011-product-backlog-definition`
> Data: `2026-06-15`
> Referência: `_reversa_forward/011-product-backlog-definition/roadmap.md#6. Delta no modelo de dados`

## Status

**N/A — Meta-feature de Governança**

Esta feature é uma **meta-feature de planejamento** que não altera o modelo de dados relacional ou vetorial. Ela organiza e sequencia features concretas (012–016) que, por sua vez, terão seus próprios `data-delta.md` descrevendo tabelas novas, campos, índices e migrações Flyway.

---

## Estrutura de Dados Implícita (Rastreabilidade do Backlog)

Embora não seja persistida em BD relacional, o backlog é rastreado em artefatos versionados:

### Arquivo: `.reversa/active-requirements.json`

```json
{
  "schema-version": 1,
  "feature-dir": "_reversa_forward/011-product-backlog-definition",
  "feature-id": "011",
  "short-name": "product-backlog-definition",
  "started-at": "2026-06-15T14:30:00Z",
  "current-stage": "requirements",
  "stages-completed": [],
  "paused-features": []
}
```

**Propósito:** Registra a feature **ativa atual** e histórico de features pausadas, permitindo rastreabilidade completa de decisões.

**Versionamento:** Este arquivo é atualizado por `/reversa-forward`, `/reversa-requirements` e amigos; histórico preservado em `.git`.

---

## Referências para Features Concretas

Cada feature 012–016 terá seu próprio `data-delta.md` descrevendo:

| Feature | Tabelas novas | Campo(s) novo(s) | Índice(s) novo(s) | Flyway |
|---------|---------------|--------------------|-------------------|--------|
| **012 - Document Upload** | `documents`, `document_chunks` | embeddings (pgvector) | `idx_chunks_embedding` (HNSW) | `V2__documents_and_chunks.sql` |
| **013 - Agent Creation** | `agents` | `agent_id`, `agent_config` | (standard PK) | `V3__agents_table.sql` |
| **014 - Crew Worker** | n/a | `agent_id` (FK em conversas) | n/a | (sem migração nova) |
| **015 - Chat History** | Chat já existe; apenas persistência | n/a (já tem campos) | n/a | (sem mudança) |
| **016 - Future** | TBD | TBD | TBD | TBD |

---

## Mitigações Herdadas

Do `_reversa_sdd/data-dictionary.md` (quando houver):

1. **Extensão pgvector:** Já ativada no `infrastructure/postgres/init.sql`
   - ✅ Pronto para Feature 012 (embeddings)

2. **Tabelas de Auditoria (Audit Log):** Descritas em `_reversa_sdd/domain.md#1.1. Core e Negócio`
   - ✅ Pronto; cada mudança de estado em 012–016 deve logar aqui

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-06-15 | Versão inicial; meta-feature n/a para dados, referenciando futuras |
