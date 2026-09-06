# Perguntas para Validação — Alfabra-Vector

> Gerado pelo Revisor em 2026-08-26
> Todas as perguntas desta sessão foram respondidas e as especificações foram atualizadas.

---

## Pergunta 1

**Contexto:** Segurança e Sessões (Java Core)
**Spec afetada:** `_reversa_sdd/nucleo-java/design.md`
**Pergunta:** O código atual do `SecurityConfig` libera tudo com `permitAll()`, ignorando a estrutura de JWT/RBAC existente no banco. Além disso, o Redis não está sendo usado para gerenciar sessões/SSE. Devemos documentar a implementação dessas travas de segurança como um requisito imediato/bloqueante, ou mantemos como dívida técnica para o próximo ciclo?
**Impacto:** Define se a falta de segurança bloqueia o design atual ou é registrada como tech debt.

`✅ Respondida`
**Resposta do Usuário:** Dívida técnica.
**Ação:** Lacuna reclassificada para 🟢. Documentado em `nucleo-java/design.md` que a ausência de JWT/RBAC ativo e uso do Redis é uma dívida técnica aceita para o próximo ciclo, mantendo o design stateful.

---

## Pergunta 2

**Contexto:** Mensageria e DLQ (Python e Rust)
**Spec afetada:** `_reversa_sdd/servicos-python/design.md` e `_reversa_sdd/servicos-rust/design.md`
**Pergunta:** No `crew-worker` (Python), uma falha dura (`os._exit(1)`) pode matar jobs paralelos se o `prefetch` do RabbitMQ for maior que 1. No `ingestion-worker` (Rust), falhas resultam em NACK sem ir para uma Dead Letter Queue (DLQ), sendo descartados silenciosamente. Devemos especificar `prefetch=1` e criação de DLQs obrigatórias no design de mensageria?
**Impacto:** Evita perda silenciosa de dados/jobs de processamento.

`✅ Respondida`
**Resposta do Usuário:** Sim.
**Ação:** Lacuna reclassificada para 🟢. Atualizadas as specs do Python e Rust exigindo `prefetch=1` obrigatório e configuração de Dead Letter Queues (DLQs) para tratar NACKs de falhas.

---

## Pergunta 3

**Contexto:** Limite de Memória em RAG (Rust)
**Spec afetada:** `_reversa_sdd/servicos-rust/design.md`
**Pergunta:** A ingestão de PDFs gigantescos não tem limite de memória explícito mapeado. Dependemos inteiramente do *OOM Killer* do Docker para derrubar o contêiner se estourar a RAM, ou devemos exigir limites rígidos de buffer/streaming no código Rust?
**Impacto:** Afeta a estabilidade dos workers durante ingestão pesada.

`✅ Respondida`
**Resposta do Usuário:** Podemos exigir limites, quero definir isso.
**Ação:** Lacuna reclassificada para 🟢. Incluída restrição rígida de RAM/buffer no código Rust para prevenir Memory Leaks proativamente no design.

---

## Pergunta 4

**Contexto:** Infraestrutura AWS
**Spec afetada:** `_reversa_sdd/infraestrutura/design.md`
**Pergunta:** O script de *Idle Stop* da EC2 tem histórico de desligar a máquina prematuramente (Issue #349). Aceitamos esse risco mapeado ou devemos especificar uma mudança na heurística (ex: via webhooks do GitHub Actions em vez de checar logs)?
**Impacto:** Resolve instabilidade na infraestrutura CI/CD.

`✅ Respondida`
**Resposta do Usuário:** Especificar mudança.
**Ação:** Lacuna reclassificada para 🟢. A especificação agora aponta que o Idle Stop deve usar webhooks ao invés de leitura de logs.

---

## Pergunta 5

**Contexto:** Cache de Frontend (Next.js)
**Spec afetada:** `_reversa_sdd/frontend/design.md`
**Pergunta:** O chat armazena o histórico em *Edge Cache* (via Next.js Data Cache) ou as requisições de conversa são sempre dinâmicas/diretas no backend (SSR/Server Components sem cache persistente)?
**Impacto:** Define a estratégia de cacheamento das conversas.

`✅ Respondida`
**Resposta do Usuário:** Creio que seja edge cache, mas são persistidas em volumes docker.
**Ação:** Lacuna reclassificada para 🟢. Adicionado ao design do frontend a persistência via Edge Cache integrada com Next.js Data Cache e armazenamento persistente em volume Docker.
