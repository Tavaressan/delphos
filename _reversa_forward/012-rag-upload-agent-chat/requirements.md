# Requirements: Upload de Documentos para RAG e Chat com Agentes Personalizados

> Identificador: `012-rag-upload-agent-chat`
> Data: `2026-06-15`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta feature entrega a capacidade de upload de documentos reais pelo frontend Next.js para ingestão semântica (RAG) em banco PostgreSQL com pgvector, operado de forma assíncrona pelo Ingestion Worker. Além disso, disponibiliza a interface de chat com agentes personalizados na tela de chat, onde o colaborador (crew-worker) pode interagir com agentes cujas diretrizes e base de conhecimento (markdowns e arquivos) foram previamente carregadas por um administrador via pacote ZIP.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#1.-Visão-Geral-do-Sistema` | O sistema utiliza orquestrador Spring Boot e pipeline vetorial Rust assíncrono. | 🟢 |
| `_reversa_sdd/domain.md#1.2.-RAG-e-Processamento-de-Documentos` | Define os conceitos de Documento, Chunks, Embeddings e Conversas no banco PostgreSQL. | 🟢 |
| `_reversa_sdd/domain.md#2.1.-Controle-de-Acesso-(RBAC)` | Define os papéis ROLE_ADMIN (controle total) e ROLE_USER (leitura e escrita restrita). | 🟢 |
| `_reversa_sdd/code-analysis.md#3.-Módulo:-rust-services` | Ingestão e vetorização através do `ingestion-worker` e microsserviços Axum. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Administrador (Admin) | Cadastrar agentes e suas regras de negócio em lote | O administrador acessa o painel, envia um arquivo ZIP com as políticas de compliance em markdown e cria o "Agente de Compliance". |
| Colaborador (Crew-Worker) | Realizar consultas semânticas e obter respostas guiadas por regras específicas | O colaborador seleciona o "Agente de Compliance" no chat e faz perguntas sobre diretrizes internas da empresa. |
| Colaborador (User) | Disponibilizar novos relatórios corporativos para busca semântica | O colaborador faz upload de um arquivo PDF com o relatório trimestral para indexação semântica geral. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** **Criação de Agente via Pacote ZIP:** Apenas usuários com `ROLE_ADMIN` podem criar agentes enviando um arquivo compactado (ZIP). O sistema deve salvar o ZIP original e seus arquivos descompactados no MinIO, extrair o markdown de diretrizes principais e gravá-lo no banco PostgreSQL. 🟢
   - Origem no legado: `_reversa_sdd/domain.md#2.1.-Controle-de-Acesso-(RBAC)`
   - Tipo: nova
2. **RN-02:** **Permissão de Upload de Documentos para RAG:** Tanto `ROLE_ADMIN` quanto `ROLE_USER` têm permissão para fazer upload de documentos corporativos (PDF, DOCX, TXT, MD) para o RAG. 🟢
   - Origem no legado: `_reversa_sdd/domain.md#2.1.-Controle-de-Acesso-(RBAC)`
   - Tipo: nova
3. **RN-03:** **Isolamento e Ingestão Híbrida do Agente:** Ao interagir com um agente no chat, o LLM recebe as diretrizes principais do markdown (salvas no banco) como instruções diretas de sistema (limite de 4.000 tokens). A busca semântica RAG é restrita exclusivamente aos trechos de conhecimento indexados no PostgreSQL que pertencem ao ID daquele agente. 🟡
   - Origem no legado: `_reversa_sdd/domain.md#2.1.-Controle-de-Acesso-(RBAC)` (DR02)
   - Tipo: nova
4. **RN-04:** **Validação Estrutural do ZIP:** O backend deve inspecionar o ZIP no upload para garantir que possua pelo menos um arquivo `.md` na raiz com as instruções de comportamento e tamanho total descompactado inferior a 20MB. Falhas de validação barram o processo e retornam erro HTTP 400 Bad Request detalhado. 🟢
   - Origem no legado: `_reversa_sdd/domain.md#2.1.-Controle-de-Acesso-(RBAC)`
   - Tipo: nova

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Upload de arquivos individuais no frontend | Must | O usuário seleciona e envia arquivos PDF/DOCX/TXT/MD pela interface e acompanha o progresso. O arquivo deve ser salvo no MinIO e inserido na fila de processamento no status `PROCESSING`. | 🟢 |
| RF-02 | Visualização de status de processamento do documento | Must | O frontend exibe uma lista de documentos recentes do usuário com status em tempo real (`UPLOADING`, `PROCESSING`, `INDEXED`, `FAILED`). | 🟢 |
| RF-03 | Dropdown de seleção de agentes no chat | Must | O console de chat exibe um seletor permitindo ao usuário escolher com qual agente falar. Ao escolher um agente, o chat carrega o histórico correspondente a esse agente. | 🟢 |
| RF-04 | Tela de administração para upload do ZIP do agente | Must | Uma interface para administradores fazerem upload de arquivo ZIP com as instruções e arquivos do agente, validando que o arquivo possua pelo menos um markdown. | 🟢 |
| RF-05 | Ingestão e extração de ZIP de agentes no backend | Must | O backend recebe o ZIP, valida seu tamanho e estrutura, extrai as diretrizes markdown para a tabela PostgreSQL de agentes (para injeção no prompt de sistema) e processa os documentos de conhecimento adicionais para o pgvector. | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | Descompactação e processamento do ZIP do agente em menos de 15 segundos para arquivos de até 10MB | Garante a agilidade no provisionamento de novos agentes sem reter recursos do worker | 🟡 |
| Segurança | Controle de acesso baseado em RBAC para upload do ZIP do agente | Somente administradores (ROLE_ADMIN) devem conseguir enviar configurações de agentes | 🟢 |
| Observabilidade | Rastreabilidade do ID do agente em todas as interações e logs de auditoria | Permite auditar quais agentes foram mais consultados e isolar fluxos de conversação | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Upload de documento real para RAG com sucesso
  Dado que o usuário com papel ROLE_USER está autenticado no frontend Next.js
  Quando arrasta o arquivo "contrato_prestacao.pdf" para a área de upload e clica em enviar
  Então o arquivo é carregado para o MinIO, o status inicial é exibido como PROCESSING e, após o processamento pelo ingestion-worker, muda para INDEXED.

Cenário: Tentativa de upload de ZIP de agente por usuário comum
  Dado que o usuário está autenticado com papel ROLE_USER
  Quando tenta enviar uma requisição HTTP POST para cadastrar um agente com o arquivo ZIP
  Então o backend retorna erro HTTP 403 Forbidden e o log de auditoria registra a tentativa não autorizada.

Cenário: Chat com agente compliance aplicando suas regras específicas
  Dado que o administrador cadastrou o agente "compliance" enviando um ZIP com instruções markdown sobre políticas de segurança
  Quando o colaborador seleciona o agente "compliance" no chat e envia a mensagem "Qual a política de senhas?"
  Então o sistema recupera as instruções de compliance e responde à pergunta com base exclusiva nos arquivos do agente.
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Upload de arquivos é fundamental para alimentar o banco de dados RAG real. |
| RF-02 | Must | Exibição de progresso e status evita ansiedade do usuário e valida o ciclo de vida. |
| RF-03 | Must | Seleção de agente permite que o usuário interaja com a persona adequada às suas necessidades. |
| RF-04 | Must | O cadastro e provisionamento do agente de forma flexível é vital para o valor de agentes múltiplos. |
| RF-05 | Must | Backend precisa suportar a extração e estruturação do pacote do agente para o chat. |
| RNF de Desempenho | Should | Facilita a usabilidade geral mas não impede o funcionamento se demorar um pouco mais. |

## 9. Esclarecimentos

- **Esclarecimento 1 (Dúvida sobre Persistência do ZIP):** O arquivo ZIP original e seus arquivos extraídos serão salvos no MinIO na pasta `agents-data/agent-<uuid>/`. A API Central lerá o markdown principal e salvará o conteúdo em formato de texto na tabela `agents` no PostgreSQL. Outros documentos adicionais de conhecimento do agente serão ingeridos pelo worker, gerando embeddings vinculados ao `agent_id` na tabela `document_chunks`.
- **Esclarecimento 2 (Dúvida sobre prompt vs RAG):** As regras diretas do markdown de diretrizes de comportamento do agente serão injetadas diretamente no System Prompt (limite de 4.000 tokens). Documentos informativos adicionais e bases de conhecimento extensas serão pesquisados via busca semântica (pgvector) e seus chunks relevantes serão adicionados ao contexto sob demanda.
- **Esclarecimento 3 (Dúvida sobre Validação do ZIP):** A validação será executada no backend, exigindo a presença de pelo menos um arquivo `.md` na raiz do ZIP e limitando o tamanho descompactado a 20MB. Falhas retornarão `400 Bad Request` com código JSON de erro estruturado, e a tela Next.js exibirá um modal informativo detalhado para o administrador.

## 10. Lacunas

Nenhuma lacuna ou dúvida pendente.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-15 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-06-15 | Integração das decisões de arquitetura e fechamento de dúvidas | reversa |
