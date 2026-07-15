# Plano de Exploração — Alfabra-Vector

> Criado pelo Reversa em 2026-06-02
> Marque cada tarefa com ✅ quando concluída.
> Você pode editar este plano antes de iniciar: adicione, remova ou reordene tarefas conforme necessário.

---

## Fase 1: Reconhecimento 🔍

- [x] **Scout** — Mapeamento de estrutura de pastas e tecnologias
- [x] **Scout** — Análise de dependências e gerenciadores de pacotes
- [x] **Scout** — Identificação de entry points, CI/CD e configurações

## Decisão de organização das specs 🗂️

> Entre o Scout e o Arqueólogo, o Reversa pergunta como você quer organizar as specs (por módulo, caso de uso, endpoint, híbrida, por features ou customizada). A escolha fica persistida em `.reversa/config.toml` na seção `[specs]` e não será reperguntada em execuções futures. Para reapresentar o menu, remova manualmente a seção.

## Fase 4: Geração 📝

- [x] **Writer** — Geração de `requirements.md` e `design.md` para o módulo `frontend`
- [x] **Writer** — Geração de `requirements.md` e `design.md` para o módulo `java-core`
- [x] **Writer** — Geração de `requirements.md` e `design.md` para o módulo `rust-services`
- [x] **Writer** — Geração de `requirements.md` e `design.md` para o módulo `python-services`
- [x] **Writer** — Geração de specs para o módulo `infrastructure`
- [x] **Arqueólogo** — Análise do módulo `infrastructure`

## Fase 3: Interpretação 🧠

- [x] **Detetive** — Extração de regras de negócio, ADRs retroativos e matriz de permissões
- [x] **Arquiteto** — Sintetização da arquitetura, C4 model e Spec Impact Matrix
- [x] **Arquiteto** — ERD completo e integrações externas

## Fase 4: Geração 📝

- [ ] **Redator** — Specs SDD por componente
- [ ] **Redator** — OpenAPI (se aplicável)
- [ ] **Redator** — User Stories (se aplicável)
- [ ] **Redator** — Code/Spec Matrix

## Fase 5: Revisão ✅

- [x] **Revisor** — Revisão cruzada de specs
- [x] **Revisor** — Resolução de lacunas com o usuário
- [x] **Revisor** — Relatório de confiança final

---

## Agentes Independentes

- [ ] **Visor** — Análise de interface via screenshots
- [ ] **Data Master** — Análise completa do banco de dados
- [ ] **Design System** — Extração de tokens de design
- [ ] **Tracer** — Análise dinâmica (requer sistema acessível)
