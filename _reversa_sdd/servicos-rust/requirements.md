# Serviços Rust, Requisitos

## Visão Geral
O módulo `servicos-rust` gerencia todo o processamento computacional intensivo da plataforma, incluindo a extração física de texto dos arquivos (`document-processing`), o cálculo de vetores de alta dimensão (`embedding-service`) e a orquestração assíncrona baseada em Tokio/looping (`ingestion-worker`).

---

## Responsabilidades
* **Processamento de Ingestão de Documentos:** Monitorar documentos criados no Postgres e extrair parágrafos textuais e páginas.
* **Geração de Embeddings:** Traduzir blocos textuais para vetores de floats com dimensionalidade parametrizável, compatível com o modelo de embeddings configurado para cada coleção.
* **Orquestração Assíncrona de Background:** Controlar filas de indexação sem sobrecarregar a API principal do Spring Boot.
* **Monitoramento de Saúde Interno:** Responder com status e responder a testes de conectividade nas portas internas do Docker.

---

## Regras de Negócio
* **[BR01] Heartbeat de 60 segundos:** O worker de processamento deve registrar e expor na console um heartbeat a cada 60 segundos exatos para indicar que o loop de varredura de fila está ativo.
  * *Status:* 🟢 CONFIRMADO (extraído de `rust-services/ingestion-worker/src/main.rs`).
* **[BR02] Interface HTTP Uniforme:** Todos os microsserviços do RAG devem expor um endpoint de saúde `/healthz` respondendo estritamente com o texto `"OK"`.
  * *Status:* 🟢 CONFIRMADO (extraído de `document-processing` e `embedding-service`).

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|------------|-------------------|
| RF-01 | Monitoramento Assíncrono da Fila | Must | Executar loop perpétuo de polling e checagem de banco de dados. |
| RF-02 | Extração de Texto Plano (Parsing) | Must | API Axum que aceita bytes de documento e retorna partições (chunks) formatadas. |
| RF-03 | Cálculo Vetorial (Embedding) | Must | Computar vetor com dimensionalidade parametrizável compatível com o modelo para trechos fornecidos. |
| RF-04 | Atualização de Status | Must | Salvar chunks gerados no Postgres e alterar status de documento para INDEXED ou FAILED. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Portabilidade | Portabilidade e execução em imagens Docker leves baseadas em Alpine | `Dockerfile` de cada microsserviço | 🟢 |
| Desempenho | Concorrência sem bloqueio e alta taxa de transferência (Tokio) | `#[tokio::main]` em todos os `main.rs` | 🟢 |
| Robustez | Monitoramento contínuo a cada 60 segundos de ciclo | `Duration::from_secs(60)` no loop principal | 🟢 |

---

## Critérios de Aceitação

```gherkin
Dado que o microsserviço document-processing está rodando
Quando uma requisição HTTP GET é enviada para http://localhost:8000/healthz
Então a resposta deve conter status HTTP 200 e corpo textual igual a "OK"

Dado que o Ingestion Worker é iniciado
Quando entra em modo operacional
Então ele deve imprimir "Ingestion Worker starting..." e realizar heartbeats a cada 60s
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Loop assíncrono Tokio com Heartbeat | Must | Garante processamento contínuo de uploads sem travar o host |
| API Axum em portas padronizadas internas | Must | Comunicação limpa e desacoplada entre os microsserviços |
| Fallbacks e retries em falhas externas | Should | Evita marcação prematura de `FAILED` nos documentos |

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `rust-services/document-processing/src/main.rs` | Serviço de extração e endpoint `/healthz` | 🟢 |
| `rust-services/embedding-service/src/main.rs` | Serviço de geração e endpoint `/healthz` | 🟢 |
| `rust-services/ingestion-worker/src/main.rs` | Loop do Ingestion Worker e Heartbeat | 🟢 |
| `rust-services/shared/src/lib.rs` | Biblioteca utilitária compartilhada | 🟢 |
