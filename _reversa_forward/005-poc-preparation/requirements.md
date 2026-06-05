# Requirements: Validação e Preparação para Apresentação do POC

> Identificador: `005-poc-preparation`
> Data: `2026-06-05`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Este documento define os requisitos de infraestrutura, configuração e testes automatizados end-to-end necessários para validar e viabilizar a apresentação do Proof of Concept (POC) da plataforma Alfabra Vector hoje. O objetivo é assegurar que o sistema funcione localmente de forma estável com integração direta a provedores reais de Inteligência Artificial via Vertex AI, utilizando os modelos `gemini-1.5-flash-002` para chat/orquestração cognitiva e `text-embedding-004` para geração de vetores de RAG com o `embedding-service`.

## 2. Contexto a partir do legado

As definições de arquitetura de rede, portas de serviço e dependências de bancos e filas de mensageria foram extraídas diretamente da documentação de engenharia reversa do projeto legado.

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#2. Tecnologias Empregadas` | O ecossistema é baseado em Next.js (frontend), Spring Boot (backend), Postgres/pgvector e RabbitMQ. | 🟢 |
| `_reversa_sdd/domain.md#2.1. Controle de Acesso (RBAC)` | O sistema implementa controle de acesso (roles/permissions) com o usuário admin padrão. | 🟢 |
| `_reversa_sdd/domain.md#2.2. Pipeline RAG e Processamento` | Os microsserviços de apoio devem expor endpoints `/healthz` e retornar status válido. | 🟢 |
| `_reversa_sdd/code-analysis.md#☕ 2. Módulo: java-core (Spring Boot API)` | O backend Spring Boot usa as migrações Flyway na inicialização e valida o banco. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Superior / Stakeholder | Validar o comportamento da plataforma em tempo real sem falhas técnicas. | O superior realiza login com a conta administrativa padrão, visualiza o console de agentes, interage com o chat e observa o status e as citações geradas a partir da base de dados sem interrupção técnica. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** Uso de Provedores Reais de IA para Chat e Embedding (Vertex AI) 🟢
   - Origem no legado: n/a
   - Tipo: nova
   - Descrição: Para a demonstração do POC hoje, todas as buscas semânticas e geração de embeddings devem utilizar provedores reais da Vertex AI. O chat utilizará o modelo `gemini-1.5-flash-002` e o RAG utilizará o modelo `text-embedding-004` (utilizando a chamada `:predict` com autenticação baseada na variável `VERTEX_AI_API_KEY`).

2. **RN-02:** Desativação Temporária de MFA e CAPTCHA Rígidos 🟡
   - Origem no legado: `_reversa_sdd/domain.md#2.1. Controle de Acesso (RBAC)`
   - Tipo: alterada
   - Descrição: O fluxo de login para a demonstração do POC do superior deve permitir a validação imediata do CAPTCHA e MFA com as credenciais pré-semeadas e dados estáticos mockados no frontend, de modo a evitar bloqueios operacionais ou erros de token TOTP durante a apresentação.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Lista de Verificação e Setup de Variáveis do POC | Must | Deve existir um arquivo `.env` configurado localmente contendo as chaves de acesso do Vertex AI (`VERTEX_AI_API_KEY`, `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_REGION`), configurações de domínio DuckDNS e portas de execução do Docker Compose. | 🟢 |
| RF-02 | Integração de Embeddings com text-embedding-004 | Must | O `embedding-service` deve expor a rota `/embeddings` e chamar o endpoint de predição `:predict` do Vertex AI para vetorizar os textos a 1536 dimensões usando a API key. | 🟢 |
| RF-03 | Testes End-to-End de Integração e Fumaça | Must | Deve ser executada uma bateria de testes de validação end-to-end que chame o endpoint `POST /api/executions` do backend Spring Boot (`java-core`), simulando a criação de uma execução de agente e confirmando a resposta de sucesso. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | Tempo de resposta do envio de mensagem simulada de chat menor que 3 segundos (excluindo latência de rede externa da API). | Evita a sensação de travamento na apresentação do POC. | 🟢 |
| Segurança | Isolamento completo dos microsserviços por meio da rede interna do Docker Compose, mantendo apenas Caddy e ports mapeados acessíveis. | Baseado no script `infrastructure/setup_firewall.sh`. | 🟢 |
| Portabilidade | Executabilidade imediata em qualquer máquina macOS ou Linux com Docker e Docker Compose instalados sem necessidade de instalar SDKs de linguagem adicionais. | Essencial para demonstrações em máquinas diferentes do desenvolvedor original. | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Login administrativo de demonstração bem-sucedido
  Dado que a tela de login está ativa
  Quando o usuário insere a credencial de usuário "vitor.tavares", a senha "secretpassword", o código MFA "483921" e o CAPTCHA "7X3P"
  Então o sistema autoriza o acesso e redireciona o usuário para o "Console de Agentes"

Cenário: Envio de mensagem com RAG real e citações
  Dado que o usuário está autenticado e no "Console de Agentes"
  Quando o usuário digita a pergunta "Qual a periodicidade de manutenção dos cabos?" e clica em enviar
  Então o sistema envia a requisição de RAG ao modelo Gemini, o qual responde usando o contexto vetorizado obtido via text-embedding-004

Cenário: Falha de validação de CAPTCHA
  Dado que a tela de login está ativa
  Quando o usuário insere um CAPTCHA inválido "AAAA"
  Então o botão de login fica desabilitado e a mensagem "Código CAPTCHA incorreto" é exibida
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Variáveis configuradas são a base do funcionamento local. |
| RF-02 | Must | Garante a vetorização real na base vetorial PostgreSQL + pgvector do monorepo. |
| RF-03 | Must | Automatiza e prova que a API e o fluxo de mensageria respondem adequadamente. |
| RNF de portabilidade | Must | Permite rodar na máquina do superior ou em qualquer ambiente sem quebras de build. |

## 9. Esclarecimentos

### Sessão 2026-06-05

- **Q:** Qual o domínio temporário ou IP de acesso que o superior utilizará hoje para a homologação do sistema (ex: localhost:3000, localhost:80, ou túnel ngrok)?
  **R:** Usaremos o domínio já configurado do DuckDNS com o Caddy, conforme configurado no arquivo `.env`.
- **Q:** Há necessidade de carregar dados iniciais (seeds) de documentos adicionais no banco PostgreSQL local para a apresentação, ou apenas a lista atual do mock do frontend é suficiente?
  **R:** Usaremos provedores reais de IA para o POC: Vertex AI com Gemini 1.5 Flash (`gemini-1.5-flash-002`) para chats e Vertex AI Embeddings (`text-embedding-004`) para o RAG. O endpoint de embeddings é `:predict` em vez de `:generateContent`. O `embedding-service` e o `ingestion-worker` foram modificados para fazer essa integração.

## 10. Lacunas

Nenhuma lacuna pendente.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-05 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-06-05 | Integração de definições reais do provedor Vertex AI (Gemini 1.5 e text-embedding-004) via `/reversa-clarify` | reversa |
