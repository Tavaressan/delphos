# Regression Watch: GCP Authentication for Rust Services

> Identificador da feature: `008-google-ai-auth`

## 1. Tabela de Watch Items

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|--------------------------|-----------------------------|---------------------|-------------------|
| W001 | `_reversa_sdd/domain.md#22-pipeline-rag-e-processamento` | O `embedding-service` deve autenticar chamadas Vertex AI usando tokens OAuth2 dinâmicos gerados via conta de serviço GCP (`GOOGLE_APPLICATION_CREDENTIALS`). | presença | O código voltar a utilizar chaves estáticas (`VERTEX_AI_API_KEY`) ou não utilizar o `GcpAuthenticator` compartilhado. |

## 2. Histórico de re-extrações

*Nenhuma re-extração registrada ainda.*

## 3. Arquivadas

*Nenhuma regra arquivada.*

## 4. Observações

*Nenhuma observação de confidência 🟡 ou 🔴 associada.*

### Re-extração 2026-07-15 11:00

| ID | Veredito | Observação |
|----|----------|------------|
|  W001  | 🟢 verde | preservado |
