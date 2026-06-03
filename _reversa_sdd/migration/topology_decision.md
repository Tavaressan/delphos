# Decisão de Topologia: Monorepo & Estrutura de Pastas

Este documento define a organização física da árvore de diretórios do repositório unificado da **Enterprise Agent Operating Platform**, estabelecendo fronteiras claras para isolar os componentes de coordenação, processamento assíncrono e execução cognitiva.

---

## 1. Estrutura da Árvore de Diretórios (Monorepo)

A árvore física de pastas é padronizada como segue:

```text
/ (Monorepo Root)
├── .github/                      # CI/CD Workflows (GitHub Actions)
├── docs/                         # Documentação técnica e arquitetural global
├── frontend/                     # Interface do usuário (Next.js + Tailwind CSS)
│   ├── src/
│   ├── package.json
│   └── next.config.js
├── java-core/                    # Coordenação Central & Gateway (Spring Boot 3.2.5)
│   ├── src/main/java/            # Lógica Spring (RBAC, Gateway, Audit Controller)
│   ├── src/main/resources/       # Configurações application.yml e scripts Flyway
│   └── build.gradle
├── rust-services/                # Workers Determinísticos e Processadores (Rust 1.75+)
│   ├── Cargo.toml
│   ├── ingestion-worker/         # Worker de extração multiformato
│   ├── rag-worker/               # Worker de busca vetorial e similaridade
│   └── workflow-worker/          # Worker de execução de DAGs determinísticas
├── python-services/              # Runtimes Cognitivos de IA (Python 3.11)
│   └── crew-worker/              # Worker assíncrono conectado ao RabbitMQ
│       ├── src/
│       │   ├── runtime/          # Implementação do AgentRuntime e adaptadores CrewAI
│       │   ├── tools/            # Definição e empacotamento de ferramentas
│       │   └── main.py           # Entry-point (consumidor da fila do RabbitMQ)
│       └── requirements.txt
└── infrastructure/               # Arquivos de provisionamento e infraestrutura
    ├── docker/                   # Dockerfiles de apoio
    ├── kubernetes/               # Manifestos de deploy do K8s (Deployments, KEDA ScaledObjects)
    └── docker-compose.yml        # Orquestração local para ambiente de desenvolvimento
```

---

## 2. Fronteiras de Diretórios e Isolamento Técnico

Para garantir baixo acoplamento e permitir substituição de runtimes cognitivos sem retrabalho na camada de governança, aplicam-se as seguintes restrições de isolamento:

1. **Camada de Coordenação (`java-core`) isolada da Camada Cognitiva:**
   - O diretório `java-core` não possui arquivos Python, scripts de prompts ou dependências de LLMs.
   - Qualquer comunicação de tarefa cognitiva para o `crew-worker` ocorre serializada via eventos do RabbitMQ.
2. **Workers Rust (`rust-services`) vs. Workers Python (`python-services`):**
   - Os workers em Rust focam exclusivamente em tarefas de processamento de CPU e I/O intensivos de dados (extração física de arquivos binários pesados, indexação no PostgreSQL com pgvector).
   - O worker em Python (`crew-worker`) foca estritamente na orquestração cognitiva de múltiplos agentes baseados no CrewAI.
3. **Isolamento de Sandboxes de Execução de Ferramentas:**
   - Ferramentas cognitivas dinâmicas que necessitam executar códigos fornecidos pelos usuários ou agentes devem rodar em ambientes e runtimes isolados com restrições severas de execução de chamadas ao sistema, evitando vazamento no Host VM do Kubernetes.
