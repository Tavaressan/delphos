# Roadmap: Definição e Priorização do Product Backlog

> Identificador: `011-product-backlog-definition`
> Data: `2026-06-15`
> Requirements: `_reversa_forward/011-product-backlog-definition/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Esta é uma **meta-feature de governança** que consolida a estrutura organizacional do backlog de features seguintes (012–016 e além). A abordagem consiste em:

1. **Mapeamento Explícito de Dependências:** Identificar quais features bloqueiam quais, permitindo paralelização onde não há conflito
2. **Sequenciamento sem Gargalos:** Garantir que nenhuma feature fica bloqueada além de 1–2 incrementos de profundidade
3. **Rastreabilidade Durável:** Usar o próprio framework Reversa para gerenciar o backlog, mantendo histórico de decisões no `.reversa/`
4. **Entrega Incremental Validada:** Cada feature futura segue o template padronizado (requirements → plan → to-do → coding), reduzindo surpresas

O output principal é uma **matriz de features priorizado** que ativa o pipeline `/reversa-forward` iterativamente, começando pela feature 012 (Document Upload & RAG Integration) que serve como prerequisito para múltiplas features posteriores.

## 2. Princípios aplicados

Não há arquivo `.reversa/principles.md` configurado neste projeto ainda. A feature está alinhada aos padrões observados no `_reversa_sdd/`:

| Princípio (inferido) | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| **Monorepo com Separação Clara de Concerns** | O backlog respeita a divisão entre Java (orquestração relacional), Rust (processamento assíncrono) e Frontend (UI), evitando feature que misture responsabilidades | respeita |
| **Integração via HTTP REST e Fila Assíncrona** | Features futuras manuterão o padrão de comunicação interna estabelecido (REST na porta 8000, RabbitMQ para jobs) | respeita |
| **Segurança via RBAC Estrita** | Futuras features de admin (criar agentes, gerenciar usuários) respeitarão ROLE_ADMIN vs ROLE_USER | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | **Sequenciamento Linear com Quick Wins Paralelos** | Feature 012 e 013 não dependem uma da outra, permitindo paralelização sem conflito; Feature 014 e 015 podem começar após 012 estar em roadmap pronto | Sequenciamento serial (mais lento), Tentativa de tudo em paralelo (risco de choque) | 🟢 |
| D-02 | **Usar Reversa `/reversa-forward` para Gerenciar Backlog** | Mantém rastreabilidade, auditoria e histórico automático; reduz overhead de ferramentas externas | Jira / Linear / Trello (desacoplado do código), Spreadsheet (sem versionamento) | 🟢 |
| D-03 | **Manter Frontend Mockado Durante Transição de Backend** | Reduz acoplamento; permite que time de backend trabalhe sem esperar UI finalizada | Bloquear frontend até backend estar pronto (mais lento), Sem mocks (gera retrabalho) | 🟢 |
| D-04 | **Começar por Upload de Documentos (Feature 012)** | É prerequisito para 70% das features posteriores (RAG, busca, histórico); oferece retorno rápido (documentos no backend) | Começar por chat history (UI pura, menos valor), Começar por admin de agentes (paralela, mas menos impacto) | 🟢 |

## 4. Premissas

Não há `[DÚVIDA]` pendentes no `requirements.md`, portanto nenhuma premissa por resolver aqui. Todas as decisões tomadas têm suporte em artefatos do `_reversa_sdd/`.

| Premissa | Origem (requirements.md seção) | Risco se errada |
|----------|----------------------------------|-----------------|
| n/a | n/a | n/a |

## 5. Delta arquitetural

Este backlog **não introduz novos componentes** de arquitetura, mas sim **governa a sequência de features** que usarão componentes já existentes. As mudanças são organizacionais, não técnicas:

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| Frontend (Next.js) | `_reversa_sdd/architecture.md#2. Tecnologias` | regra-alterada | Manterá mocks durante transição; consumirá APIs reais conforme features forem entregues |
| Java Core API | `_reversa_sdd/architecture.md#1. Visão Geral do Sistema` | regra-alterada | Receberá novos endpoints e lógica conforme features de 012–016 forem codificadas |
| Rust Services | `_reversa_sdd/architecture.md#2. Tecnologias` | regra-alterada | Manutenção de padrão existente; nenhuma nova tecnologia introduzida |
| Comunicação Interna | `_reversa_sdd/architecture.md#3. Padrões de Integração` | regra-alterada | Fluxos internos (REST 8000, RabbitMQ) permanecerão; será expandido conforme features crescerem |

## 6. Delta no modelo de dados

**Resumo:** Nenhuma mudança ao modelo de dados. Esta é uma meta-feature de governança; dados são gerenciados por features concretas posteriores (012–016).

- **Detalhe completo:** N/A (veja cada feature específica em seu `data-delta.md` próprio)

## 7. Delta de contratos externos

**Resumo:** Nenhum novo contrato externo nesta feature. O backlog apenas orquestra features que usarão contratos existentes (HTTP REST 8000 para Rust services, RabbitMQ para filas).

| Contrato | Tipo | Status |
|----------|------|--------------------|
| HTTP REST (porta 8000) | HTTP | Mantido de 012 em diante (não novo) |
| RabbitMQ | Fila | Mantido de 012 em diante (não novo) |

## 8. Plano de migração

**Status:** N/A — Meta-feature de planejamento, sem migração de dados.

Transições esperadas em **features concretas**:

1. **012 (Document Upload):** Migração Flyway para tabelas de documentos, chunks, embeddings (veja `012/data-delta.md`)
2. **013 (Agent Creation):** Migração para tabela `agents` (veja `013/data-delta.md`)
3. **014 (Crew Worker Integration):** Integração com RabbitMQ, sem mudança de schema
4. **015 (Chat History):** Migração para histórico persistido (veja `015/data-delta.md`)

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Feature 012 ou 013 descobrir bloqueador inesperado** | alto | médio | Ambas podem rodar em paralelo; se uma travar, a outra continua; realinhar após sprints curtos (1–2 semanas) |
| **Frontend permanecer mockado por muito tempo, causando falta de sinergia UX/Backend** | médio | médio | Integração incremental de componentes (não tudo de uma vez); priorizar features com impacto visual rápido |
| **Requisitos evoluírem antes de 012 ser codificada (scope creep)** | médio | baixo | Usar `/reversa-clarify` e `/reversa-audit` para validar requirements antes de rodar `/reversa-to-do`; correções documentadas em histórico |
| **Time fragmentado entre 012, 013 e refactorings técnicos anteriores (001–010)** | médio | médio | Manter feature 012 e 013 como prioridade única; tecnicamente, ambas são independentes; alocar recursos específicos |

## 10. Critério de pronto

Esta meta-feature é considerada **concluída** quando:

- [x] `requirements.md` está fechado (sem `[DÚVIDA]`)
- [x] `roadmap.md` (este arquivo) mapeando sequência e dependências
- [x] Backlog preliminar (tabela em `requirements.md` seção 10) aprovado e comunicado ao time
- [ ] **Primeira feature concreta (012) teve seu `/reversa-requirements` iniciado e seu `requirements.md` validado** ← próximo passo humano
- [ ] **Duas features em paralelo (012 e 013) com `/reversa-plan` concluído** ← validação de viabilidade
- [ ] Processo iterativo de backlog adoptado pelo time, com histórico em `.reversa/` rastreável

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-15 | Versão inicial gerada por `/reversa-plan` | reversa |
