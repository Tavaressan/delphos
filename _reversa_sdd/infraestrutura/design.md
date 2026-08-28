# Infraestrutura (CI/CD), Design Técnico

## Fluxo Principal (Pipeline CI - GitHub Actions)
1. **Gatilho**: Push na branch master ou Pull Request (não-draft).
2. **Setup Runner**: 
   - Script analisa as _labels_ do PR e _paths_ afetados (via Turborepo).
   - Se for um pacote Rust puro, chama a _OIDC_ na AWS, acorda a instância EC2. O Worker da EC2 puxa o job GitHub.
3. **Build & Test**:
   - `frontend`: Deno test + Playwright UI.
   - `java-core`: Gradle Build e JUnit. O ambiente no runner puxa um `postgres` e `rabbitmq` efêmeros em portas randômicas (Issue #378) pra testes de Integração Testcontainers.
   - `rust-services`: `cargo clippy`, `cargo test` num container builder pinado.
   - `python-services`: `pytest` no sandbox mockado.
4. **Security Scan**:
   - CodeQL roda análise estática SAST (injetando SARIF).
   - Trivy faz scan de vulnerabilidades nas dependências e base images.
5. **Publish**:
   - Docker buildx compila e pusha para `ghcr.io` como `latest` (na branch master) ou `pr-XXX`.
6. **CD (Opcional)**:
   - Se o deploy estiver liberado para Cloud Run, as imagens do GHCR são puxadas lá usando Cloud Build ou `gcloud run deploy` direto da pipeline.
7. **Cleanup**: Instância EC2 recebe script de *idle stop* e entra em hibernação/stop automático.

## Dependências
- **GitHub Actions**: Orquestrador YAML.
- **AWS OIDC Provider**: Configuração federada de acesso para boot do EC2 sem hardcoded secrets.
- **Docker Compose / Docker Buildx**: Ferramentas de mount nativas.
- **Turborepo**: Engine Javascript de Monorepo (migrado para substituir actions nativas e acelerar diff de diretórios afetados).

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Fallback dinâmico GitHub-hosted vs EC2 | `.github/workflows` / Script Bash | 🟢 |
| Montagem local de Workdir no EC2 via Docker-out-of-Docker (DooD) | Parametros da EC2 action | 🟢 |
| Rede `--network host` para o Runner | ADR-like git commit (Issue #356) | 🟢 |
| Prevenção de scans caros do Trivy em PRs de Draft | Gate lógico de Job | 🟢 |

## Riscos e Lacunas
- 🟢 Para evitar o desligamento prematuro do runner EC2 (Issue #349), a heurística de _Idle Stop_ será modificada para utilizar uma abordagem arquitetural baseada em webhooks (ex: eventos do GitHub Actions) ao invés da leitura frágil de logs/uptime.
- 🟡 Falta rastreabilidade de como o `GOOGLE_AI_STUDIO_API_KEY` trafega do secrets do github para a release no GCP (suspeita-se mapeamento manual via Vault ou GCP Secret Manager).
