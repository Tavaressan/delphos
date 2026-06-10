<!--
Template de corpo do requirements.md
Carregado por /reversa-requirements e atualizado por /reversa-clarify.

REGRAS DE PREENCHIMENTO:
- Mantenha a ordem das seções obrigatórias.
- Não apague seções marcadas como obrigatórias, mesmo quando vazias (use "n/a" se necessário).
- Comentários inline (entre <!-- -->) só devem ser removidos quando a seção correspondente estiver totalmente preenchida.
- Use 🟢 / 🟡 / 🔴 conforme a confidência da fonte do _reversa_sdd/ que sustenta a afirmação.
- Marque com [DÚVIDA] qualquer ponto onde a informação faltar; máximo de três marcadores no documento inicial.
-->

# Requirements: Embedding Service

> Identificador: `001-embedding-service`
> Data: `2026-06-02`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O microsserviço de embeddings (`embedding-service`) fornece uma interface unificada e assíncrona de alta performance para converter fragmentos de texto (chunks) em representações vetoriais de dimensionalidade parametrizável. Ele permite que o pipeline RAG da plataforma execute buscas semânticas eficientes utilizando similaridade de cosseno, isolando as dependências de APIs de LLM externas e oferecendo mecanismos de resiliência (retry exponencial e fallback) para garantir estabilidade da ingestão assíncrona.

## 2. Contexto a partir do legado

Os artefatos da engenharia reversa indicam a necessidade e a existência de um serviço de embeddings que expõe endpoints REST e apoia o processamento assíncrono.

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#3. Padrões de Integração e Comunicação` | O processamento e vetorização ocorrem via chamadas HTTP REST internas do Ingestion Worker aos microsserviços `document-processing` e `embedding-service` na porta 8000. | 🟢 |
| `_reversa_sdd/domain.md#1.3. Infraestrutura e Serviços` | **Embedding Service:** Microsserviço em Rust dedicado a fazer interface com APIs de LLM/Embeddings para gerar os vetores com dimensionalidade parametrizável. | 🟢 |
| `_reversa_sdd/domain.md#2.2. Pipeline RAG e Processamento [DR03]` | Todos os chunks de documentos gerados no sistema devem possuir embeddings com dimensionalidade parametrizável e compatível com o modelo de embeddings configurado. | 🟢 |
| `_reversa_sdd/domain.md#2.2. Pipeline RAG e Processamento [DR06]` | Os microsserviços de apoio (`document-processing` e `embedding-service`) devem responder com "OK" em chamadas HTTP GET para o endpoint `/healthz` na porta 8000. | 🟢 |
| `_reversa_sdd/architecture.md#4. Dívidas Técnicas Identificadas` | O microsserviço de embedding não possui lógicas de retry exponencial ou fallback para outros provedores de nuvem. Se a API externa cair, a fila inteira de ingestão falha. | 🟡 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| `Ingestion Worker` (Agente de Ingestão) | Vetorizar chunks de texto em lote de forma resiliente | Solicita a conversão de múltiplos chunks do documento em vetores durante o pipeline de ingestão. |
| `RAG Worker` (Agente de Busca) | Vetorizar a consulta do usuário para busca semântica | Solicita a conversão da query textual do usuário em um único vetor para realizar a busca por similaridade de cosseno no PostgreSQL. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Nova - Robustez):** Retry Exponencial de Chamada. Em caso de falha de comunicação ou limite de requisições excedido (Rate Limit) da API externa de embeddings, o serviço deve tentar novamente utilizando backoff exponencial com jitter antes de falhar. 🟡
2. **RN-02 (Nova - Robustez):** Fallback de Provedor de Embeddings. Se o provedor principal (Gemini 2.5 Flash via Google Vertex AI) estiver indisponível e as tentativas de retry falharem, o serviço deve encaminhar a requisição para um provedor alternativo configurado de mesma dimensionalidade. 🟡
3. **RN-03 (Nova):** Parametrização Dinâmica do Modelo e Dimensão. O serviço deve suportar seleção do modelo e dimensionalidade do embedding por requisição ou por variáveis de ambiente, com valor padrão inicial de 768 dimensões, respeitando a flexibilidade de dados do pgvector. 🟢

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Endpoint de Geração de Embeddings | Must | `POST /embeddings` aceita JSON com `input` (lista de strings), `model` (opcional) e `dimensions` (opcional, padrão 768), retornando os vetores numéricos correspondentes com código 200. | 🟢 |
| RF-02 | Verificação de Saúde | Must | `GET /healthz` retorna a string "OK" com código 200 (mantendo comportamento herdado). | 🟢 |
| RF-03 | Suporte a Múltiplos Provedores (Mock e Real) | Must | Suporta gerar embeddings reais via API externa (Google Vertex AI / Gemini 2.5 Flash com chave de API via placeholders) ou embeddings simulados (mock) em caso de ambiente offline de desenvolvimento. | 🟢 |
| RF-04 | Resiliência com Retry e Jitter | Should | Aplica retentativas com backoff em erros de rede (5xx ou 429) das APIs externas de embedding. | 🟡 |
| RF-05 | Fallback Dinâmico | Should | Se o modelo principal falhar, o serviço realiza fallback automático para um modelo de backup configurável que gere a mesma dimensionalidade. | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | Latência < 500ms para geração de embeddings locais ou com cache | Crucial para não engargalar o pipeline de RAG e busca. | 🟡 |
| Segurança | Gerenciamento seguro de API Keys | Chaves de acesso a provedores externos de LLM devem ser lidas exclusivamente de variáveis de ambiente seguras. | 🟢 |
| Observabilidade | Logs de latência e taxa de erro das APIs de LLM | Necessário para diagnosticar falhas nas APIs externas de embeddings. | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Geração de embeddings com sucesso
  Dado que o serviço de embeddings está configurado com um provedor ativo
  Quando uma requisição POST for enviada para `/embeddings` contendo:
    """
    {
      "input": ["Olá Mundo"],
      "dimensions": 768
    }
    """
  Então o status da resposta deve ser 200 OK
  E o corpo da resposta deve conter uma lista de objetos com o vetor de 768 dimensões correspondente ao input

Cenário: Geração de embeddings em lote com múltiplos textos
  Dado que o serviço de embeddings está ativo
  Quando uma requisição POST for enviada para `/embeddings` contendo:
    """
    {
      "input": ["Texto um", "Texto dois"],
      "dimensions": 768
    }
    """
  Então a resposta deve ser 200 OK
  E o corpo deve retornar exatamente dois vetores correspondentes na ordem correta

Cenário: Falha temporária com retry automático bem-sucedido
  Dado que a API externa falha temporariamente com erro 429 (Rate Limit) na primeira tentativa
  Quando uma requisição de embedding for iniciada
  Então o serviço deve aguardar o tempo do backoff e tentar novamente
  E obter sucesso na segunda tentativa retornando 200 OK com o vetor

Cenário: Falha permanente e acionamento de fallback
  Dado que o provedor principal está indisponível e excede as tentativas de retry
  E que existe um provedor de fallback configurado para a mesma dimensão
  Quando a requisição de embedding for processada
  Então o serviço deve obter o vetor a partir do provedor de fallback
  E retornar 200 OK

Cenário: Requisição inválida com input vazio
  Dado que o serviço de embeddings está ativo
  Quando uma requisição POST for enviada para `/embeddings` contendo:
    """
    {
      "input": [],
      "dimensions": 768
    }
    """
  Então o status da resposta deve ser 400 Bad Request
  E a mensagem de erro deve indicar que a lista de inputs não pode estar vazia
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 (POST /embeddings) | Must | Funcionalidade principal do microsserviço para servir o pipeline RAG. |
| RF-02 (GET /healthz) | Must | Necessário para probes de monitoramento de integridade e DevOps da plataforma. |
| RF-03 (Provedores real/mock) | Must | Permite desenvolvimento local robusto offline e execução em produção online. |
| RF-04 (Retry e Jitter) | Should | Evita falhas catastróficas na ingestão devido a interrupções curtas de rede. |
| RF-05 (Fallback) | Should | Aumenta a alta disponibilidade mitigando indisponibilidades prolongadas de provedores. |

## 9. Esclarecimentos

### Sessão 2026-06-02

- **Q:** Qual API externa (OpenAI, Anthropic, Cohere, etc.) será utilizada como provedor primário e qual o modelo padrão pré-configurado?
  **R:** A API provedora primária será o Gemini 2.5 Flash provido pelo Google Vertex AI. Serão utilizados placeholders que serão substituídos pela API key do provedor de LLM.
- **Q:** Qual deve ser a dimensionalidade padrão quando não especificada na requisição (por exemplo, 768 para modelos OpenAI)?
  **R:** De início utilizaremos 768, que é um padrão, mas a dimensionalidade deve ser parametrizável para o uso de outros provedores.
- **Q:** O serviço deve expor suporte a embeddings locais por meio de bibliotecas ONNX (como ort ou fastembed) para rodar 100% offline, ou usaremos apenas chamadas de API de terceiros?
  **R:** Usaremos chamadas de API de terceiros, não rodaremos LLMs/modelos localmente.

## 10. Lacunas

n/a

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-02 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-06-02 | Dúvidas sanadas via `/reversa-clarify` na Sessão 2026-06-02 | reversa |
