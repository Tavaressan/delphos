# Investigation: Motor de Workflows Determinísticos em Rust

> Identificador da feature: `004-workflow-worker`
> Data: `2026-06-03`
> Documento principal: `_reversa_forward/004-workflow-worker/roadmap.md`

## 1. Pesquisa de Fundo e Contexto

No legado MaxKB4j, o processamento de regras de fluxo e tomadas de decisão determinísticas dependia de scripts Groovy dinâmicos que rodavam acoplados na mesma máquina virtual Java (JVM). Essa abordagem sofria de:
1. Riscos graves de segurança devido ao acesso direto por reflexão Java à JVM.
2. Ineficiência e falta de limites rígidos de consumo de CPU e memória.

Com o redesenho da arquitetura para a **Enterprise Agent Operating Platform**, estabeleceu-se o `workflow-worker` em Rust como o executor de fluxos procedurais determinísticos estruturados (DAGs) pós-RAG ou de auditoria.

## 2. Alternativas Avaliadas para Motores de Script e Extensibilidade

### Opção A: Interpretadores Embutidos (Rhai / Lua / Javascript) em Rust
* **Prós:** Simplicidade de integração e baixa latência de execução.
* **Contras:** Introduz uma DSL proprietária (como Rhai) ou linguagem extra (como Lua) que acopla a base de regras. Não permite o reaproveitamento de regras escritas em Java, Go ou Python de outros sistemas da empresa no futuro.
* **Veredito:** Descartado para a solução final, mantido apenas como discussão de sandbox leve.

### Opção B: Sandbox de WebAssembly (WASM) com `wasmer` ou `wasmtime` (Proposta Futura)
* **Prós:**
  * **Segurança e Isolamento Total:** Código arbitrário roda em uma sandbox de memória isolada e segura (sem acesso ao SO, rede ou variáveis de ambiente do host).
  * **Poliglota:** Admite extensões compiladas para WASM a partir de C, C++, Rust, Go, Python ou AssemblyScript.
  * **Limites de Recursos:** Permite configurar limites exatos de clock (instruções de CPU) e memória alocada por instância.
  * **Alta Performance:** Compilação JIT (Just-In-Time) nativa para código de máquina do host.
* **Contras:** Complexidade inicial de configuração de toolchain para compilar scripts de auditoria em WASM.
* **Veredito:** Escolhido como a arquitetura alvo para extensibilidade (Fase 2).

### Opção C: Motor de DAG Declarativa Pura sem Scripts (Fase Atual)
* **Prós:**
  * Complexidade operacional mínima.
  * Determinismo absoluto de fluxo (nós sequenciais baseados em regras rígidas persistidas em banco de dados).
  * Facilidade de auditoria e versionamento direto no PostgreSQL.
* **Contras:** Sem flexibilidade para código dinâmico imediato.
* **Veredito:** Escolhido como a solução padrão para a Fase 1. O workflow executa nós primitivos pré-construídos (`rag`, `tool`, etc.) orquestrados via topologia SQL.

## 3. Concorrência Assíncrona e Cancelamento em Rust

Para satisfazer o requisito não funcional de concorrência e timeout máximo de 15 segundos sem vazamento de recursos, a implementação em Rust utilizará o runtime assíncrono **Tokio**:

1. **Escuta na Fila:** Utilização da biblioteca `lapin` para escuta assíncrona orientada a eventos no RabbitMQ.
2. **Controle de Timeout:** Utilização de `tokio::time::timeout` ao disparar a execução de cada nó ou da DAG inteira.
3. **Cancelamento Atômico:** Ao atingir o limite, a estrutura de futuros (`Futures`) do Rust garante que a tarefa em execução seja cancelada de forma cooperativa e atômica, interrompendo imediatamente o loop sem deixar threads órfãs consumindo CPU.

## 4. Padrões Aplicáveis

- **DAG (Directed Acyclic Graph):** Representação estruturada de nós (`workflow_node`) e arestas (`workflow_edge`) validada em tempo de compilação/carga do banco para garantir a ausência de ciclos infinitos.
- **Event-Driven Architecture:** Uso do RabbitMQ topic exchange para orquestração distribuída desacoplada do `java-core` Gateway.
