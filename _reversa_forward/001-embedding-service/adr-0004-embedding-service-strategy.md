# Architectural Decision Record — Embedding Service Strategy

## Status

DECIDIDO ✅

## Contexto

A plataforma Enterprise Agent Runtime deverá suportar múltiplos provedores de embeddings, mantendo independência tecnológica em relação a modelos específicos e fornecedores de IA.

O objetivo é permitir que clientes utilizem tanto modelos externos via API quanto modelos locais executados na infraestrutura da organização, sem impacto sobre os demais componentes do sistema.

## Decisão Atual (MVP)

O serviço de embeddings será implementado em Rust e utilizará uma arquitetura baseada em abstrações de provedores.

O sistema não ficará acoplado a bibliotecas locais de geração de embeddings, como FastEmbed.

Inicialmente, a geração de embeddings será realizada por provedores externos através de APIs.

Fluxo inicial:

Document Service
→ Embedding Service (Rust)
→ HTTP Client (Reqwest)
→ Provider API (OpenAI, Voyage, Cohere ou equivalente)
→ PostgreSQL + pgvector

A camada de embeddings deverá expor uma interface genérica de provedor:

```rust
trait EmbeddingProvider {
    async fn embed(
        &self,
        texts: Vec<String>
    ) -> Result<Vec<Vec<f32>>>;
}
```

Implementações previstas:

* OpenAIEmbeddingProvider
* VoyageEmbeddingProvider
* CohereEmbeddingProvider

Todos os demais serviços da plataforma deverão depender apenas da abstração `EmbeddingProvider`, sem conhecimento do provedor concreto utilizado.

## Decisão Futura (Roadmap)

Será adicionada uma implementação local baseada em FastEmbed.

Objetivo:

* suporte a ambientes on-premise;
* redução de custos operacionais;
* execução em ambientes sem acesso à internet;
* fallback para indisponibilidade de APIs externas;
* atendimento a requisitos de privacidade e compliance.

Implementação prevista:

* FastEmbedProvider

Fluxo futuro opcional:

Document Service
→ Embedding Service
→ EmbeddingProvider
→ (OpenAI | Voyage | Cohere | FastEmbed)
→ PostgreSQL + pgvector

## Justificativa

A biblioteca FastEmbed e o cliente HTTP Reqwest não são tecnologias concorrentes.

* FastEmbed é um mecanismo de inferência local de embeddings.
* Reqwest é um cliente HTTP utilizado para consumir APIs externas.

Ao adotar uma arquitetura baseada em provedores plugáveis, a plataforma preserva flexibilidade tecnológica, reduz acoplamento, facilita futuras migrações entre fornecedores de IA e permite oferecer tanto SaaS quanto deployments corporativos on-premise.

## Consequências

### Benefícios

* Independência de fornecedor (vendor neutrality).
* Facilidade para adicionar novos provedores.
* Menor risco de lock-in tecnológico.
* Suporte futuro a clientes corporativos com requisitos de soberania de dados.
* Possibilidade de otimizar custo versus qualidade por tenant.

### Trade-offs

* Complexidade adicional na camada de abstração.
* Necessidade de padronizar dimensões e metadados entre provedores.
* Necessidade de gerenciamento de múltiplas estratégias de geração de embeddings.

## Conclusão

O MVP utilizará provedores externos de embeddings via API através de Reqwest.

FastEmbed será tratado como um provider opcional de roadmap, preservando uma arquitetura desacoplada e preparada para ambientes enterprise, multi-tenant e híbridos.
