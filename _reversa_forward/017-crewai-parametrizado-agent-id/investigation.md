# Investigation: CrewAI Parametrizado por Agent ID

> Identificador: `017-crewai-parametrizado-agent-id`
> Data: `2026-06-19`

## 1. Contexto da investigação

O objetivo foi avaliar como extrair `role`, `goal` e `backstory` do campo `system_instructions` (armazenado em `agents`) para parametrizar o `Agent` CrewAI, e como corrigir o isolamento de chunks na busca vetorial.

## 2. Parsing de system_instructions

### 2.1 Formato confirmado

O framework de governança de agentes da Alfabra utiliza YAML frontmatter no `.md` de definição do agente:

```markdown
---
role: HVAC Specialist
goal: Analisar e responder dúvidas técnicas sobre sistemas de HVAC...
backstory: Você é um especialista certificado em HVAC com 15 anos de experiência...
---
## Instruções adicionais
...
```

O `AgentService.java` extrai o primeiro `.md` raiz do ZIP e armazena seu conteúdo bruto em `agents.system_instructions`. O frontmatter é preservado integralmente no banco.

### 2.2 Alternativas avaliadas e descartadas

| Alternativa | Motivo do descarte |
|-------------|--------------------|
| Parsing por seções H2 (regex `## Objetivo`, `## Perfil`) | Formato de seções não confirmado; maior complexidade de manutenção |
| Biblioteca `python-frontmatter` | Dependência extra desnecessária; `PyYAML 6.0.1` já no `requirements.txt` |
| Inferência heurística (primeiro parágrafo = goal) | Frágil para textos longos; depende de convenções implícitas |
| Concatenar todos os `.md` do ZIP via MinIO | Fora de escopo; adiciona latência de rede e acoplamento ao MinIO |
| Separar em colunas distintas na tabela `agents` | Exigiria migration Flyway + mudança no `AgentService.java` — escopo separado |

### 2.3 Solução escolhida: `PyYAML.safe_load()`

Extração do bloco frontmatter com split simples por `---`, parse com `yaml.safe_load()`. Chaves esperadas: `role`, `goal`, `backstory`. Chaves ausentes caem para fallback individualmente (ex: frontmatter com `role` mas sem `goal` → usa goal genérico).

```python
import yaml

def parse(text: str, name: str) -> dict:
    text = text.strip().lstrip('﻿')   # remove BOM se presente
    if text.startswith('---'):
        parts = text.split('---', 2)
        if len(parts) >= 3:
            try:
                fm = yaml.safe_load(parts[1]) or {}
                return {
                    'role':      fm.get('role')      or name,
                    'goal':      fm.get('goal')      or _default_goal(name),
                    'backstory': fm.get('backstory') or text,
                }
            except yaml.YAMLError:
                pass
    return {'role': name, 'goal': _default_goal(name), 'backstory': text or _default_backstory()}
```

## 3. Isolamento de chunks por agent_id

### 3.1 Situação atual

`_search_db` em `crewai_adapter.py` filtra apenas por `tenant_id`:

```sql
SELECT content, 1 - (embedding <=> %s::vector) as similarity
FROM document_chunks
WHERE tenant_id = %s
ORDER BY similarity DESC
LIMIT 5
```

Isso retorna chunks de qualquer agente do tenant, incluindo documentos de outros agentes.

### 3.2 Padrão de referência

`DocumentChunkRepository.java` usa:

```java
@Query("SELECT dc FROM DocumentChunk dc JOIN dc.document d
        WHERE dc.tenantId = :tenantId
        AND (d.agent.id = :agentId OR d.agent IS NULL)")
```

O `OR d.agent IS NULL` inclui documentos RAG genéricos sem agente associado (confirmado na sessão de clarify: documentos avulsos co-existem com documentos de agente no mesmo tenant).

### 3.3 Query corrigida

```sql
SELECT dc.content, 1 - (dc.embedding <=> %s::vector) as similarity
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE dc.tenant_id = %s
  AND (d.agent_id = %s OR d.agent_id IS NULL)
ORDER BY similarity DESC
LIMIT 5
```

Parâmetros na ordem: `(embedding_str, tenant_id, agent_id)`. Quando `agent_id` for `None` (fallback), substituir por `UUID nulo` ou adaptar a query com ramo condicional.

## 4. Estrutura do módulo instruction_parser.py

Localização: `python-services/crew-worker/src/runtime/instruction_parser.py`

Exporta única função pública: `parse(text: str, name: str) -> dict[str, str]`

Retorna sempre um dicionário com as chaves `role`, `goal`, `backstory` — nunca lança exceção para o chamador.

## 5. Referências técnicas

- CrewAI `Agent` fields: `role`, `goal`, `backstory` — [docs.crewai.com](https://docs.crewai.com/concepts/agents)
- `PyYAML.safe_load()` — [pyyaml.org](https://pyyaml.org/wiki/PyYAMLDocumentation)
- `DocumentChunkRepository.java` — `java-core/src/main/java/com/company/core/domain/repositories/DocumentChunkRepository.java`