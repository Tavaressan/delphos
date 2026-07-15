# Visão Geral da Arquitetura (Architecture)

> Gerado automaticamente pelo `reversa-architect`

## Visão Geral
O sistema **Alfabra Vector** é uma plataforma distribuída para Orquestração de Agentes Autônomos em RAG (Retrieval-Augmented Generation). 
Em vez de um monólito, a arquitetura é orientada a eventos usando **RabbitMQ** para o desacoplamento de backends políglotas (Java, Python, Rust).

## Integrações Externas
* **Google Vertex AI:** Usado pelos workers (via SDK/HTTP) para submeter prompts de LLM (`gemini-1.5-flash` ou superior) após montar contexto do RAG. (🟢 CONFIRMADO)
* **Embedding Service:** Serviço local/API que expõe interface para gerar embeddings de textos a serem salvos e comparados. (🟢 CONFIRMADO)

## Dívidas Técnicas (Inferidas 🟡)
* O frontend faz chamadas diretas com Server-Sent Events (SSE) assumindo respostas lineares, mas pode sofrer com desordem assíncrona se não houver um broker de estado (ex: Redis).
* O script de firewall expõe configurações que podem colidir com CNI do Kubernetes em prod.
* Python e Rust dependem fortemente de JSON serializado manualmente no RabbitMQ, requerendo schemas fortes (Protocol Buffers ou Avro) para evitar quebras em evolução.
