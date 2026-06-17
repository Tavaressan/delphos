# Investigation: Solução de Warnings Rust (nack options)

> Identificador: `014-rust-nack-warnings`
> Data: `2026-06-17`

## 1. Pesquisa de Fundo e Causa Raiz

No ecossistema de mensageria da biblioteca `lapin` em Rust, a instanciação de structs de opções como `BasicNackOptions` é comumente realizada especificando apenas alguns campos e preenchendo o restante com a sintaxe de atualização de struct `..Default::default()`:

```rust
BasicNackOptions {
    requeue: false,
    ..Default::default()
}
```

### Causa do Warning

O warning ocorre porque a struct `BasicNackOptions` na versão do `lapin` utilizada possui exatamente 2 campos públicos:
1. `multiple: bool`
2. `requeue: bool`

Quando o desenvolvedor especifica explicitamente o valor de `requeue` (ou `multiple`), e usa `..Default::default()` para preencher os campos restantes, o compilador ou a ferramenta de linter (`clippy`) pode emitir alertas como `clippy::needless_update` dependendo do nível de rigor configurado, pois todos os campos restantes poderiam ser descritos sem a necessidade da sintaxe de atualização estrutural dinâmica, ou o uso do default é considerado redundante quando todos os campos da struct são simples booleanos conhecidos.

## 2. Alternativas Avaliadas

### Alternativa A: Inicialização Explícita de Todos os Campos (Escolhida)
Consiste em declarar todos os campos da struct na instanciação:
```rust
BasicNackOptions {
    multiple: false,
    requeue: false,
}
```
*   **Prós:** Extremamente explícito, legível, compatível com qualquer nível de clippy e remove a necessidade de resolver a macro `Default::default()`.
*   **Contras:** Um pouco mais verboso (escreve-se mais uma linha).

### Alternativa B: Uso de `BasicNackOptions::default()`
Consiste em utilizar apenas a chamada do construtor default caso os valores padrão atendam às necessidades:
```rust
BasicNackOptions::default()
```
*   **Prós:** Curto e limpo.
*   **Contras:** Menos explícito sobre qual comportamento de refileiramento está sendo adotado, dificultando a revisão rápida do código sem consultar a documentação externa da biblioteca `lapin`.

### Alternativa C: Supressão via Atributo `#[allow(...)]`
Inserir atributos de compilação acima do bloco para silenciar o compilador.
*   **Prós:** Não mexe na estrutura do código.
*   **Contras:** Apenas esconde o warning em vez de resolver o ruído de verdade, mantendo código desnecessário/redundante.

## 3. Padrão Adotado

Adota-se a **Alternativa A**, garantindo clareza semântica no código (mostrando claramente que a mensagem com erro não será refileirada e que o nack não afetará outras mensagens pendentes no canal) e eliminando qualquer warning do compilador.
