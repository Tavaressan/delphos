# Discard Log — Padrões e Tecnologias Obsoletas

Este documento registra formalmente as decisões técnicas, ferramentas e arquiteturas dos legados **LibreChat** e **MaxKB4j** que foram consideradas obsoletas ou incompatíveis, sendo **descartadas** no projeto da **Enterprise Agent Operating Platform**.

---

## 1. Banco de Dados MongoDB para Busca Textual (MaxKB4j)
- **Motivo do Descarte:** A arquitetura-alvo da Enterprise Agent Operating Platform consolidou todas as necessidades relacionais e vetoriais em um banco de dados unificado (**PostgreSQL** com a extensão `pgvector`). Manter um MongoDB ativo exclusivamente para tokenização e busca textual clássica introduz custos operacionais desnecessários, latência de sincronização dupla escrita e complexidade de infraestrutura.
- **Substituto:** A busca híbrida e textual foi internalizada no PostgreSQL através de índices GIN com `tsvector` para busca por texto completo (FTS) e índices HNSW com `vector_cosine_ops` para busca vetorial semântica.

## 2. Autenticação MD5 Legada e Migrações (LibreChat / MaxKB4j)
- **Motivo do Descarte:** Baixo nível de segurança criptográfica para hashes de senhas corporativas. O descarte de qualquer compatibilidade retroativa com hashes MD5 é mandatório por compliance de segurança da informação da plataforma.
- **Substituto:** A criptografia baseada em **BCrypt** com salt dinâmico e forte fator de trabalho será obrigatória para todas as contas de usuário desde a primeira versão migrada.

## 3. Servidores FastAPI Síncronos Permanentes (Módulos de Apoio)
- **Motivo do Descarte:** Evitar *hops* HTTP desnecessários e o acoplamento síncrono. O uso de APIs REST baseadas em FastAPI rodando permanentemente no meio do pipeline de execução de agentes gera desperdício de recursos computacionais quando o sistema está ocioso.
- **Substituto:** Arquitetura orientada a eventos usando **RabbitMQ**. Os workers em Python executando as tarefas do CrewAI (`crew-worker`) escutam diretamente as filas de mensagens e sobem sob demanda no Kubernetes via KEDA.

## 4. Dependência de Armazenamento Local Persistente em Containers
- **Motivo do Descarte:** Incompatibilidade com escalabilidade horizontal em Kubernetes. Os containers de workers e do backend devem ser tratados como efêmeros. O acúmulo de arquivos físicos locais (como anexos temporários e sandboxes de execução de código) causa inconsistência de dados em ambientes distribuídos.
- **Substituto:** Persistência exclusiva e centralizada de arquivos de sandbox e anexos de conversação no serviço local de buckets S3 (**MinIO**), gerando URLs assinadas seguras com TTL.
