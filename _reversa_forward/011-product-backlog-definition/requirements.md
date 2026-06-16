# Requirements: Definição e Priorização do Product Backlog

> Identificador: `011-product-backlog-definition`
> Data: `2026-06-15`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta feature consolida a definição estruturada do product backlog da plataforma Alfabra Vector para os próximos incrementos. O objetivo é identificar, priorizar e sequenciar as funcionalidades que faltam implementar, transitando gradualmente de um estado altamente mockado no frontend para um sistema com dados reais persisti dos no backend. O resultado será um conjunto de requisitos claros, sequenciados e prontos para execução iterativa via `/reversa-forward`.

## 2. Contexto a partir do legado

As seguintes referências do `_reversa_sdd/` sustentam esta feature:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#3. Padrões de Integração e Comunicação` | O sistema possui um pipeline de ingestão (Ingestion Worker) que processa documentos de forma assíncrona via HTTP REST aos microsserviços `document-processing` e `embedding-service`. | 🟢 |
| `_reversa_sdd/domain.md#2.2. Pipeline RAG e Processamento` | Todas as chunks de documentos devem possuir embeddings com dimensionalidade parametrizável e compatível com o modelo de embeddings configurado; buscas vetoriais via similaridade de cosseno. | 🟢 |
| `_reversa_sdd/domain.md#2.1. Controle de Acesso (RBAC)` | O sistema implementa dois papéis fundamentais (ROLE_ADMIN e ROLE_USER), sendo que o admin possui acesso total e o usuário comum está restrito a leitura e envio de documentos. | 🟢 |
| `_reversa_sdd/inventory.md#Pontos de Entrada da Aplicação` | Frontend em Next.js com features mockadas em `frontend/src/features/` para documents, chat, rag, users; backend em Java (Spring Boot) e microserviços em Rust já implementados. | 🟢 |
| `_reversa_sdd/architecture.md#4. Dívidas Técnicas Identificadas` | Sistema conta com 10 features já implementadas no forward pipeline; ausência de testes automatizados e dependência crítica de API LLM externa sem fallback ainda presente. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| **Product Owner / Gestor** | Definir prioridade e sequência executável das features faltantes | Revisar o backlog, entender dependencies entre features, aprovar a roadmap de implementação |
| **Desenvolvedor Backend** | Implementar as features em ordem sequencial respeitando dependências | Receber requirements claros e estruturados via `/reversa-requirements` para cada feature de forma incremental |
| **Desenvolvedor Frontend** | Migrar componentes mockados para consumir APIs reais do backend | Ter clareza sobre quais APIs estarão disponíveis e em qual ordem, para planejar integração |
| **Admin da Plataforma** | Gerenciar agentes, visualizar logs, controlar acesso de usuários | Ter interfaces funcionais para criar novos agentes, visualizar histórico de ações e gerenciar permissões |
| **Usuário Final** | Fazer upload de documentos, consultar RAG, gerenciar conversas | Ter fluxo completo funcional: upload → processamento → busca semântica → chat contextualizado |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Nova):** Sequenciamento Executável do Backlog. O product backlog será declarado em formato estruturado de features, cada uma com requisitos funcionais, dependências explícitas e prioridade (MoSCoW), permitindo execução iterativa sem bloqueios. 🟢
   - Tipo: nova

2. **RN-02 (Nova):** Manutenção de Estado Mockado no Frontend Durante Transição. Enquanto features de backend estão sendo implementadas, o frontend continuará exibindo dados mockados em componentes não-críticos, reduzindo acoplamento entre times e permitindo desenvolvimento paralelo. 🟡
   - Tipo: nova

3. **RN-03 (Alterada):** Prioridade do Upload de Documentos. Upload e processamento de documentos passa para posição 1 na sequência (feature 012), pois é prerequisito para múltiplas features subsequentes (RAG, busca semântica, histórico). 🟢
   - Origem no legado: `_reversa_sdd/domain.md#2.2` (DR03, DR04, DR05)
   - Tipo: alterada (re-priorizada)

4. **RN-04 (Alterada):** Criação de Agentes pelo Admin. A funcionalidade de criar agentes (atualmente mockada no catálogo) passa para posição 2 na sequência (feature 013), permitindo que usuários customizem o comportamento da IA. 🟡
   - Tipo: alterada

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Consolidação Estruturada do Backlog | Must | Documento requirements.md listando mínimo 5 features priorizadas com MoSCoW, dependências e estimativas de esforço | 🟢 |
| RF-02 | Sequência Sem Bloqueios Críticos | Must | Cada feature do backlog pode ser iniciada dentro de no máximo 2 features de diferença sem ficto bloqueada por dependência externa | 🟡 |
| RF-03 | Mapeamento de Dependências Entre Features | Must | Tabela clara mapeando qual feature depende de qual, com justificativa técnica | 🟢 |
| RF-04 | Estimativas de Esforço T-Shirt | Should | Cada feature estimada em Small, Medium, Large ou XL baseada em task count e complexidade identificada | 🟡 |
| RF-05 | Identificação de Quick Wins | Should | Marcar features que podem ser executadas em paralelo e não dependem uma da outra | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Governança | Backlog deve ser rastreável e auditável no `.reversa/` | Permite histórico de decisões e mudanças de prioridade ao longo do tempo | 🟢 |
| Alinhamento | Backlog deve estar em linha com principles.md do projeto (quando existir) | Garante coerência com visão estratégica | 🟡 |
| Clareza | Cada feature deve ter máximo 3 marcadores `[DÚVIDA]` no seu requirements | Evita requisitos vagos que bloqueiem a implementação | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Backlog Consolidado e Priorizado
  Dado que o product owner quer planejar os próximos incrementos
  Quando revisar o documento `requirements.md` da feature 011
  Então deve conter listagem de 5+ features com identificador, nome, descrição curta, prioridade MoSCoW e sequência esperada

Cenário: Dependências Mapeadas
  Dado que um desenvolvedor quer iniciar uma nova feature
  Quando consultar a tabela de dependências da feature 011
  Então deve identificar claramente quais features precisam estar prontas antes e quais podem rodar em paralelo

Cenário: Sem Bloqueio Crítico
  Dado que duas features diferentes desejam começar
  Quando verificar suas dependências
  Então nenhuma das duas estará completamente bloqueada (máximo 1 nível de dependência transitiva)

Cenário: Quick Wins Identificados
  Dado que o time deseja paralelizar o trabalho
  Quando consultar o backlog
  Então há identificação clara de features que podem rodar em paralelo sem risco de conflito
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Sem backlog consolidado, não há clareza de roadmap e risco de desperdício de esforço |
| RF-02 | Must | Bloqueios críticos inviabilizam execução paralela e criam gargalos |
| RF-03 | Must | Falta de mapeamento de dependências resulta em surpresas e retrabalho durante a implementação |
| RF-04 | Should | Estimativas permitem planejamento de recursos mas não são absolutas para início |
| RF-05 | Should | Quick wins aceleram entrega de valor mas não são prerequisito para começar |

## 9. Esclarecimentos

> **Nenhuma sessão de dúvidas registrada ainda.** Rode `/reversa-clarify` quando houver `[DÚVIDA]` pendente.

## 10. Lacunas e Observações

Esta feature é **meta-feature** de planejamento. Seu output principal será a identificação e sequenciamento das features concretas que virão em 012, 013, 014, etc. Portanto, o próximo passo natural após `/reversa-plan` é **iniciar iterativamente** a primeira feature concreta (012) via `/reversa-requirements` com a descrição do primeiro item do backlog.

**Backlog Preliminar Consolidado (baseado na conversa):**

1. **012 - Document Upload & RAG Integration**
   - Upload de documentos pelo frontend → Processamento no backend → Embedding via Rust → Persistência com pgvector
   - Depends on: Nenhuma (base)
   - Priority: Must | Size: Large
   - Razão: Prerequisito para todas as features de RAG e busca semântica

2. **013 - Agent Creation by Admin**
   - Admin cria novos agentes via interface do frontend → Persistência em BD relacional → Listagem para usuários
   - Depends on: Nenhuma (paralela a 012)
   - Priority: Must | Size: Medium
   - Razão: Permite customização central; não depende de uploads de documentos

3. **014 - Crew Worker Integration with Agent Selection**
   - Interface de seleção de agente no chat frontend → Envia escolha para crew-worker Python → Worker usa agente para processar
   - Depends on: 012 (RAG), 013 (agentes disponíveis)
   - Priority: Must | Size: Large
   - Razão: Depende de embeddings (012) e agentes (013) estarem funcionando

4. **015 - Chat History & Management**
   - Usuário cria novo chat, acessa histórico, deleta chats antigos
   - Depends on: Nenhuma (interface relacional)
   - Priority: Should | Size: Medium
   - Razão: Paralela a 012 e 013; melhora UX mas não bloqueia core

5. **016 - Additional Features Brainstorming** (Sugestões)
   - Sugestões adicionais identificadas durante a conversa ou workshops posteriores
   - Priority: Nice to Have | Size: TBD
   - Razão: A ser definido conforme feedback

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-15 | Versão inicial gerada por `/reversa-requirements` consolidando product backlog | reversa |

---

**PRÓXIMOS PASSOS:**
1. Rode `/reversa-plan` para definir a abordagem de execução dessa meta-feature (governança de backlog, rastreamento, etc.)
2. Após concluir 011, inicie a feature 012 com `/reversa-requirements "Document Upload & RAG Integration"`
3. As features 012 e 013 podem começar em paralelo (sem dependências mútuas)
4. Features 014 e 015 podem começar depois de 012 estar em estágio avançado (roadmap pronto)
