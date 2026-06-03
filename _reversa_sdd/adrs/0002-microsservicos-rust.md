# ADR 0002 - Microsserviços Rust para Ingestão e Processamento Assíncrono de Documentos

## Status
🟢 CONFIRMADO (Extraído dos módulos `rust-services` e `java-core` do projeto legado)

## Contexto
O processo de ingestão de documentos para RAG envolve a leitura de arquivos brutos (como PDFs ou documentos de texto), extração de texto, divisão em trechos (chunking) e chamadas a modelos de embedding para gerar os vetores. Essas operações são CPU-intensive (parsing de arquivos pesados) e I/O-intensive (consultas de rede para APIs de IA). Executar essas tarefas de forma síncrona ou concorrente na API Spring Boot principal degradaria o desempenho do painel web, das mensagens de chat e do login dos usuários.

## Decisão
Isolar o pipeline de processamento e ingestão em microsserviços desacoplados escritos em **Rust** (`document-processing`, `embedding-service` e `ingestion-worker`), enquanto a API Spring Boot (`java-core`) atua como orquestrador central e gerenciador de metadados relacionais.

## Justificativa
1. **Desempenho e Eficiência de Recursos:** Rust oferece tempos de execução extremamente baixos e baixo consumo de memória, o que é ideal para processos pesados de leitura de documentos e parsing.
2. **Desacoplamento e Escalabilidade:** Permite escalar os microsserviços de processamento de documentos e geração de embeddings de forma independente (ex: múltiplos réplicas em Kubernetes ou Docker Compose), sem impactar ou precisar escalar a API Spring Boot principal.
3. **Execução Assíncrona com Tokio:** O `ingestion-worker` e demais microsserviços em Rust utilizam o framework Tokio para gerenciar concorrência sem bloqueio (non-blocking I/O) de forma nativa e robusta.
4. **Segurança de Memória:** Rust oferece segurança de memória sem garbage collector (GC), eliminando pauses de GC que poderiam prejudicar a latência durante o processamento de grandes lotes de documentos.
