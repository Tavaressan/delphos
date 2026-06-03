# Investigation: Estrutura de Módulos e Compartimentação em Rust

> Identificador: `002-embedding-refactor`
> Data: `2026-06-02`

## 1. Contexto Técnico

No ecossistema Rust, a concentração de código em um único arquivo `main.rs` (como se encontra atualmente no `embedding-service`, com mais de 800 linhas) é considerada um anti-padrão de manutenibilidade à medida que o serviço cresce. Rust provê um sistema de módulos robusto para separar preocupações, permitindo o isolamento de lógica de negócio, infraestrutura de rede, tratamento de erros e configuração.

## 2. Alternativas Estruturais Avaliadas

### Alternativa A: Workspace Cargo com múltiplos Crates Locais (Descartada)
- **Descrição:** Dividir a trait `EmbeddingProvider` e suas implementações em um crate de biblioteca local (ex. `libs/embedding-providers`) e manter o binário em outro crate.
- **Prós:** Isolamento físico rígido, facilita o compartilhamento de provedores com outros workers no futuro.
- **Contras:** Introduz complexidade excessiva de gerenciamento de dependências no monorepo e dificulta o ciclo de desenvolvimento rápido neste momento do projeto.

### Alternativa B: Estrutura de Módulos Padrão Rust (Escolhida)
- **Descrição:** Manter um único crate binário no Cargo, mas organizar o código em submódulos (`src/config.rs`, `src/providers/`, `src/api/`, etc.) e registrá-los no `main.rs` usando a declaração `mod`.
- **Prós:** Padrão altamente idiomático em Rust, mantém toda a lógica no mesmo crate facilitando o uso de ferramentas de automação e compilação rápida, além de ser facilmente replicável para os demais workers.
- **Contras:** Nenhum contra significativo identificado para o tamanho atual do serviço.

## 3. Padrões Aplicáveis de Módulos (Rust 2018+)

No Rust moderno, a organização de subdiretórios usa o padrão de arquivo `mod.rs` ou arquivos adjacentes:

```
src/
├── main.rs
├── config.rs
├── error.rs
├── api/
│   ├── mod.rs
│   ├── contracts.rs
│   └── handlers.rs
└── providers/
    ├── mod.rs
    ├── mock.rs
    ├── openai.rs
    ├── voyage.rs
    ├── cohere.rs
    ├── vertex_ai.rs
    └── resilient.rs
```

### Regras de Organização
- **Visibilidade:** Usar `pub` e `pub(crate)` criteriosamente para expor apenas os contratos necessários.
- **Padrão de Re-exportação (Re-exporting):** No `providers/mod.rs` ou `api/mod.rs`, usar `pub use` para expor structs limpas para o exterior, escondendo a estrutura interna de arquivos (ex: `pub use mock::MockEmbeddingProvider`).
- **Tokio & Axum State:** Manter `AppState` compartilhado via `Arc` no módulo `api` e expor rotas limpas via `Router`.

## 4. Referências Externas
- [The Rust Programming Language - Modules Chapter](https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html)
- [Axum Documentation - State Sharing and Handlers](https://docs.rs/axum/latest/axum/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
