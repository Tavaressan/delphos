# Serviços Rust, Tarefas de Implementação

## Pré-requisitos
- [ ] Rust v1.75+ instalado e cargo ativo.
- [ ] Docker configurado para build multi-stage de imagens Rust.

---

## Tarefas

- [ ] **T-01: Setup do Workspace Cargo e Crate Compartilhado**
  - Origem no legado: `rust-services/Cargo.toml` / `rust-services/shared/src/lib.rs`
  - Critério de pronto: Configurar workspace Cargo. A função `common_utility` da lib `shared` deve compilar e ser importável por outros crates.
  - Confiança: 🟢 CONFIRMADO
  
- [ ] **T-02: Implementação do Document Processing Service**
  - Origem no legado: `rust-services/document-processing/src/main.rs`
  - Critério de pronto: Criar API Axum executando na porta 8000, servindo GET `/healthz` respondendo "OK" no corpo.
  - Confiança: 🟢 CONFIRMADO

- [ ] **T-03: Implementação do Embedding Service**
  - Origem no legado: `rust-services/embedding-service/src/main.rs`
  - Critério de pronto: Criar API Axum executando na porta 8000, servindo GET `/healthz` respondendo "OK" no corpo.
  - Confiança: 🟢 CONFIRMADO

- [ ] **T-04: Implementação do Ingestion Worker Daemon**
  - Origem no legado: `rust-services/ingestion-worker/src/main.rs`
  - Critério de pronto: Executar loop de heartbeat que imprime log no console a cada 60 segundos exatos utilizando sleep assíncrono Tokio.
  - Confiança: 🟢 CONFIRMADO

---

## Tarefas de Teste

- [ ] **TT-01: Teste de endpoints de saúde (/healthz)**
  - Validar se requisições HTTP GET nas rotas `/healthz` de ambos os serviços respondem com HTTP 200 e o payload "OK".
- [ ] **TT-02: Teste de logs de inicialização e heartbeat**
  - Validar se o daemon de ingestão imprime o log de inicialização e os batimentos subsequentes nos tempos estipulados de 60 segundos.
- [ ] **TT-03: Teste de compilação cruzada**
  - Rodar `cargo build --workspace` e garantir compilação limpa de todos os microsserviços.
