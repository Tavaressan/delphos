# Regras de Negócio Consolidadas (Target Business Rules)

Este documento consolidado reúne e formaliza as regras de negócio operacionais da **Enterprise Agent Operating Platform**, originárias dos legados **LibreChat** e **MaxKB4j**, adaptadas para as diretrizes de governança e infraestrutura distribuída da nova plataforma.

---

## 1. Regras de Controle de Acesso e Identidade

### 1.1. Promoção Automática de Administrador
- O primeiro usuário a se registrar no sistema recebe o papel administrativo global (`SystemRoles.ADMIN`). Usuários subsequentes recebem o papel de usuário padrão (`SystemRoles.USER`).

### 1.2. Proteção Anti-Enumeração de E-mails
- Tentativas de cadastro com e-mails já existentes sofrem um atraso de **1 segundo** artificial e retornam mensagem genérica de sucesso para impedir varreduras de emails no banco de dados.

### 1.3. Proteção 2FA de Exclusão de Contas
- A exclusão de uma conta que possua a flag `twoFactorEnabled: true` exige a validação obrigatória de um código TOTP atualizado ou código de backup válido.

---

## 2. Regras de Recursos e Favoritos (LibreChat)

### 2.1. Exclusividade e Limite de Favoritos
- A lista de favoritos do usuário tem um limite máximo de **50 itens**. Cada item na lista deve conter exclusivamente um tipo de recurso favoritado: ou apenas `agentId`, ou apenas o par `model` + `endpoint`, ou apenas `spec`. Nenhuma combinação desses tipos é permitida no mesmo favorito.

### 2.2. Unicidade de Overrides de Configurações
- Para evitar conflitos de aplicação de configurações sobrepostas no mesmo escopo, impõe-se uma restrição de chave única para o par `{ principalType, principalId, tenantId }`.

### 2.3. Resolução de `alwaysApply` em Skills
- O flag `alwaysApply` que define se as instruções de uma Skill devem ser inseridas incondicionalmente no prompt do agente é resolvido pela ordem de precedência:
  1. Payload de importação enviado diretamente via API.
  2. Parâmetro `always-apply` definido no YAML frontmatter de metadados da Skill.
  3. Parsing do corpo em Markdown via regex procurando a declaração estruturada de ativação.

---

## 3. Regras de Ingestão e Recuperação Vetorial (MaxKB4j)

### 3.1. Escrita Transacional no PostgreSQL (Adaptado do Legado)
- **Regra:** Sempre que um parágrafo/documento é indexado, reindexado ou tem seu status alterado, a operação deve ser replicada de forma consistente em ambas as tabelas do PostgreSQL:
  1. Na tabela de metadados relacionais (controle de arquivos/documentos).
  2. Na tabela `document_chunks` (armazenamento físico de embeddings e textos).
- Ambas as escritas devem rodar na mesma transação de banco de dados (`@Transactional`). Falhas em qualquer escrita causam o rollback completo da transação. O descarte do MongoDB para busca textual removeu a necessidade de sincronização múltipla de bancos.

### 3.2. Fusão de Resultados da Busca Híbrida
- O algoritmo de busca híbrida executa buscas paralelas assíncronas no PostgreSQL (busca vetorial pgvector vs. busca textual FTS).
- A pontuação (score) textual FTS é normalizada dividindo o valor retornado pelo maior score encontrado (com um limite mínimo de 2.0).
- A fusão de resultados remove duplicados de `paragraphId` (ou `chunk_id`). Quando uma partição é retornada em ambas as buscas, **mantém-se a maior pontuação (Max Score)**.
- Os resultados finais são ordenados pelo score decrescente; havendo empate, o critério de desempate é a **soma acumulada das pontuações** de todas as correspondências daquele parágrafo no resultado original.

### 3.3. Limites Físicos no Upload de Arquivos
- O carregamento de arquivos para montagem de bases de conhecimento é limitado por configurações da própria entidade de Conhecimento (`KnowledgeEntity`):
  - **Tamanho do arquivo:** Cada arquivo individual não pode exceder o limite de bytes configurado no campo `fileSizeLimit`.
  - **Quantidade de arquivos:** A quantidade de arquivos enviados simultaneamente não pode exceder o `fileCountLimit` da base de conhecimento.

---

## 4. Regras de Execução e Memória de Longo Prazo

### 4.1. Ciclo e Fusão de Memória de Longo Prazo (Desacoplado)
- A extração é disparada assintoticamente a cada lote de `pageSize` mensagens da conversa.
- O prompt avança na análise em 4 pilares: Preferências (estilo e formatação), Contexto (perfil técnico do usuário), Regras Claras (restrições impostas) e Metas Atuais (projetos ativos).
- A gravação desses pilares é persistida no `Memory Service` isoladamente do runtime CrewAI.

### 4.2. Sandbox de Execução de Scripts Groovy (Três Camadas)
- Qualquer execução de scripts de ferramentas em Groovy segue o isolamento de três camadas:
  1. **Camada de Compilação (AST):** Bloqueia expressões reflexivas, constantes não primárias e injeção `@Grab`.
  2. **Camada de Runtime (Whitelist):** Bloqueia chamadas de métodos ou classes fora da whitelist rígida do JDK.
  3. **Camada de Tempo Limite (Timeout):** Aborta a execução em thread isolada caso exceda **60 segundos**.
