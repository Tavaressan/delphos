# Code Spec Matrix

> Mapeamento de rastreabilidade entre Código e Specs.

| Arquivo do legado | Unit correspondente | Cobertura |
|---------|---------------------|-----------|
| `frontend/src/domain/entities/index.ts` | `frontend/` | 🟢 |
| `frontend/src/components/chat/` | `frontend/` | 🟡 |
| `java-core/src/main/java/.../ExecutionController.java` | `java-core/` | 🟢 |
| `java-core/src/main/resources/db/migration/` | `java-core/` | 🟢 |
| `python-services/crew-worker/src/runtime/crewai_adapter.py` | `python-services/` | 🟢 |
| `python-services/crew-worker/src/main.py` | `python-services/` | 🟢 |
| `rust-services/rag-worker/src/retrieval.rs` | `rust-services/` | 🟢 |
| `infrastructure/setup_firewall.sh` | `infrastructure/` | 🟢 |
| `docker-compose.yml` | `infrastructure/` | 🟢 |
| `python-services/crew-worker/src/demo_agents.py` | n/a | 🟢 Fora do Escopo |
| `python-services/crew-worker/src/test_models.py` | n/a | 🟢 Fora do Escopo |

> **Cobertura Estimada:** 85% dos core paths mapeados.
