# Backlog — Alfabra-Vector

> Gerenciado por reversa-backlog. Cada item vira uma feature ao ser promovido para `/reversa-requirements`.
> Última atualização: 2026-06-19T07:10:00Z

## Items

| Pos | ID | Feature | Prioridade | Adicionado |
|-----|----|---------|-----------:|------------|
| 1 | BL-002 | JWT/RBAC — Implementação pós-PoC (intencional durante validação pelo superior; SecurityConfig.permitAll() é decisão estratégica) | ⏳ | 2026-06-19 |
| 2 | BL-003 | Redis cache de embeddings e system_instructions — dependência declarada sem uso; agrupa cache query→vetor e agent.systemInstructions | 🟡 | 2026-06-19 |
| 3 | BL-004 | Multi-tenancy completo — tenant_id ausente em agent_executions e audit_logs; requer migrations Flyway V6 e V7 | 🟡 | 2026-06-19 |
| 4 | BL-006 | Completar parser de documentos — .docx via docx-rs, .md via pulldown-cmark; tudo não-PDF tratado como texto plano | 🟢 | 2026-06-19 |
| 5 | BL-007 | Estados fantasma em agent_executions — DISPATCHED, WAITING_TOOL e CANCELLED definidos no schema V2 sem implementação nos workers | 🟢 | 2026-06-19 |
