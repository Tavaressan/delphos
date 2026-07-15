# Dúvidas Pendentes (Questions)

1. **Autenticação (Frontend/Java)**: Como funciona a camada de autenticação? É utilizado NextAuth.js na UI repassando um JWT para o Spring Security? As Roles (ex: ROLE_ADMIN) vêm embarcadas neste token?
   - **Resposta**: Não temos autenticação ainda, está no roadmap. (Reclassificado para 🟢 Autenticação ausente/prevista).
2. **SSE Timeout no Gateway**: Se um worker morrer de forma silenciosa e não devolver o evento de 'Finished' ou 'Failed', como é resolvido o cleanup do `SseEmitter` preso em memória no `ExecutionController`?
   - **Resposta**: Não sei. (Reclassificado para 🟡 Aguardando investigação).
3. **Escalabilidade Rust**: Os processos do `workflow-worker` e do `rag-worker` rodam no mesmo binário/loop Tokio dentro de um único Pod em produção, ou são isolados?
   - **Resposta**: São instanciados em containeres diferentes; o repo é todo containerizado. (Reclassificado para 🟢 Resolvido).
4. **Scripts Avulsos**: Os arquivos `demo_agents.py` e `test_models.py` são estritamente para testes/dev locais e podem ser classificados como Fora do Escopo?
   - **Resposta**: São para testes e validação, prova de conceito. Pode manter fora do escopo. (Reclassificado para 🟢 Fora do Escopo).
