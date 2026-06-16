# Regression Watch: CI Pipeline Optimization & Security Hardening (Defense in Depth)

> Identificador da feature: `013-ci-security-hardening`

## 1. Tabela de Regression Watch

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|
| W001 | `_reversa_sdd/domain.md#2.2.-pipeline-rag-e-processamento` | Os uploads de documentos na API devem passar por validação de Magic Bytes via Apache Tika e scan de vírus via ClamAV. | presença | Arquivos com assinatura executável renomeados são indexados ou falha no ClamAV não bloqueia a ingestão. |
| W002 | `_reversa_sdd/domain.md#2.1.-controle-de-acesso-(rbac)` | Todo acesso a documentos, chunks e chats deve ser filtrado por `tenant_id` via header `X-Tenant-ID` e política de Row-Level Security no PostgreSQL. | presença | Consultas vetoriais ou relacionais retornam dados pertencentes a outros inquilinos ou aceitam requisições sem o header de tenant. |

---

## 2. Histórico de re-extrações

*Nenhuma re-extração registrada ainda.*

---

## 3. Arquivadas

*Nenhuma regra arquivada.*

---

## 4. Observações

*   A autenticação JWT de acesso e refresh tokens rotativos no Redis foram marcados como **postergados** nesta fase por decisão do usuário, e não farão parte da verificação de regressão ativa até sua futura implementação.
