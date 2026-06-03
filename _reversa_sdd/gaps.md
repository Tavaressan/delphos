# Lacunas da Análise (Gaps Report) — alfabra_vector

> Gerado pelo Revisor em 2026-05-25

Após a validação interativa com o usuário, **todas** as lacunas críticas (🔴) identificadas no mapeamento inicial do sistema foram com sucesso resolvidas e integradas como decisões arquiteturais oficiais nas especificações técnicas.

Portanto, **não existem lacunas operacionais pendentes** que impeçam o início da migração (cycle forward) ou a reconstrução do software legado.

## Resumo de Resoluções

1. **Configuração do Spring Security e JWT (Módulo `java-core`):**
   * *Status anterior:* 🔴 LACUNA (chaves, algoritmos e expiração não mapeados)
   * *Resolução:* Definida arquitetura baseada em **OAuth2 Resource Server + JWT Stateless** com criptografia **HS256** e chaves secretas/expiração injetadas via variáveis de ambiente no `.env`.
   * *Evidência:* [`_reversa_sdd/nucleo-java/design.md`](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/nucleo-java/design.md#L45-L60)

2. **Lógica de Parsing e Processamento de Documentos (Módulo `servicos-rust`):**
   * *Status anterior:* 🔴 LACUNA (implementação real de PDF parsing, OCR e chamadas de embedding não mapeada)
   * *Resolução:* Definida infraestrutura de extração multiformato com `lopdf`, `pdf-extract`, `docx-rs` e `Tesseract OCR` (com suporte a processamento de imagens e PDFs digitalizados).
   * *Evidência:* [`_reversa_sdd/servicos-rust/design.md`](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/servicos-rust/design.md#L46-L70)

3. **Mecanismo de Embedding e Provedor (Módulo `servicos-rust`):**
   * *Status anterior:* 🔴 LACUNA (ausência de provedor físico nas chaves de embedding)
   * *Resolução:* Homologado o **Google Vertex AI** (modelos `text-embedding-005` ou `gemini-embedding-001`) como provedor de embeddings padrão e principal. Implementada a abstração Provider Pattern com suporte secundário ou futuro para OpenAI, Ollama e Gemini Direct.
   * *Evidência:* [`_reversa_sdd/servicos-rust/design.md`](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/servicos-rust/design.md#L71-L89)

4. **Gerenciamento de Estado e Sessão de Autenticação (Módulo `frontend`):**
   * *Status anterior:* 🟡 INFERIDO (suposição de cookies vs localStorage)
   * *Resolução:* Decisão de segurança estrita de utilizar **cookies HTTPOnly seguros (`Secure=true`, `HttpOnly=true`, `SameSite=Strict` em produção)** orquestrados pelo **Auth.js** (NextAuth.js). Fica proibido o armazenamento de JWT em `localStorage` ou em estado compartilhado client-side (Zustand/Redux).
   * *Evidência:* [`_reversa_sdd/frontend/design.md`](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/frontend/design.md#L42-L55)

5. **Escopo e Deploy do Structurizr (Módulo `infraestrutura`):**
   * *Status anterior:* 🟡 INFERIDO (suposição de deploy)
   * *Resolução:* O container `structurizr` é de uso estritamente restrito a desenvolvimento local e apoio de documentação arquitetural, rodando sob o profile `dev`. Não fará parte do deploy produtivo da infraestrutura da plataforma, evitando brechas de segurança desnecessárias.
   * *Evidência:* [`_reversa_sdd/infraestrutura/design.md`](file:///Users/vitortavares/Desktop/Alfabra%20Vector/_reversa_sdd/infraestrutura/design.md#L50-L65)
