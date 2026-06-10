# Roadmap: GCP Authentication for Rust Services

> Identificador: `008-google-ai-auth`
> Data: `2026-06-09`
> Requirements: `_reversa_forward/008-google-ai-auth/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Para prover uma autenticação segura e robusta com o Google Cloud Platform (GCP) nos microsserviços em Rust, utilizaremos a biblioteca `gcp-auth` já disponível como dependência do workspace. 

No ponto de entrada (`main.rs`) do `embedding-service`, inicializaremos o `gcp_auth::AuthenticationManager` assíncronamente. Este manager gerencia por baixo dos panos o carregamento das credenciais apontadas por `GOOGLE_APPLICATION_CREDENTIALS` (ou do metadata server se em produção), bem como o cache em memória e a renovação de tokens antes de expirarem.

Esse manager será compartilhado encapsulado em um struct `AppState` e injetado nos handlers do Axum por meio de `axum::extract::State`. O handler `handle_embeddings` obterá um token de acesso para o escopo de `cloud-platform` e o enviará no cabeçalho `Authorization: Bearer <TOKEN>` para o endpoint REST da Vertex AI. Se o carregamento de credenciais falhar (como em ambiente de desenvolvimento local mal configurado), o erro será retornado no response com status `500` e mensagem clara descritiva.

## 2. Princípios aplicados

Não foram definidos princípios específicos em `.reversa/principles.md` para este projeto, logo o alinhamento de princípios padrão de segurança de credenciais e isolamento de ambiente é respeitado por esta feature.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Utilizar a crate `gcp-auth` para autenticação. | Gerenciamento automático de cache e expiração de tokens OAuth2, reduzindo código próprio e erros de renovação. | Hand-rolling JWT generation com crates de criptografia e requests manuais ao endpoint do Google OAuth2. | 🟢 |
| D-02 | Compartilhar o `AuthenticationManager` usando `axum::extract::State`. | Maneira recomendada no Axum 0.7+ para prover estado de forma segura e concorrente (com suporte a thread-safety). | Usar variáveis estáticas globais (`lazy_static` / `once_cell`) ou injetar via `Extension`. | 🟢 |
| D-03 | Falhar imediatamente com erro descritivo em desenvolvimento se chaves estiverem ausentes. | Conforme definido com o usuário, o fallback para chaves de mock não será automático quando o provider for `real`, garantindo visibilidade clara de erros de infraestrutura. | Fazer fallback silencioso para predições mock. | 🟢 |

## 4. Premissas

Nenhuma premissa sob dúvida ativa foi adotada, dado que todos os pontos do requirements foram esclarecidos.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `shared` | `_reversa_sdd/architecture.md#2-tecnologias-empregadas` | componente-novo | Criar módulo de suporte para GCP e instanciamento do manager. |
| `embedding-service` | `_reversa_sdd/code-analysis.md#3-modulo-rust-services-microsservicos-de-ia` | regra-alterada | Atualização do `main.rs` para injetar `State` contendo o autenticador do GCP e remover uso de `VERTEX_AI_API_KEY` estática. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Nenhuma modificação de esquema do banco de dados relacional ou vetorial é necessária para esta feature.
- Detalhe completo em: `_reversa_forward/008-google-ai-auth/data-delta.md`

## 7. Delta de contratos externos

Não há novos contratos expostos pelo `embedding-service` ou `ingestion-worker`. O endpoint `/embeddings` permanece inalterado na interface pública.

## 8. Plano de migração

Não há migração de dados pendente. O plano consiste apenas em:
1. Configuração do `.env` local e do servidor com a variável `GOOGLE_APPLICATION_CREDENTIALS` apontando para o arquivo de chaves JSON corporativo.
2. Atualização das variáveis no ambiente Docker Compose para expor o volume ou caminho da chave para dentro do container do `embedding-service`.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Vazamento acidental do arquivo JSON de credenciais. | alto | baixo | Adicionar explicitamente o diretório onde as chaves estão salvas ao `.gitignore` global e reforçar políticas locais. |
| Latência extra no primeiro request devido à chamada de token OAuth2 inicial. | baixo | médio | Inicializar o manager no startup da aplicação e, se necessário, disparar um request de aquecimento (warm-up) de token na inicialização. |
| Falha na rede interna do Docker ao acessar servidores do Google. | médio | baixo | Utilizar timeouts configurados no reqwest e logs claros de falha de conexão. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Compilação limpa do workspace Rust com as mudanças do autenticador
- [ ] Testes automatizados passando com `cargo test` no workspace
- [ ] Arquivo `.env.example` atualizado com as novas variáveis do GCP
- [ ] Chaves de desenvolvimento configuradas no `.env` local sem expor para o Git

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-09 | Versão inicial gerada por `/reversa-plan` | reversa |
