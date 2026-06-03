# Modelo de Multi-Tenancy e Isolamento Corporativo

Este documento especifica os mecanismos de isolamento e governança organizacional multi-tenant da **Enterprise Agent Operating Platform**, garantindo a segurança lógica e física dos dados em nível de infraestrutura compartilhada.

---

## 1. Segregação de Dados Relacionais e Vetoriais

A plataforma adota um modelo de isolamento lógico de banco de dados com esquema compartilhado (*shared database, shared schema*), segregado por identificadores organizacionais:

```
[Cliente A: Tenant 1] ──► (Filtro Obrigatório: tenant_id) ──┐
                                                           ├─► [PostgreSQL + pgvector]
[Cliente B: Tenant 2] ──► (Filtro Obrigatório: tenant_id) ──┘
```

### 1.1. Segregação Relacional
- **Campo `tenant_id`:** Todas as tabelas críticas (incluindo `conversations`, `document_chunks`, `agent_executions` e logs de auditoria) possuem obrigatoriamente a coluna `tenant_id UUID`.
- **Filtro Estrito em Nível de Aplicação:** A camada Spring Boot (`java-core`) impõe via aspectos (AOP) e filtros do Hibernate (`@Filter`) a injeção incondicional da cláusula SQL `WHERE tenant_id = :tenantId` para todas as consultas do banco.
- **Grants Globais da Plataforma (LibreChat):** Conforme mapeado no legado do LibreChat, as atribuições de capacidades globais de sistema (System Grants) omitirão o campo `tenant_id` no banco de dados para evitar conflitos com tenants específicos (a consulta de grants globais utiliza cláusula `{ tenant_id: { $exists: false } }`).

### 1.2. Segregação Vetorial
- **Filtro Composto pgvector:** Toda consulta semântica de busca por similaridade de cosseno via pgvector deve incluir a restrição do Tenant na query:
  ```sql
  SELECT id, content, embedding <=> :query_vector AS distance 
  FROM document_chunks 
  WHERE tenant_id = :tenantId 
  ORDER BY distance 
  LIMIT :limit;
  ```
- **Índices HNSW Isolados:** O banco de dados PostgreSQL utiliza índices compostos HNSW ou validação relacional antes de computar o cosseno para evitar buscas semânticas transversais entre organizações.

---

## 2. Segregação de Mensagens e Filas (RabbitMQ)

Para evitar vazamento ou atrasos sistemáticos causados por picos de processamento cognitivo de uma única organização sobre a infraestrutura global:
- **Filas Lógicas ou Virtual Hosts (vhosts):** Clientes corporativos de grande porte com necessidades rígidas de compliance podem ser mapeados para Virtual Hosts dedicados no RabbitMQ, isolando inteiramente as trocas de mensagens.
- **Priorização baseada em Quota:** A camada Spring monitora os limites do tenant e insere um cabeçalho de prioridade na mensagem de job do RabbitMQ de acordo com a quota de faturamento contratada, processando prioritariamente tarefas de tenants VIP.

---

## 3. Limites Organizacionais e Quotas
- **Tenant Limits:** O banco armazena limites configurados por organização para:
  - Máximo de documentos indexados (`max_indexed_documents`).
  - Limite de bytes total de arquivos persistidos no S3/MinIO.
  - Quota diária e mensal de tokens consumidos em modelos de LLM.
- **Validação:** A camada de coordenação valida esses limites antes de enfileirar qualquer job de ingestão ou execução cognitivo, respondendo com erro imediato de quota excedida no estado do componente.
