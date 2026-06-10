# Onboarding: GCP Authentication for Rust Services

> Identificador: `008-google-ai-auth`
> Data: `2026-06-09`

Este guia descreve os passos executáveis para configurar, executar e validar a integração da autenticação GCP nos microsserviços em Rust localmente.

## 1. Pré-requisitos

1. Ter o arquivo JSON de chaves da conta de serviço GCP corporativa salvo em sua máquina.
2. Docker e Docker Compose instalados.
3. Ferramentas Rust (`cargo`, `rustc`) se for compilar fora do contêiner para testes.

## 2. Passo a Passo de Configuração

### Passo 2.1: Configurar Variáveis de Ambiente
Abra o arquivo `.env` localizado na raiz do projeto e configure a chave do Google de maneira limpa (removendo qualquer duplicidade anterior):

1. Defina `GOOGLE_APPLICATION_CREDENTIALS` apontando para o caminho absoluto do seu arquivo de chaves JSON.
2. Verifique se `GCP_PROJECT_ID` e `GCP_LOCATION` correspondem aos dados da chave.
3. Defina o provedor como real: `EMBEDDING_PROVIDER=real`.

Exemplo:
```ini
GOOGLE_APPLICATION_CREDENTIALS="/Users/vitortavares/Desktop/Chaves/.gcp/alfabra-platform-4c4659fbc681.json"
GCP_PROJECT_ID=alfabra-platform
GCP_LOCATION=us-central1
EMBEDDING_PROVIDER=real
EMBEDDING_MODEL=text-embedding-004
```

### Passo 2.2: Testar Compilação Local do Rust
Navegue para a pasta `rust-services` e certifique-se de que a dependência do workspace foi resolvida corretamente executando a compilação:

```bash
cargo build --workspace
```

## 3. Execução e Validação

### Passo 3.1: Iniciar os Contêineres
Inicie o Docker Compose expondo o volume configurado para montagem automática da chave:

```bash
docker compose up -dev embedding-service
```

### Passo 3.2: Verificar Inicialização
Examine os logs do container do `embedding-service` para garantir que o `AuthenticationManager` inicializou com sucesso no startup:

```bash
docker compose logs -f embedding-service
```

*Comportamento esperado em caso de erro:* Se a chave for inválida ou não encontrada no caminho, a inicialização falhará e apresentará mensagem descritiva do erro, impedindo o contêiner de subir com configurações defeituosas.

### Passo 3.3: Disparar Chamada de Teste
Faça uma chamada HTTP POST de teste para o endpoint de embeddings para validar se a comunicação com a Vertex AI funciona corretamente com o token OAuth2:

```bash
curl -X POST http://localhost:8000/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input": ["teste de autenticação gcp"], "dimensions": 768}'
```

**Resultado esperado:** Retorno de status `200 OK` contendo a lista com o vetor numérico gerado e o modelo `text-embedding-004` nos metadados.
