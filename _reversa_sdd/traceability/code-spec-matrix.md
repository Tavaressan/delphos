# Code-Spec Matrix

Esta matriz rastreia como as especificações das Units mapeiam o código legado do Alfabra-Vector.
Isso garante a comprovação de que o time revisou todas as pastas de código-fonte primárias.

| Arquivo/Diretório do Legado | Unit Correspondente | Cobertura | Confiança |
|-----------------------------|---------------------|-----------|-----------|
| `frontend/src/app/*` | `frontend` | 🟢 | 🟢 |
| `frontend/src/utils/apiClient.ts` | `frontend` | 🟢 | 🟢 |
| `frontend/next.config.js` | `frontend` e `infraestrutura` | 🟢 | 🟢 |
| `java-core/src/main/java/com/company/core/*` | `nucleo-java` | 🟢 | 🟢 |
| `java-core/src/test/resources/features/*` | `nucleo-java` | 🟡 (Parcial)| 🟡 |
| `rust-services/ingestion-worker/*` | `servicos-rust` | 🟢 | 🟢 |
| `rust-services/rag-worker/*` | `servicos-rust` | 🟢 | 🟢 |
| `rust-services/workflow-worker/*` | `servicos-rust` | 🟡 (Lacuna)| 🔴 |
| `rust-services/embedding-service/*` | `servicos-rust` | 🟢 | 🟢 |
| `python-services/crew-worker/*` | `servicos-python` | 🟢 | 🟢 |
| `docker-compose.yml` | `infraestrutura` | 🟢 | 🟢 |
| `.github/workflows/*` | `infraestrutura` | 🟢 | 🟢 |

**Observação de Lacunas (🔴):** 
O `workflow-worker` no Rust (DAG) foi inferido arquiteturalmente através dos Pull Requests (PR #308), mas os fluxos e tipos exatos de DAG consumíveis ainda precisam ser decifrados, o que reflete na cor amarela de cobertura na Unit `servicos-rust`.
