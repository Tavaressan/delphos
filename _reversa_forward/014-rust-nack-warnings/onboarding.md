# Onboarding: Solução de Warnings Rust (nack options)

> Identificador: `014-rust-nack-warnings`
> Data: `2026-06-17`

Este documento guia o desenvolvedor ou o revisor nos passos de validação técnica das correções de warnings de compilação nos microsserviços Rust da plataforma Alfabra Vector.

## 1. Pré-requisitos

1. Ter o compilador Rust (`rustc` e `cargo`) instalado no ambiente de desenvolvimento local.
2. Possuir acesso ao repositório do projeto.

## 2. Passos para Validação das Correções

### Passo 1: Obter as últimas modificações do repositório
Certifique-se de estar na branch correspondente a esta feature e com o código atualizado.

### Passo 2: Executar checagem estática no compilador
Navegue até a pasta dos microsserviços em Rust:

```bash
cd rust-services
cargo check
```

*   **Comportamento esperado antes do fix:** O compilador pode alertar ou clippy reportar warnings relacionados a `needless_update` na inicialização de `BasicNackOptions`.
*   **Comportamento esperado após o fix:** O comando de compilação deve finalizar sem apresentar nenhum warning referente aos arquivos `rabbitmq.rs` ou `main.rs` modificados.

### Passo 3: Executar testes unitários do Workspace Rust
Ainda na pasta `rust-services`, execute os testes unitários disponíveis para garantir que nenhuma regressão foi introduzida:

```bash
cargo test
```

A execução de todos os testes unitários e de integração deve concluir com sucesso (`test result: ok`).
