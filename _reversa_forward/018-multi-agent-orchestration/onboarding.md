# Onboarding: Multi-agent Orchestration — Delegação de tarefas entre agentes

> Identificador: `018-multi-agent-orchestration`
> Data: `2026-06-25`

Este documento descreve as etapas para um desenvolvedor ou engenheiro de QA validar e testar a delegação de tarefas entre agentes pela primeira vez.

## 1. Pré-requisitos
- Docker e Docker Compose instalados e em execução.
- Banco de dados PostgreSQL e RabbitMQ operando de forma saudável.
- Ferramenta de testes do JUnit/Cucumber configurada no `java-core`.

## 2. Preparação do Ambiente de Testes
1. Inicialize a stack local via Docker Compose:
   ```bash
   ./scripts/dev.sh
   ```
2. Crie um arquivo ZIP de teste para o agente (`agent-test.zip`) contendo:
   - Um arquivo `instructions.md` com as system instructions do orquestrador.
   - O arquivo `manifest.yaml` habilitando a ferramenta de busca:
     ```yaml
     schema_version: 1
     agent_settings:
       allow_delegation: true
       tools:
         - name: "search_knowledge_base"
           enabled: true
     ```

## 3. Passo a Passo do Teste Funcional
1. Faça o upload do ZIP do agente criado através da interface Web do design-system ou enviando um POST HTTP para a API de criação de agentes:
   ```bash
   curl -X POST -F "file=@agent-test.zip" http://localhost:8080/api/agents
   ```
2. Realize o upload de um documento de conhecimento corporativo associado ao agente para indexação.
3. Certifique-se de que o documento transicionou para o estado `INDEXED` (indicando que os chunks foram gerados e salvos no pgvector pelo `ingestion-worker`).
4. Abra uma conversa de teste com o agente orquestrador e envie um prompt que exija a recuperação de informações do documento (ex: *"Quais são os limites de velocidade da escada rolante Alfabra modelo Alpha-4?"*).
5. Monitore os logs do container `crew-worker` para validar o ciclo de delegação:
   - Verifique que o `crew-worker` publicou a solicitação na fila `agent.retrieval.delegated.jobs`.
   - Verifique que o `rag-worker` processou a busca vetorial por similaridade e retornou os chunks na fila de eventos.
   - Valide que o orquestrador consolidou os chunks e gerou a resposta final com base no contexto.
6. Verifique o banco de dados na tabela `tool_calls` para constatar se a chamada de busca foi registrada vinculada à execução correspondente.
