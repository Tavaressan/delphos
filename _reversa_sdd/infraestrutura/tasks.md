# Infraestrutura, Tarefas de Implementação

## Tarefas

- [ ] T-01, Estruturar `docker-compose.yml` raiz.
  - Origem no legado: Arquivo `docker-compose.yml` da pasta mãe.
  - Critério de pronto: O comando `docker-compose up` levanta RabbitMQ, PostgreSQL (com pgvector), Minio (S3 local), o Gateway Java e os workers Rust/Python num network alias válido para ambiente Dev.
  - Confiança: 🟢

- [ ] T-02, Provisionar IAM e Federated Identity OIDC na AWS.
  - Origem no legado: Integração GitHub Actions e EC2.
  - Critério de pronto: GH Actions detém um `Role ARN` atrelado ao thumbprint do Github OIDC para instanciar a EC2 via AWS CLI sem armazenar `AWS_ACCESS_KEY_ID` fixo.
  - Confiança: 🟢

- [ ] T-03, Migrar o CI gate do Monorepo pra Turborepo.
  - Origem no legado: Remoção do pacote obsoleto `dorny/paths-filter` trocando pra chamadas `npx turbo run --filter=...`
  - Critério de pronto: Apenas diretórios com diff (ex. mexeu em `java-core`) devem acionar steps relacionados ao Java Core no Pipeline.
  - Confiança: 🟢

- [ ] T-04, Ajustar Workdir e Network no Worker Auto-hosted (EC2).
  - Origem no legado: Fix de CI `#354` e `#356`.
  - Critério de pronto: O runner deve usar `--network host` para bater no host bridge, e montar o workdir com paths compatíveis para o Docker-out-of-Docker da EC2 achar os artefatos Rust gerados nativamente.
  - Confiança: 🟢

## Ordem Sugerida
1. T-01 (Mínimo local viável para desenvolvedores testarem de cabo-a-rabo).
2. T-03 (Turbo repo rules agiliza a construção dos PRs iniciais).
3. T-02 e T-04 (Infra avançada de AWS EC2 para Rust, essencial antes de um freeze da arquitetura e releases robustos).
