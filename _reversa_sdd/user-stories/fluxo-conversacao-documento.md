# História de Usuário: Upload e Consulta de Documentos Corporativos (RAG)

## Histórico de Revisões
* **2026-05-25:** Versão Inicial gerada pelo agente **Redator**.

---

## 1. Descrição (User Story)

**Como um** colaborador corporativo da empresa,
**Eu quero** fazer o upload de manuais e regulamentos internos na plataforma e conversar com um assistente virtual sobre esses arquivos,
**Para que eu possa** tirar dúvidas operacionais e obter respostas baseadas estritamente nas regras da organização de forma rápida e confiável.

---

## 2. Cenários de Teste Relacionados (Critérios de Aceite)

### Cenário 1: Envio bem-sucedido de documento e vetorização completa
* **Dado** que eu sou um usuário com o papel `ROLE_USER` e estou logado no sistema,
* **E** possuo um arquivo PDF de regulamento de viagens com 2MB de tamanho,
* **Quando** eu arrasto e solto o arquivo na interface e clico em "Enviar",
* **Então** a API central Spring Boot deve registrar o documento com o status `UPLOADING` e salvá-lo no MinIO.
* **E** o Ingestion Worker (Rust) deve ler o banco de dados, alterar o status para `PROCESSING`, extrair o texto, gerar os embeddings com dimensionalidade parametrizável (de acordo com o modelo configurado) e persistir os chunks na tabela `document_chunks`.
* **E** finalmente atualizar o status do documento para `INDEXED`.

### Cenário 2: Consulta por chat com recuperação de contexto (RAG)
* **Dado** que o documento "regulamento_viagens.pdf" foi indexado com status `INDEXED`,
* **E** eu abro um novo chat com o título "Dúvidas de Viagens",
* **Quando** eu envio a pergunta "Qual é o valor máximo da diária de hotel?",
* **Então** o Spring Boot deve calcular o embedding da pergunta, realizar uma busca por similaridade de cosseno no Postgres na tabela `document_chunks` para retornar os trechos mais parecidos.
* **E** injetar os trechos encontrados no prompt e enviar à API do LLM externo.
* **E** retornar a resposta enriquecida e segura ao meu chat, registrando o log na tabela `audit_logs` com a ação `QUERY_RAG`.

### Cenário 3: Falha no processamento do documento
* **Dado** que o arquivo enviado possui criptografia ou está corrompido,
* **Quando** o processador em Rust tenta extrair o texto do arquivo e falha,
* **Então** o Ingestion Worker deve atualizar o status do documento para `FAILED` no Postgres.
* **E** gravar a mensagem de erro detalhada no campo `processing_error`.
* **E** exibir visualmente para mim na interface que o processamento do arquivo falhou.
