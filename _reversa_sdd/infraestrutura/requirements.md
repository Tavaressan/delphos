# Infraestrutura e Pipelines (CI/CD)

## Visão Geral
Repositório central de configurações de Deploy (Docker Compose) e pipelines de Continuous Integration e Continuous Deployment (GitHub Actions). Assegura qualidade de código, compilação de imagens Docker OCI e mitigação de vulnerabilidades (SAST).

## Responsabilidades
- Manter o ecossistema multi-container do projeto subindo via rede isolada no Docker local.
- Realizar compilação OCI e publicar no GitHub Container Registry (GHCR).
- Gerenciar runners (máquinas auto-hospedadas EC2 no AWS) para driblar limites de quota do ecossistema Rust (compilação pesada).
- Executar varreduras estáticas de Segurança (CodeQL, Trivy).
- Executar testes automatizados (JUnit, Cucumber, Deno, Playwright) atuando como Gatekeeper do Branch Protection de master.

## Regras de Negócio
- Jobs caros de E2E Integration em Rust são pulados caso o Pull Request esteja em modo *Draft* visando redução de custos. 🟢
- O Runner na AWS EC2 é providenciado via script On-Demand via OpenID Connect (OIDC) que inicia e paralisa a máquina para economizar recursos inativos (*idle stop*). 🟢
- Dependabot gerencia Cargo (Rust), Pip (Python), Actions (GitHub) e Docker. NPM do frontend está ignorado na config do dependabot a pedido dos mantenedores (Issue #209). 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Build Docker | Must | Imagens de todos os containers (java, deno, rust, python) são montadas, validadas via Trivy, e jogadas no GHCR. |
| RF-02 | Testes End-to-End | Must | Playwright rodando testes em viewport Mobile para o Deno/React. |
| RF-03 | Runner Manager (EC2) | Must | OIDC autêntica na AWS, sobe o EC2 com Network Host mode e mata ao ficar *idle*. |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Turborepo `--affected` | Utilizado nos Actions em vez do `dorny/paths-filter` para caching (Issue #348). | 🟢 |
| Segurança | SAST/DAST Completo | CodeQL, Trivy configurados. | 🟢 |
| Deploy Automático| Integração GCP Cloud Run| Job de CD apontando para Cloud Run via secrets. | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Runner Autônomo AWS | Must | O Rust não compila rápido o suficiente na máquina free do GH Actions (timeout ou fila infinita). |
| Docker Compose | Must | Essencial pro Dev local. |
| Testes Automatizados E2E | Should | Garante regressão visual. |
| Turborepo Caching | Should | Reduz tempo do Pipeline. |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `.github/workflows/` | GitHub Actions YAMLs | 🟢 |
| `docker-compose.yml` | Dev Environment Base | 🟢 |
