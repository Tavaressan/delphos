# Plano de Exploração — enterprise_rag_platform

> Criado pelo Reversa em 2026-06-02
> Marque cada tarefa com ✅ quando concluída.
> Você pode editar este plano antes de iniciar: adicione, remova ou reordene tarefas conforme necessário.

---

## Fase 1: Reconhecimento 🔍

- [ ] **Scout** — Mapeamento de estrutura de pastas e tecnologias
- [ ] **Scout** — Análise de dependências e gerenciadores de pacotes
- [ ] **Scout** — Identificação de entry points, CI/CD e configurações

## Decisão de organização das specs 🗂️

> Entre o Scout e o Arqueólogo, o Reversa pergunta como você quer organizar as specs (por módulo, caso de uso, endpoint, híbrida, por features ou customizada). A escolha fica persistida em `.reversa/config.toml` na seção `[specs]` e não será reperguntada em execuções futures. Para reapresentar o menu, remova manualmente a seção.

## Fase 2: Escavação 🏗️

- [ ] **Arqueólogo** — Análise do módulo `frontend`
- [ ] **Arqueólogo** — Análise do módulo `java-core`
- [ ] **Arqueólogo** — Análise do módulo `rust-services`
- [ ] **Arqueólogo** — Análise do módulo `python-services`
- [ ] **Arqueólogo** — Análise do módulo `infrastructure`
- [ ] **Arqueólogo** — Análise do módulo `anythingllm`

## Fase 3: Interpretação 🧠

- [ ] **Detetive** — Arqueologia Git e ADRs retroativos
- [ ] **Detetive** — Regras de negócio implícitas e máquinas de estado
- [ ] **Detetive** — Matriz de permissões (RBAC/ACL)
- [ ] **Arquiteto** — Diagramas C4 (Contexto, Containers, Componentes)
- [ ] **Arquiteto** — ERD completo e integrações externas
- [ ] **Arquiteto** — Spec Impact Matrix

## Fase 4: Geração 📝

- [ ] **Redator** — Specs SDD por componente
- [ ] **Redator** — OpenAPI (se aplicável)
- [ ] **Redator** — User Stories (se aplicável)
- [ ] **Redator** — Code/Spec Matrix

## Fase 5: Revisão ✅

- [ ] **Revisor** — Revisão cruzada de specs
- [ ] **Revisor** — Resolução de lacunas com o usuário
- [ ] **Revisor** — Relatório de confiança final

---

## Agentes Independentes

- [ ] **Visor** — Análise de interface via screenshots
- [ ] **Data Master** — Análise completa do banco de dados
- [ ] **Design System** — Extração de tokens de design
- [ ] **Tracer** — Análise dinâmica (requer sistema acessível)
