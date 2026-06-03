# Especificação do Agent Package

Este documento estabelece a especificação formal do **Agent Package**, o artefato oficial e padronizado utilizado para declarar, empacotar e distribuir agentes especializados na **Enterprise Agent Operating Platform**.

---

## 1. Estrutura de Diretórios do Pacote

O Agent Package é distribuído como um arquivo compactado (ZIP/TAR) ou diretório contendo a seguinte estrutura obrigatória:

```text
compliance-agent/
├── manifest.yaml             # Metadados, versão, dependências e segurança
├── instructions/             # Instruções de comportamento do agente
│   ├── system.md             # Instruções do prompt do sistema (core behavior)
│   ├── handoff.md            # Regras de delegação para outros agentes
│   └── policies.md           # Regras de conformidade e segurança da organização
├── knowledge/                # Documentos locais de referência rápida (opcional)
│   └── compliance_rules.txt
├── tools/                    # Configurações de acesso a ferramentas externas (MCP)
│   └── mcp_db_reader.json
└── rules/                    # Regras estruturadas de execução determinística (opcional)
    └── workflow_rules.json
```

---

## 2. Schema do `manifest.yaml`

O manifesto principal define as identidades e fronteiras do agente. O formato deve respeitar estritamente o YAML abaixo:

```yaml
schemaVersion: "1.0.0"
agent:
  id: "uuid-v4-do-agente"
  name: "compliance-agent"
  version: "1.2.0" # SemVer
  description: "Agente responsável por auditar logs de conformidade técnica."
  author: "Platform Security Team"
  category: "governance"

dependencies:
  requiredRuntimes:
    - name: "CrewAI"
      minVersion: "0.28.0"
  mcpServers:
    - name: "database-auditor-server"
      version: "1.0.0"

security:
  isolationLevel: "SANDBOX" # SANDBOX | PROCESS | TRUSTED
  allowedDomains:
    - "api.github.com"
    - "internal.vault.corp"
  maxTimeoutSeconds: 45
  maxExecutionTokens: 4000

knowledge:
  usePlatformRag: true
  platformKnowledgeBases:
    - "uuid-da-base-de-conhecimento-corporativa"
```

---

## 3. Políticas de Ciclo de Vida e Segurança do Pacote
- **Versionamento (SemVer):** Atualizações que quebrem compatibilidade de chamadas de ferramentas (*breaking changes* em esquemas de ferramentas) devem incrementar obrigatoriamente a versão Major do agente.
- **Assinatura e Verificação:** A camada de coordenação `java-core` valida a assinatura digital SHA-256 do arquivo `manifest.yaml` em relação às chaves públicas corporativas registradas no banco antes de autorizar a publicação (`PUBLISHED`) e execução do pacote no cluster de workers.
- **Validação de Permissões de Domínio:** O worker cognitivo bloqueia a execução de ferramentas caso o agente tente acessar um domínio externo não listado explicitamente sob a seção `security.allowedDomains`.
