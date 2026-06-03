<!--
Template de corpo do roadmap.md
Carregado por /reversa-plan.

REGRAS DE PREENCHIMENTO:
- Escreva como DELTA sobre o legado, jamais redescreva a arquitetura inteira.
- Cite componentes do _reversa_sdd/ por nome literal.
- Marque cada decisão com 🟢 / 🟡 / 🔴 conforme a confidência da fonte que a sustenta.
- Decisões dependentes de [DÚVIDA] aceitas como premissa entram com 🟡 e aparecem em "Premissas".
- Detalhes profundos de modelo de dados vão para data-delta.md, não aqui.
- Detalhes profundos de contrato externo vão para interfaces/<nome>.md, não aqui.
-->

# Roadmap: Embedding Service

> Identificador: `001-embedding-service`
> Data: `2026-06-02`
> Requirements: `_reversa_forward/001-embedding-service/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A abordagem técnica consiste em transformar o esqueleto atual do `embedding-service` (Axum/Rust) em um microsserviço estruturado sob uma abstração genérica de provedor (`EmbeddingProvider` trait). Isso isola os detalhes das APIs de terceiros (como OpenAI, Google Vertex AI, Voyage e Cohere) e prepara o sistema para uma futura integração local baseada em FastEmbed. A resiliência (retry com backoff exponencial + jitter) e a tolerância a falhas (fallback dinâmico para mock ou provedor alternativo) serão implementadas no nível da abstração e de seus provedores concretos.

## 2. Princípios aplicados

Não há arquivo `principles.md` configurado no projeto local. A feature está alinhada aos padrões de isolamento de microsserviços detectados no legado.

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Isolamento de microsserviços | O serviço de embeddings é executável de forma autônoma e se comunica por HTTP REST, isolando o `ingestion-worker` e o `rag-worker` de chaves de API e bibliotecas de ML específicas. | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Criar a abstração `EmbeddingProvider` | Garante independência de fornecedor e vendor neutrality, permitindo que a plataforma dependa de uma interface genérica de provedor. | Acoplamento direto com a API de um único provedor no handler. | 🟢 |
| D-02 | Implementar Provedores Concretos baseados em API | Utilizar Reqwest para comunicação HTTP REST com APIs externas de OpenAI, Voyage, Cohere e Google Vertex AI. | Utilização de SDKs específicas para cada API (aumenta o tamanho binário e acoplamento). | 🟢 |
| D-03 | Armazenar chaves em variáveis de ambiente | Evita vazamento de credenciais e permite parametrização flexível em ambientes distintos. | Arquivo de configuração local exposto em repositório. | 🟢 |
| D-04 | Backoff exponencial com Jitter nas retentativas | Evita sobrecarga de APIs externas em caso de rate limit (429) ou erros de rede transitórios. | Retentativa linear simples ou falha dura imediata. | 🟡 |
| D-05 | Fallback Dinâmico de Provedor | Permite redirecionar requisições em tempo de execução para um provedor secundário (ex: de OpenAI para Cohere ou Mock) em falhas permanentes. | Interrupção imediata do pipeline de ingestão. | 🟡 |
| D-06 | Adiar a integração com FastEmbed (inferência local) | Mantém o MVP leve e focado em chamadas de API, tratando inferência local como roadmap de evolução futura (on-premise). | Incorporar FastEmbed no primeiro incremento (aumenta complexidade inicial de build e dependências de C++). | 🟢 |

## 4. Premissas

Nenhuma premissa sob dúvida pendente foi adotada, uma vez que todas as lacunas do documento de requisitos foram formalmente resolvidas na sessão `/reversa-clarify`.

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|----------|----------------------------------|-----------------|
| n/a | n/a | n/a |

## 5. Delta arquitetural

Os componentes descritos em `_reversa_sdd/architecture.md` serão atualizados conforme abaixo:

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `embedding-service` | `_reversa_sdd/architecture.md#2. Tecnologias Empregadas` | componente-alterado | Expansão do componente para expor rota POST `/embeddings` implementando a abstração `EmbeddingProvider` com múltiplos provedores, retry e fallback. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Nenhuma alteração de esquema ou tabela de banco de dados é necessária, uma vez que a tabela `document_chunks` já armazena vetores parametrizáveis e o microsserviço é stateless.
- Detalhe completo em: `_reversa_forward/001-embedding-service/data-delta.md`

## 7. Delta de contratos externos

O serviço expõe um novo contrato HTTP para processamento de embeddings e mantém a verificação de saúde legada.

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| `embeddings` | HTTP | `_reversa_forward/001-embedding-service/interfaces/embeddings.md` |

## 8. Plano de migração

Não há necessidade de migração de banco de dados ou reestruturação de tabelas para esta feature.
1. Configuração das novas variáveis de ambiente no arquivo `.env` da raiz e nos templates do docker-compose.
2. Atualização do `ingestion-worker` para passar a apontar para o endpoint real do `embedding-service` em vez de gerar embeddings fictícios localmente (no futuro).

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Rate Limit ou Indisponibilidade da API principal | alto | média | Implementação de retry com backoff exponencial + fallback dinâmico para provedor secundário ou mock de failover na abstração. |
| Incompatibilidade de dimensões de vetor no banco | alto | baixa | Validação no endpoint de entrada para impedir que requisições usem dimensões incompatíveis com o pgvector configurado no container. |
| Vazamento de chaves privadas em logs | alto | baixa | Mascarar chaves de autenticação em todos os interceptadores de log HTTP. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado e validado
- [ ] Sucesso em todos os testes unitários e de integração locais do microsserviço de embeddings (incluindo cobertura de retry e fallback)
- [ ] O contêiner do `embedding-service` executa no docker-compose local respondendo com sucesso às requisições do endpoint `/embeddings`

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-02 | Versão inicial gerada por `/reversa-plan` | reversa |
| 2026-06-02 | Adaptação com base na ADR de Estratégia de Provedores do Embedding Service | reversa |
