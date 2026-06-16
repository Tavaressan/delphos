# Guia de Onboarding: Upload de Documentos e Chat com Agentes

Este documento descreve o passo a passo executável para validar localmente as novas capacidades de upload de documentos e conversação com agentes no monorepo **alfabra_vector**.

---

## 1. Preparação do Ambiente

1.  **Atualizar o Banco de Dados:**
    Inicie os containers locais e execute a migração do Flyway para criar a tabela de agentes e colunas adicionais.
    ```bash
    # Se estiver com containers rodando, pare-os
    ./scripts/stop.sh
    
    # Restarte o ambiente local para carregar os novos volumes e scripts Flyway
    ./scripts/dev.sh
    ```
2.  **Preparar Pacote ZIP do Agente para Teste:**
    Crie uma pasta temporária local contendo um arquivo markdown com instruções e um PDF de suporte, compactando-os em um arquivo ZIP.
    *   `instructions.md` (regras do agente):
        ```markdown
        Você é o Agente de Compliance da empresa.
        Sua principal diretriz é proibir terminantemente o compartilhamento de senhas via chat ou e-mail.
        Se perguntado sobre senhas, responda citando a Regra de Segurança 101.
        ```
    *   `politica_uso.txt` (conhecimento adicional):
        ```text
        A Regra de Segurança 101 estipula que senhas devem ser alteradas a cada 90 dias.
        ```
    *   Compacte ambos em `compliance-agent.zip`.

---

## 2. Cenários de Teste Executáveis

### Cenário 1: Ingestão de Documento Geral para RAG (ROLE_USER)
1.  Acesse o frontend Next.js em `http://localhost:3000`.
2.  Faça login com um usuário comum (`ROLE_USER`).
3.  Navegue até a nova tela **Documentos** (`/documents`).
4.  Arraste um arquivo PDF corporativo genérico (ex: `manual_empresa.pdf`).
5.  **Validação Visual:**
    *   A barra de progresso do upload deve aparecer.
    *   O status deve passar de `UPLOADING` para `PROCESSING`.
    *   Após alguns segundos, o status no painel deve mudar para `INDEXED`.
6.  Abra o chat comum e faça perguntas cujas respostas estejam contidas no manual. A resposta do LLM deve utilizar RAG no documento recém-subido.

---

### Cenário 2: Cadastro de Agente Personalizado via ZIP (ROLE_ADMIN)
1.  Faça login com um usuário administrador (`ROLE_ADMIN`) no console do frontend.
2.  Acesse a seção de **Gerenciamento de Agentes** (`/admin/agents`).
3.  Clique em **Criar Novo Agente**.
4.  Preencha:
    *   **Nome:** Compliance
    *   **Descrição:** Agente focado em segurança e conformidade de TI.
5.  Selecione o arquivo `compliance-agent.zip` criado no passo 1 e clique em **Criar Agente**.
6.  **Validação de Banco & Ingestão:**
    *   Verifique se o agente foi inserido na tabela `agents` com as instruções extraídas do `instructions.md`.
    *   Verifique se `politica_uso.txt` foi inserido no MinIO e na tabela `documents` com o `agent_id` correspondente.
    *   Monitore os logs do `ingestion-worker` em Rust:
        ```bash
        ./scripts/logs.sh ingestion-worker
        ```
    *   O status do documento deve transicionar para `INDEXED` após alguns segundos.

---

### Cenário 3: Chat com Agente e Isolamento de Contexto
1.  Como usuário comum, navegue até a tela do **Chat** (`/chat`).
2.  Na caixa de diálogo de nova conversa, clique no dropdown de seleção de agente e escolha **Compliance**.
3.  Envie a mensagem: *"Como devo compartilhar minhas credenciais de banco de dados?"*
4.  **Validação de Resposta (Injeção de Diretriz):**
    *   O LLM deve seguir rigorosamente o tom proibitivo de `instructions.md` e referenciar a "Regra de Segurança 101" na resposta.
5.  Envie a mensagem: *"Qual a validade das senhas conforme a Regra de Segurança 101?"*
6.  **Validação de Contexto RAG do Agente:**
    *   O LLM deve consultar o arquivo `politica_uso.txt` indexado especificamente para o agente e responder "90 dias".
7.  Crie um novo chat geral (sem selecionar o agente Compliance) e repita a pergunta *"Qual a validade das senhas conforme a Regra de Segurança 101?"*.
    *   **Validação de Isolamento RAG:** O LLM não deve saber a resposta ou não deve utilizar o arquivo `politica_uso.txt` para responder, provando o isolamento de busca semântica por `agent_id`.
