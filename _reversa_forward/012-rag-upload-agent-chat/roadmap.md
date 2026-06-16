# Roadmap: Ingestão de Documentos para RAG e Chat com Agentes

> Identificador: `012-rag-upload-agent-chat`
> Data: `2026-06-15`
> Requirements: `_reversa_forward/012-rag-upload-agent-chat/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Esta feature implementa o upload de arquivos reais e a criação de agentes personalizados no monorepo **alfabra_vector**. 
*   No **Frontend (Next.js)**, adiciona-se suporte a upload de arquivos (PDF/DOCX/TXT/MD) com exibição de progresso e tela de administração para criação de agentes via upload de ZIP contendo instruções markdown.
*   No **Backend (Java Core)**, cria-se a lógica de recebimento e descompactação do ZIP de agente, a persistência de regras de diretrizes de comportamento no banco PostgreSQL e o salvamento dos anexos no MinIO. A API de chat é alterada para injetar o prompt do agente no System Message do LLM e limitar a busca semântica do RAG apenas aos trechos associados àquele agente.
*   O **Ingestion Worker (Rust)** é reaproveitado para processar e gerar embeddings dos documentos vinculados aos agentes, os quais são indexados com a nova marcação de `agent_id` no PostgreSQL.

---

## 2. Princípios aplicados

Não existem princípios customizados definidos no arquivo `.reversa/principles.md` do projeto. A feature segue os padrões de segurança baseados no controle RBAC legado.

---

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Armazenar regras markdown na tabela `agents` do PostgreSQL | Permite leitura em texto puro ultra-rápida no momento de montar o prompt do LLM, evitando latência de rede. | Ler arquivo do MinIO para cada mensagem de chat enviada pelo usuário. | 🟢 |
| D-02 | Validação estrutural síncrona do ZIP no backend Java | Impede o provisionamento de agentes com pacotes inválidos ou corrompidos, retornando HTTP 400 Bad Request imediatamente. | Delegar descompactação e validação assincronamente ao Rust. | 🟢 |
| D-03 | Estratégia híbrida de injeção de contexto (System Prompt + RAG) | Regras diretrizes de comportamento são injetadas no System Prompt do LLM, enquanto a base de conhecimento de suporte é filtrada e recuperada via RAG. | Injetar todos os markdowns informativos no System Prompt (estoura o limite de tokens da janela de contexto). | 🟡 |

---

## 4. Premissas

Nenhuma premissa adotada a partir de dúvidas, visto que todos os marcadores de dúvida do requirements foram resolvidos com consentimento prévio do usuário.

---

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| Next.js Frontend | `_reversa_sdd/architecture.md#2.-Tecnologias-Empregadas` | componente-novo / contrato-alterado | Adiciona interface de upload de documentos, dropdown de seleção de agente no chat, e console administrativo de criação de agentes. |
| Spring Boot Java Core | `_reversa_sdd/architecture.md#1.-Visão-Geral-do-Sistema` | contrato-novo / regra-alterada | Adiciona controladores REST para criação de agentes (descompactando o ZIP) e gerenciamento de arquivos. Altera o prompt builder do chat para injetar instruções de agentes. |
| PostgreSQL Database | `_reversa_sdd/architecture.md#2.-Tecnologias-Empregadas` | contrato-alterado | Criação da tabela `agents` e inclusão da coluna `agent_id` nas tabelas `documents` e `chats`. |

---

## 6. Delta no modelo de dados

*   **Resumo das mudanças:** Criação da tabela `agents` para armazenar o nome, descrição e instruções principais do agente. Adição da chave estrangeira `agent_id` nas tabelas `documents` e `chats` para suportar o isolamento de busca semântica RAG e a vinculação da sessão de chat.
*   **Detalhe completo em:** `_reversa_forward/012-rag-upload-agent-chat/data-delta.md`

---

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| Upload de Documentos para RAG | HTTP (multipart/form-data) | `_reversa_forward/012-rag-upload-agent-chat/interfaces/upload-document-api.md` |
| Criação de Agente via ZIP | HTTP (multipart/form-data) | `_reversa_forward/012-rag-upload-agent-chat/interfaces/create-agent-api.md` |
| Listagem de Agentes | HTTP (GET) | `_reversa_forward/012-rag-upload-agent-chat/interfaces/list-agents-api.md` |
| Chat com Agente | HTTP (POST) | `_reversa_forward/012-rag-upload-agent-chat/interfaces/chat-agent-api.md` |

---

## 8. Plano de migração

1.  Executar script de migração Flyway `V2__add_agents_and_rag_isolation.sql` para atualizar o esquema físico do PostgreSQL.
2.  Atualizar a configuração do SDK do MinIO no `java-core` para garantir que o bucket `agents-data` seja criado e esteja disponível na inicialização.
3.  Implantar a nova versão do frontend Next.js contendo as telas administrativas de agentes e a seleção no console de chat.

---

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Ataque de Zip Bomb (arquivos enormes disfarçados) durante descompactação do agente | alto | baixo | Validar tamanho total descompactado síncronamente no backend Java (limite rígido de 20MB) e barrar a requisição. |
| Ingestão concorrente de múltiplos arquivos do ZIP travando o Ingestion Worker Rust | médio | médio | Utilizar transações atômicas e garantir que o polling do Rust filtre e ordene as filas sem gerar deadlock no banco. |

---

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado
- [ ] Testes de integração de API criados no modulo correspondente
- [ ] Teste de isolamento de contexto RAG validado com sucesso conforme cenário do onboarding

---

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-15 | Versão inicial gerada por `/reversa-plan` | reversa |
