# Onboarding: Instruções de Validação e Testes Locais

> Identificador da feature: `003-rag-worker-rust`

Este guia orienta o desenvolvedor ou agente a realizar os testes de fumaça e validar a integração do `rag-worker` com o AnythingLLM localmente.

## 1. Pré-requisitos e Configuração de Ambiente

1.  Certifique-se de que o stack completo do Docker Compose está funcional.
2.  No arquivo `.env` da raiz do repositório, insira as credenciais do AnythingLLM:
    ```env
    ANYTHINGLLM_API_KEY="seu-token-da-api-aqui"
    ANYTHINGLLM_API_URL="http://anythingllm:3001/api/v1"
    ```

## 2. Inicialização dos Serviços

Suba o Docker Compose atualizado que inclui o AnythingLLM padronizado na porta 3001 e o novo build do worker Rust:

```bash
# Subir serviços principais e o worker
docker compose up -d postgres rabbitmq anythingllm
```

## 3. Preparando o AnythingLLM

1.  Acesse o painel do AnythingLLM no seu navegador: `http://localhost:3001`
2.  Crie uma conta e vá em **Developer settings** para gerar um token API. Cole-o na variável `ANYTHINGLLM_API_KEY` do `.env`.
3.  Crie um workspace de teste com o slug `tenant-test-workspace`.
4.  Suba alguns documentos e indexe-os no workspace.

## 4. Teste de Execução e Logs

Publique uma mensagem de teste no RabbitMQ para acionar o `rag-worker`:

```json
{
  "execution_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99",
  "tenant_id": "test-workspace",
  "query": "Quais são os controles de segurança do sistema?"
}
```

A mensagem deve ser publicada na exchange `agent.execution.exchange` com a routing key `agent.retrieval.requested`.

Valide se o `rag-worker` consumiu e processou com sucesso visualizando os logs do container:
```bash
docker compose logs -f rag-worker
```
O log deve exibir as transições de estado para `RetrievalStarted`, a requisição enviada ao AnythingLLM e a publicação bem-sucedida do evento `RetrievalCompleted`.
