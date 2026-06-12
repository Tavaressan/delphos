# Legacy Impact: Validação e Testes E2E do RAG Worker Rust

> Identificador: `010-rag-worker-validation`
> Data: `2026-06-12`

## Arquivos Afetados

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|---|---|---|---|---|
| `.env` | Configuração / Env setup | `delta-de-contrato-externo` | LOW | Atualização do modelo Vertex AI para `text-embedding-004` corrigindo o erro 404 de modelo não encontrado. |
| `tests/e2e/runner.test.js` | Testes / E2E Suite | `regra-alterada` | LOW | Adição do suporte a `SKIP_RESET=true` para pular a reinicialização dos containers nos testes subsequentes. |

## Diff Conceitual por Componente

* **Configurações Gerais (.env):** O modelo de embeddings do Vertex AI foi alterado de `text-embedding-001` (descontinuado/inexistente) para `text-embedding-004` (o modelo padrão de produção recomendado), permitindo a comunicação correta com a API do Google Cloud e a geração bem-sucedida de embeddings de 768 dimensões.
* **Ambiente de Testes E2E:** O fluxo de inicialização e limpeza dos containers no arquivo de testes foi flexibilizado para ler a variável de ambiente `SKIP_RESET`. Quando ativa, evita o teardown do docker compose economizando tempo de execução.

## Preservadas

Todas as regras de negócio 🟢 mapeadas no [domain.md](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/domain.md) permanecem intactas e operacionais:
* **`[DR01] Hierarquia de Papéis`**: Preservada.
* **`[DR03] Dimensionalidade Parametrizável de Vetores`**: Preservada e confirmada (os embeddings gerados possuem a dimensionalidade correta de 768 posições).
* **`[DR04] Busca por Similaridade de Cosseno`**: Preservada.
* **`[DR05] Heartbeat de Ingestão`**: Preservada.
* **`[DR06] Monitoramento de Microsserviços`**: Preservada.
* **`[DR07] Restrição de Entrada no Firewall`**: Preservada.
* **`[DR08] Isolamento de Portas de Banco de Dados`**: Preservada.

## Modificadas

* Nenhuma regra de negócio 🟢 foi modificada ou removida.
