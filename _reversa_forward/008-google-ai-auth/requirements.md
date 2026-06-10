# Requirements: Autenticador do Google Cloud Platform para Serviços Rust

> Identificador: `008-google-ai-auth`
> Data: `2026-06-09`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta feature especifica a integração segura de autenticação com o Google Cloud Platform (GCP) utilizando credenciais de conta de serviço (Service Account) e geração dinâmica de tokens OAuth2 nos microsserviços em Rust (`embedding-service`, `ingestion-worker`, etc.). A solução substitui o uso direto de chaves de API estáticas e provê rotação automática de tokens de acesso com escopo limitado à Vertex AI e Gemini, em conformidade com as políticas corporativas de segurança.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#2-tecnologias-empregadas` | Serviços em Rust utilizam Axum/Tokio. O `embedding-service` necessita de autenticação para se comunicar com APIs externas da Google de forma integrada. | 🟢 |
| `_reversa_sdd/domain.md#22-pipeline-rag-e-processamento` | A regra [DR03] prevê dimensionalidade parametrizável de vetores para embeddings do Vertex AI, que necessita de credenciais válidas do Google Cloud Platform. | 🟢 |
| `_reversa_sdd/code-analysis.md#3-modulo-rust-services-microsservicos-de-ia` | O `embedding-service` atualmente contém chamadas à API da Vertex AI usando uma chave estática (`VERTEX_AI_API_KEY`) no cabeçalho. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Administrador de Infraestrutura | Configurar chaves e variáveis do GCP de maneira centralizada e segura no ambiente. | Configuração do arquivo `.env` contendo caminhos válidos e variáveis de ambiente padronizadas. |
| Ingestion Worker / Embedding Service (Sistema) | Autenticar chamadas REST para a API da Vertex AI / Gemini usando tokens temporários renováveis. | Solicitação automática e cache de tokens OAuth2 do GCP por meio do utilitário compartilhado Rust. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** Autenticação via Service Account JSON 🟢
   - Origem no legado: n/a
   - Tipo: nova
   - O sistema de autenticação deve carregar a chave de conta de serviço no formato JSON referenciada pela variável `GOOGLE_APPLICATION_CREDENTIALS` ou carregar o conteúdo bruto a partir do ambiente.
2. **RN-02:** Rotação Automática de Tokens OAuth2 🟢
   - Origem no legado: n/a
   - Tipo: nova
   - Os tokens de acesso (Access Tokens) gerados devem ser mantidos em cache na memória e renovados automaticamente antes do seu vencimento (tipicamente 3600 segundos), evitando requisições excessivas ao servidor do Google.
3. **RN-03:** Escopo Limitado de Acesso 🟢
   - Origem no legado: n/a
   - Tipo: nova
   - As credenciais geradas devem solicitar o escopo mínimo necessário para chamadas de Vertex AI e Gemini, preferencialmente `https://www.googleapis.com/auth/cloud-platform`.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Atualização de variáveis de ambiente no `.env` e `.env.example`. | Must | O arquivo `.env` e `.env.example` devem conter as novas variáveis declaradas e documentadas de forma limpa. | 🟢 |
| RF-02 | Carregamento de chaves via `GOOGLE_APPLICATION_CREDENTIALS`. | Must | O autenticador deve ler o caminho físico do arquivo JSON de credenciais definido na variável de ambiente. | 🟢 |
| RF-03 | Integração com a crate `gcp-auth`. | Must | Implementar uma abstração estruturada em `rust-services/shared` usando a biblioteca `gcp-auth` para encapsular a geração do token. | 🟢 |
| RF-04 | Cache e rotação de tokens em memória. | Must | O serviço de embeddings deve recuperar o token ativo do cache e renová-lo transparentemente antes da expiração. | 🟢 |
| RF-05 | Inclusão do token no cabeçalho Authorization. | Must | Toda chamada HTTP para predição de embeddings na Vertex AI deve incluir o token no cabeçalho `Authorization: Bearer <TOKEN>`. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | Proteção de Credenciais Privadas | Nenhuma credencial em texto claro (JSON) deve ser salva no repositório Git. O caminho do arquivo JSON deve estar em diretório ignorado ou externo. | 🟢 |
| Desempenho | Latência de Autenticação < 50ms | A geração e validação de tokens em cache em memória não deve introduzir latência significativa em relação a chamadas diretas. | 🟡 |
| Observabilidade | Logging estruturado de erros de autenticação | Em caso de expiração ou falha de chave, o sistema deve logar erros sem vazar dados confidenciais do JSON de chaves. | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Geração de token com credenciais válidas
  Dado que o arquivo .env aponta para um arquivo JSON de chaves GCP válido em GOOGLE_APPLICATION_CREDENTIALS
  Quando o microsserviço shared/autenticador solicita um token de acesso
  Então o token é retornado com sucesso e armazenado em cache

Cenário: Renovação de token expirado ou próximo da expiração
  Dado que o token em cache está a menos de 5 minutos do vencimento
  Quando uma nova requisição de embeddings é feita pelo serviço
  Então o autenticador solicita um novo token do GCP de forma síncrona/assíncrona antes de enviar a requisição
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Configuração de variáveis no .env é necessária para parametrizar o ambiente local e de deploy. |
| RF-02 | Must | O caminho do arquivo de credenciais da conta de serviço é o padrão de segurança do GCP. |
| RF-03 | Must | Aproveitar a biblioteca gcp-auth garante robustez e evita reimplementar lógica de JWT OAuth. |
| RF-04 | Must | Evita requisições excessivas de autenticação a cada requisição de embedding individual. |
| RF-05 | Must | Necessário para a correta autorização junto aos endpoints da Vertex AI. |
| RNF de Segurança | Must | A segurança corporativa exige chaves protegidas e fora de controle de versão. |

## 9. Esclarecimentos

### Sessão 2026-06-09
- **Q:** Qual deve ser o fallback do comportamento do autenticador no modo local caso a variável `GOOGLE_APPLICATION_CREDENTIALS` esteja vazia ou aponte para um arquivo inválido? O `embedding-service` deve cair ou reverter silenciosamente para o modo `mock`?
- **R:** O fallback do autenticador não existe no momento. Ele deve retornar um erro descritivo do erro em ambiente de desenvolvimento.
- **Q:** Devemos centralizar a inicialização do autenticador no struct compartilhado e injetá-lo como estado compartilhado do Axum (`axum::Extension` ou `axum::extract::State`) no `embedding-service`?
- **R:** Sim, inicializar uma vez no `main.rs` e injetar como estado compartilhado do Axum usando `axum::extract::State`.

## 10. Lacunas

Nenhuma lacuna pendente.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-09 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-06-09 | Integração de esclarecimento sobre fallback de autenticação | reversa |
| 2026-06-09 | Integração de esclarecimento sobre injeção de estado no Axum | reversa |
