# Perguntas para Validação — alfabra_vector

> Gerado pelo Revisor em 2026-05-25
> Responda cada pergunta e me avise quando terminar.

---

## Pergunta 1

**Contexto:** Módulo `java-core` — arquivo `java-core/src/main/resources/application.yml`
**Spec afetada:** [`_reversa_sdd/nucleo-java/design.md`](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/nucleo-java/design.md#L46-L48)
**Pergunta:** Como o Spring Security deve ser configurado para validar/gerar os tokens JWT? Onde a chave secreta (secret key) e o tempo de expiração do token devem ser definidos (ex: variáveis de ambiente no `.env`)?
**Impacto:** Se for definido no `.env`, a spec precisa documentar as variáveis de ambiente necessárias para a autenticação.

`✅ Respondida`
**Resposta:** Usar Spring Security + OAuth2 Resource Server + JWT stateless, com AuthenticationManager, JwtEncoder/JwtDecoder, SecurityFilterChain stateless, filtro JWT baseado em Bearer Token e sem sessões HTTP. Variáveis no .env: JWT_SECRET, JWT_EXPIRATION (3600000ms / 1h) e JWT_REFRESH_EXPIRATION (604800000ms / 7d). Estratégia de assinatura simétrica inicial (HS256) com possível evolução futura para RS256 com chave pública/privada + KMS.

---

## Pergunta 2

**Contexto:** Módulo `servicos-rust` — arquivos `rust-services/document-processing/src/main.rs` e `rust-services/embedding-service/src/main.rs`
**Spec afetada:** [`_reversa_sdd/servicos-rust/design.md`](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/servicos-rust/design.md#L50-L52)
**Pergunta:** Quais são as bibliotecas ou engines de parsing de PDF/documentos esperadas no microsserviço `document-processing`? Além disso, qual é a API/serviço externo de embeddings (OpenAI, Gemini, etc.) que o `embedding-service` deve chamar e quais são suas variáveis de ambiente?
**Impacto:** Detalha as dependências e o comportamento funcional de extração e vetorização na spec `design.md` e `requirements.md` de Rust.

`✅ Respondida`
**Resposta:** Decisão de usar lopdf, pdf-extract, tesseract, docx-rs, scraper e pulldown-cmark no processamento de parsing de documentos. Para embeddings, o provedor oficial inicial é o Google Vertex AI (modelos text-embedding-005 ou gemini-embedding-001) com suporte a outras opções no padrão Provider Abstraction. Variáveis de ambiente configuradas para GCP Vertex e montagem de volumes Docker para credentials.

---

## Pergunta 3

**Contexto:** Módulo `frontend`
**Spec afetada:** [`_reversa_sdd/frontend/design.md`](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/frontend/design.md#L42-L44)
**Pergunta:** O estado de autenticação do usuário (como o token JWT) no cliente Next.js deve ser gerenciado por cookies seguros (ex: usando NextAuth.js/Auth.js), por um gerenciador de estado dedicado (Zustand/Redux) ou simplesmente armazenado em localStorage com Context API?
**Impacto:** Define a arquitetura do cliente Next.js na spec `design.md`.

`✅ Respondida`
**Resposta:** Sessão de autenticação será armazenada de forma segura usando cookies HTTPOnly (`Secure=true`, `HttpOnly=true`, `SameSite=Strict` em produção) gerenciados via Auth.js (NextAuth.js). O JWT não será armazenado em localStorage ou gerenciadores de estado globais como Zustand/Redux (que serão limitados a UI e dados de visualização). Context API será usada apenas para dados de leitura rápida derivados da sessão.

---

## Pergunta 4

**Contexto:** Arquivo `docker-compose.yml:90` (serviço `structurizr`)
**Spec afetada:** [`_reversa_sdd/infraestrutura/design.md`](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/infraestrutura/design.md)
**Pergunta:** O container `structurizr` é de uso estritamente local (desenvolvimento) para visualização dos diagramas C4 do projeto, ou ele deve ser implantado no ambiente de produção corporativo?
**Impacto:** Define se a tarefa de implantação/configuração do Structurizr e sua segurança no host (UFW) devem ser especificadas.

`✅ Respondida`
**Resposta:** O container Structurizr é de uso exclusivo para desenvolvimento local e suporte a documentação de arquitetura, sendo executado opcionalmente através do profile docker compose `dev`. Não fará parte do deploy em produção corporativo e, portanto, não requer tarefas de firewall UFW, HTTPS ou autenticação dedicada.
