# Plano de Migração de Dados (Data Migration)

Este documento especifica a estratégia técnica para migrar, mapear e sanitizar os dados estruturados de usuários, chats e configurações originários dos legados **LibreChat** (MongoDB) e **MaxKB4j** (PostgreSQL anterior) para a nova modelagem de dados da **Enterprise Agent Operating Platform**.

---

## 1. Mapeamento das Fontes e Destinos de Dados

A migração consolidará bancos heterogêneos de diferentes origens em um único PostgreSQL unificado:

```
[LibreChat: MongoDB] ───────┐
                             ├─► [Pipeline de Migração Python/SQL] ─► [PostgreSQL Unificado]
[MaxKB4j: PostgreSQL] ───────┘
```

### Tabela de Mapeamento de Entidades
| Tipo de Registro | Origem Legada (LibreChat / MaxKB4j) | Tabela Destino | Ação / Mapeamento Requerido |
|---|---|---|---|
| **Usuários** | LibreChat: `users` (Mongo)<br>MaxKB4j: `user` (Postgres) | `users` | - Unificar usuários duplicados por email.<br>- Sanitizar senhas (ver Seção 2). |
| **Sessões** | LibreChat: `sessions` (Mongo TTL) | NextAuth Sessions | - Mapear para cookies HTTPOnly gerenciados no Next.js (dados transientes não migrados). |
| **Bases de Conhecimento** | MaxKB4j: `knowledge` (Postgres) | `knowledges` | - Copiar campos de limites e IDs. |
| **Documentos** | MaxKB4j: `document` (Postgres) | `documents` | - Mapear referências físicas do S3/MinIO. |
| **Trechos de Texto** | MaxKB4j: `paragraph` (Postgres) | `document_chunks` | - Copiar texto e migrar coordenadas vetoriais para o campo `embedding vector` (com a dimensionalidade parametrizada compatível com o modelo). |
| **Favoritos** | LibreChat: `favorites` (Mongo List) | `user_favorites` | - Mapear respeitando o limite rígido de 50 itens e a regra de exclusividade (Seção 3). |

---

## 2. Higienização de Credenciais (Sanitização MD5 → BCrypt)

> [!CAUTION]
> **Invalidação de Hashes MD5 e Senhas Legadas**
> Hashes criptográficos baseados em MD5 identificados nos legados não serão aceitos e são considerados inválidos no banco PostgreSQL de destino devido às vulnerabilidades de segurança da informação.

### Estratégia de Migração de Credenciais:
1. **Verificação de Força:** Se a senha na tabela antiga do MaxKB4j ou LibreChat for identificada como hash MD5 (comprimento de 32 caracteres hexadecimais), a senha do usuário **não será copiada**.
2. **Flag de Redefinição:** O usuário migrado com hash inválido MD5 será criado na nova tabela com uma flag `force_password_reset = true`.
3. **Criptografia Segura:** O fluxo de cadastro e redefinição de senhas na nova plataforma utilizará obrigatoriamente **BCrypt** com fator de trabalho 12.
4. **MFA e 2FA:** A flag `twoFactorEnabled: true` do LibreChat será importada diretamente, exigindo token TOTP válido caso o usuário tente realizar qualquer exclusão de conta.

---

## 3. Regra de Negócio: Normalização de Favoritos (LibreChat)

O script de migração das listas de favoritos dos usuários deve impor rigorosamente as regras originais do LibreChat:
1. **Limite Estrito:** Máximo de **50 itens** de favoritos por usuário. Itens sobressalentes além de 50 serão ignorados e registrados em `discard_log.md`.
2. **Exclusividade de Recursos:** Cada item favoritado deve possuir um e apenas um ID de recurso populado:
   - Apenas `agentId` preenchido.
   - Ou apenas a dupla `model` + `endpoint` preenchidos.
   - Ou apenas o identificador de `spec` preenchido.
   - Entradas violando essa regra de exclusividade (duplicadas ou mistas) serão higienizadas descartando os campos secundários de menor prioridade.
