# Roadmap: Multi-agent Orchestration — Delegação de tarefas entre agentes

> Identificador: `018-multi-agent-orchestration`
> Data: `2026-06-25`
> Requirements: `_reversa_forward/018-multi-agent-orchestration/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A abordagem escolhida adota comunicação assíncrona orientada a eventos para desacoplar o agente orquestrador (`crew-worker`) dos agentes especialistas (`rag-worker` e `workflow-worker`). O orquestrador usará o RabbitMQ para postar jobs de delegação em novas filas exclusivas, consumindo a resposta de forma assíncrona com timeout estrito de 4 segundos. As ferramentas disponíveis por agente serão descobertas dinamicamente pelo parser do manifesto de cadastro contido no ZIP (no `java-core` e propagado ao `crew-worker`). Em caso de falhas de comunicação, o `crew-worker` tentará até 3 vezes com backoff exponencial antes de acionar um fallback suave (uma resposta genérica indicando erro de ferramenta) para evitar a interrupção da execução do chat.

## 2. Princípios aplicados

Não há princípios ativos definidos no arquivo global de princípios. A feature segue a orientação padrão de robustez operacional e segurança.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | **Delegação via RabbitMQ Assíncrono** | Desacoplamento físico e de tempo de execução, garantindo resiliência da mensageria e consistência com os padrões de eventos do legado. | HTTP REST síncrono (descartado por alto acoplamento e suscetibilidade a falhas em cascata). | 🟢 |
| D-02 | **Manifesto ZIP de Cadastro para Habilitar Ferramentas** | Flexibilidade para os Tenants ativarem e parametrizarem ferramentas sob demanda sem necessidade de re-deploys ou alterações no banco. | Configuração estática persistida em tabelas de mapeamento no Spring Boot (descartada por rigidez estrutural). | 🟢 |
| D-03 | **Retry com Backoff e Fallback Silencioso** | Garante alta disponibilidade da conversação mesmo em instabilidades de rede internas, evitando frustração do usuário final. | Falha imediata da execução principal (descartada por falta de resiliência e baixa robustez). | 🟢 |

## 4. Premissas

Nenhuma premissa adotada a partir de dúvidas pendentes (todas as dúvidas foram sanadas no clarify).

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `crew-worker` | `_reversa_sdd/architecture.md#1` | componente-novo / regra-alterada | Implementar publicação e escuta nas novas filas de delegação RabbitMQ; parser do manifesto ZIP para registro de ferramentas CrewAI. |
| `rag-worker` | `_reversa_sdd/architecture.md#1` | contrato-novo / regra-alterada | Adicionar consumidor para a fila de busca vetorial delegada; realizar busca no pgvector e responder na fila de eventos. |
| `java-core` | `_reversa_sdd/architecture.md#1` | contrato-alterado | Adaptar `AgentService` para extrair a declaração de ferramentas do manifesto ZIP e registrar ou expor esses metadados. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Não há alterações estruturais em tabelas de negócio do PostgreSQL. O manifesto de ferramentas é lido do ZIP do MinIO. As execuções geradas de ferramentas são persistidas como `tool_calls` correlacionadas.
- Detalhe completo em: `_reversa_forward/018-multi-agent-orchestration/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| `agent.retrieval.delegated.jobs` | Fila RabbitMQ | `_reversa_forward/018-multi-agent-orchestration/interfaces/rabbitmq_delegation.md` |

## 8. Plano de migração

Não há dados legados a migrar. As novas filas e exchanges do RabbitMQ serão declaradas automaticamente na inicialização dos microsserviços.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Loops Infinitos de Delegação** (A delega para B, que delega para A) | alto | baixo | Implementação de cabeçalho `delegation_depth` iniciado em 0 e limitado a `max_depth = 1`. |
| **Latência Excessiva no RabbitMQ** (Fila lenta degradando tempo de resposta do Chat) | médio | médio | Definição de timeout de leitura assíncrona de no máximo 4 segundos nas ferramentas do `crew-worker`. |
| **Falta de Isolamento de Tenant** (Invasão de base de conhecimento de outro tenant) | alto | baixo | Validação estrita do campo `tenant_id` no payload do RabbitMQ comparando-o ao ID do job principal. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Testes unitários do parser de manifesto do ZIP implementados com cobertura ≥ 80%
- [ ] Teste de integração de delegação fim-a-fim simulado executado com sucesso no pipeline de CI
- [ ] `regression-watch.md` gerado documentando os pontos de integridade física

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-25 | Versão inicial gerada por `/reversa-plan` | reversa |
