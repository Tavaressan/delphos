# Deploy do backend no Google Cloud Run (CD)

O frontend (Next.js) é hospedado na Vercel. Este documento cobre a pipeline de
CD (`.github/workflows/cd.yml`) que publica as imagens Docker do backend —
`java-core`, os 5 serviços em `rust-services/` e `python-services/crew-worker`
— no Artifact Registry e as implanta no Google Cloud Run.

## Fluxo da pipeline

1. `.github/workflows/ci.yml` roda em todo push para `master`/`main`.
2. Quando o CI conclui com sucesso, `cd.yml` é disparado via `workflow_run`
   (job `gate`). Pushes cujo CI falhou nunca chegam ao deploy.
3. O job `changes` reaplica o mesmo path-filter por módulo do job `changes`
   de `ci.yml` (`rust`, `java`, `python`), para só implantar os serviços cujo
   código mudou.
4. Cada módulo alterado roda um job de deploy dedicado (`deploy-java`,
   `deploy-rust` em matrix para os 5 serviços, `deploy-python`):
   - autentica no GCP via OIDC/Workload Identity Federation (sem chave de
     service account em texto plano);
   - builda e publica a imagem no Artifact Registry;
   - executa `gcloud run deploy` (via `google-github-actions/deploy-cloudrun`).
5. `workflow_dispatch` permite rodar a pipeline manualmente, com
   `dry_run: true` (default) — builda/publica a imagem e valida a
   autenticação, mas pula o `gcloud run deploy` real. Use isso para validar a
   pipeline em staging antes de confiar no disparo automático via
   `workflow_run` em produção.

## Pré-requisitos de setup no GCP

1. **Projeto GCP** dedicado (ou existente) com as APIs habilitadas:
   `run.googleapis.com`, `artifactregistry.googleapis.com`,
   `iamcredentials.googleapis.com`.
2. **Artifact Registry**: um repositório Docker (`ARTIFACT_REGISTRY_REPO`) na
   região escolhida (`GCP_REGION`), ex.:
   ```bash
   gcloud artifacts repositories create alfabra-vector \
     --repository-format=docker --location=<GCP_REGION>
   ```
3. **Workload Identity Federation (WIF)** para autenticação OIDC do GitHub
   Actions, sem chave JSON de service account:
   ```bash
   gcloud iam workload-identity-pools create github-actions-pool \
     --location=global

   gcloud iam workload-identity-pools providers create-oidc github-actions-provider \
     --location=global --workload-identity-pool=github-actions-pool \
     --issuer-uri="https://token.actions.githubusercontent.com" \
     --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
     --attribute-condition="assertion.repository=='<org>/Alfabra-Vector'"
   ```
4. **Service account de deploy** com os papéis mínimos e vinculada ao pool
   WIF acima (`roles/iam.workloadIdentityUser`):
   - `roles/run.admin` (deploy no Cloud Run)
   - `roles/artifactregistry.writer` (push de imagens)
   - `roles/iam.serviceAccountUser` (permitir que o Cloud Run assuma a
     service account de runtime dos serviços)
5. **Secret Manager**: credenciais sensíveis de runtime (URLs internas dos
   demais serviços, credenciais de PostgreSQL/Redis/RabbitMQ/MinIO) **não são
   hardcoded no workflow**. Cadastre-as no Secret Manager e vincule-as ao
   serviço Cloud Run (via `--set-secrets` no `gcloud run deploy`, configurado
   no console/CLI do serviço ou como `secrets:` do action
   `deploy-cloudrun`) — nunca como `env:` estático no `cd.yml`.

## Configuração no GitHub

**Repository variables** (`Settings → Secrets and variables → Actions → Variables`):

| Nome | Descrição |
|---|---|
| `GCP_PROJECT_ID` | ID do projeto GCP |
| `GCP_REGION` | Região do Artifact Registry / Cloud Run (ex.: `us-central1`) |
| `ARTIFACT_REGISTRY_REPO` | Nome do repositório Docker no Artifact Registry |
| `CLOUD_RUN_SERVICE_JAVA_CORE` | Nome do serviço Cloud Run do `java-core` (opcional, default `java-core`) |
| `CLOUD_RUN_SERVICE_CREW_WORKER` | Nome do serviço Cloud Run do `crew-worker` (opcional, default `crew-worker`) |

**Repository secrets** (`Settings → Secrets and variables → Actions → Secrets`):

| Nome | Descrição |
|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Resource name completo do provider WIF (`projects/.../workloadIdentityPools/.../providers/...`) |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | E-mail da service account de deploy |

Nenhuma chave privada de service account (JSON) deve ser armazenada como
secret — a autenticação é sempre via OIDC.

## Serviços sem ingress HTTP

`ingestion-worker` e `workflow-worker` operam por polling
(PostgreSQL/RabbitMQ), não por requisições HTTP. Ao configurar o serviço
Cloud Run correspondente, use ingress interno e `min-instances >= 1` (para
evitar scale-to-zero interromper o polling) ou avalie migrá-los para
[Cloud Run Jobs](https://cloud.google.com/run/docs/create-jobs) em vez de
serviços — o workflow builda e publica a imagem da mesma forma; a decisão de
serviço vs. job é feita na configuração do recurso Cloud Run, fora do
`cd.yml`.

## Validação (teste)

Antes de habilitar o disparo automático em produção, valide a pipeline via
`workflow_dispatch` com `dry_run: true` (default) — confirme nos logs que a
autenticação OIDC, o build e o push das imagens funcionam, sem que nenhum
`gcloud run deploy` real seja executado. Só então promova para produção
alterando `dry_run: false` numa execução manual explícita ou confiando no
disparo automático via `workflow_run`.

Localmente, a validação estática (sintaxe YAML + presença de OIDC, triggers e
jobs de deploy por módulo) pode ser conferida com:

```bash
python3 scripts/validate-cd-workflow.py
```
