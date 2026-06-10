# Requirements: Testes End-to-End e Validação de Scripts

> Identificador: `006-e2e-tests-rag-llm`
> Data: `2026-06-05`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta especificação define os requisitos para a criação de uma suíte completa de testes automatizados End-to-End (E2E) e a validação de integridade dos scripts utilitários do projeto Alfabra Vector. A feature visa garantir que o pipeline de RAG (upload, processamento, vetorização via microsserviços e persistência vetorial com pgvector) funcione sem regressões, validando a conexão com os provedores de LLM (tanto em modo real com Vertex AI quanto em modo mockado) e assegurando que os scripts de infraestrutura local instalem, inicializem, parem e reiniciem o ambiente de forma previsível e sem erros de execução.

## 2. Contexto a partir do legado

A suíte de testes de integração e validação de scripts ancora-se diretamente nas configurações de portas, dependências e fluxos mapeados na extração reversa.

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#2. Tecnologias Empregadas` | A infraestrutura local inclui PostgreSQL (com pgvector), Redis, MinIO, RabbitMQ, Caddy, Spring Boot backend e Next.js frontend. | 🟢 CONFIRMADO |
| `_reversa_sdd/architecture.md#4. Dívidas Técnicas Identificadas` | Há uma ausência completa de testes automatizados nos serviços Rust (`document-processing`, `embedding-service`, `ingestion-worker`) e pouca/nenhuma cobertura no Spring Boot. | 🟢 CONFIRMADO |
| `_reversa_sdd/domain.md#2.2. Pipeline RAG e Processamento` | Os microsserviços (`document-processing` e `embedding-service`) expõem o endpoint `/healthz` respondendo "OK" na porta 8000. | 🟢 CONFIRMADO |
| `_reversa_sdd/inventory.md#⚙️ Configurações e DevOps` | O repositório contém os scripts de controle de ciclo de vida do ambiente: `setup.sh`, `dev.sh`, `stop.sh` e `reset.sh`. | 🟢 CONFIRMADO |
| `_reversa_sdd/code-analysis.md#⚙️ 3. Módulo: rust-services (Microsserviços de IA)` | O `embedding-service` possui dois provedores configuráveis via variável de ambiente: `mock` (geração determinística local) e `real` (chamando Vertex AI). | 🟢 CONFIRMADO |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Engenheiro de Software / QA | Executar testes locais rápidos para validar o comportamento integrado de todas as peças após alterações de código. | O desenvolvedor altera a lógica de chunking no worker de ingestão e executa o script de E2E, que valida o fluxo inteiro desde a ingestão do documento até a consulta no chat sem quebras. |
| Operador de DevOps / CI-CD | Assegurar que os scripts de onboarding (`setup.sh`, `reset.sh`) e as conexões com as APIs de LLM externas não quebrem silenciosamente. | O pipeline de CI é disparado, executa os scripts de reinicialização de containers, roda o teste E2E RAG em modo mock e valida que o empacotamento Docker está íntegro. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01: Automação e Validação Físicas de Scripts** 🟢
   - Origem no legado: `_reversa_sdd/inventory.md#⚙️ Configurações e DevOps`
   - Tipo: nova
   - Descrição: Os scripts `setup.sh`, `dev.sh`, `stop.sh` e `reset.sh` devem possuir verificações de precondições (presença de dependências como `docker` e `docker compose`) e retornar código de saída `0` quando executados com sucesso no fluxo padrão do projeto.

2. **RN-02: Ciclo Completo RAG End-to-End** 🟢
   - Origem no legado: `_reversa_sdd/domain.md#2.2. Pipeline RAG e Processamento`
   - Tipo: nova
   - Descrição: O teste de fumaça E2E deve cobrir o fluxo completo do pipeline RAG:
     - Envio de documento via HTTP POST simulado (ou upload no MinIO).
     - Atualização de status da fila e do banco (`UPLOADING` -> `PROCESSING` -> `INDEXED`).
     - Geração de chunks no banco com embeddings válidos no PostgreSQL + pgvector.
     - Envio de mensagem de chat simulando o RAG e validação do retorno da resposta enriquecida e das fontes.

3. **RN-03: Validação de Provedor e Chaves (Real vs Mock)** 🟢
   - Origem no legado: `_reversa_sdd/code-analysis.md#⚙️ 3. Módulo: rust-services (Microsserviços de IA)`
   - Tipo: nova
   - Descrição: A suite de teste E2E deve ser capaz de rodar tanto em modo `mock` (sem requisições externas para a Vertex AI, usando o mock local do `embedding-service`) quanto em modo `real` (usando chaves Vertex AI configuradas nas variáveis de ambiente). Se a API key da Vertex AI estiver vazia, o teste real deve reportar erro de precondição ou pular automaticamente com aviso adequado.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Teste Automatizado de Ciclo de Vida do Ambiente | Must | Deve existir um script de teste que execute a sequência: `reset.sh` (limpar volumes) -> `setup.sh` (subir containers e criar `.env`) -> checar se todos os contêineres Docker listados no `docker-compose.yml` estão ativos e respondendo nas portas especificadas. | 🟢 CONFIRMADO |
| RF-02 | Teste Integrado de Ingestão e Vetorização | Must | O teste deve realizar o upload de um arquivo PDF simulado, aguardar a transição de estado da tabela `documents` para `INDEXED` em menos de 15 segundos e validar que os chunks foram inseridos na tabela `document_chunks` com embeddings de 768 dimensões. | 🟢 CONFIRMADO |
| RF-03 | Teste de Custo e Resposta de Chat/RAG | Must | O teste deve submeter uma pergunta ao endpoint de chat do `java-core` ("Qual a periodicidade de manutenção dos cabos?"), validar que a resposta do LLM foi recebida e que contém o contexto associado ao documento de teste indexado. | 🟢 CONFIRMADO |
| RF-04 | Limpeza Automática pós-teste | Must | A execução dos testes de RAG e Chat não deve deixar registros persistidos órfãos no PostgreSQL, no MinIO ou no RabbitMQ. A suite de teste deve obrigatoriamente deletar os dados criados (documento de teste e sessões de chat de teste) ao finalizar. | 🟢 CONFIRMADO |
| RF-05 | Modo de Execução Silencioso / CI | Should | A suíte de testes deve possuir uma flag (ex: `--ci` ou variável `CI=true`) para rodar de forma não interativa, omitindo logs excessivos e reportando resultados em formato padronizado (como JUnit XML ou JSON). | 🟡 INFERIDO |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | O tempo máximo aceitável para a validação do pipeline RAG completo (upload + vetorização + busca + resposta) no teste E2E deve ser menor que 25 segundos (com mock) e menor que 40 segundos (com Vertex AI real). | Evita lentidões que desencorajam a execução dos testes no desenvolvimento local. | 🟡 INFERIDO |
| Segurança | O script de testes E2E não deve imprimir nem persistir segredos ou chaves API (`VERTEX_AI_API_KEY`) nos relatórios ou logs de console. | Evita vazamento acidental de tokens em pipelines de CI/CD públicos. | 🟢 CONFIRMADO |
| Portabilidade | A suite de testes E2E deve ser executada sem depender de SDKs instalados localmente na máquina host, utilizando preferencialmente containers Docker ou ambientes já empacotados no projeto. | Facilita a portabilidade entre ambientes macOS e Linux. | 🟢 CONFIRMADO |

## 7. Critérios de Aceitação

```gherkin
Cenário: Execução do fluxo de reset e setup com sucesso
  Dado que o monorepo está clonado localmente
  Quando o operador executa o script de teste de ciclo de vida
  Então o script chama reset.sh com sucesso
  E chama setup.sh criando o arquivo .env
  E valida que as portas 8080 (backend), 3000 (frontend) e 8000 (rust-services) estão ativas e saudáveis

Cenário: Teste RAG completo bem-sucedido com LLM Mockado
  Dado que o ambiente Docker do monorepo está totalmente ativo e saudável
  E que a variável EMBEDDING_PROVIDER está configurada como "mock"
  Quando o teste de RAG é acionado enviando o documento de teste "auditoria_ti.pdf"
  Então o sistema deve transicionar o documento de "UPLOADING" para "INDEXED"
  E a consulta RAG com a pergunta "Qual a periodicidade?" retorna resposta gerada e referências corretas
  E os registros do banco de dados para o documento de teste são removidos com sucesso ao fim do processo

Cenário: Abortar teste RAG real caso API Key esteja ausente
  Dado que o teste de RAG é configurado para provedor "real"
  Mas a variável VERTEX_AI_API_KEY não está definida no arquivo .env
  Quando o script de testes de E2E é iniciado
  Então o teste deve falhar graciosamente com a mensagem "VERTEX_AI_API_KEY ausente para provedor real"
  E encerrar com código de erro 1
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Essencial para garantir que os desenvolvedores e a automação consigam subir o ambiente local. |
| RF-02 | Must | Core da funcionalidade RAG do projeto legado. Sem isso, não há garantia de funcionamento do pipeline vetorial. |
| RF-03 | Must | Valida a integração lógica de ponta a ponta (RAG + provedor LLM + Java backend). |
| RF-04 | Must | Evita poluição do banco e armazenamento compartilhado local de desenvolvimento. |
| RF-05 | Should | Altamente recomendável para integrações futuras de pipelines de CI/CD automáticos. |
| RNF de Segurança | Must | Mitiga o risco de vazamento de credenciais Vertex AI no console do CI/CD. |

## 9. Esclarecimentos

### Sessão 2026-06-05

- **Q:** Qual ferramenta/linguagem deve ser adotada para a escrita das suítes de testes end-to-end (ex: scripts em Bash com `curl`, Node.js/Jest, ou suítes de testes de integração nativas em Rust/Java)?
  **R:** Será adotado Node.js utilizando o test runner nativo (`node:test`) e a Fetch API nativa (sem dependências pesadas externas).
- **Q:** Como os provedores de LLM devem ser validados em ambientes de CI (Continuous Integration)? Devemos obrigatoriamente usar credenciais reais da Vertex AI ou o modo `mock` é suficiente para o pipeline de CI?
  **R:** Abordagem híbrida: O pipeline de CI rodará por padrão com o provedor em modo `mock`, mas permitirá a execução com chaves reais da Vertex AI via trigger manual ou cron semanal.
- **Q:** Existe alguma restrição de infraestrutura ou firewall local (ex: setup_firewall.sh) que impeça a execução das requisições externas para a Vertex AI durante os testes no ambiente de homologação?
  **R:** Não há restrição de infraestrutura/firewall local. O firewall (`UFW`) está configurado para permitir todo o tráfego de saída (outbound) por padrão (`ufw default allow outgoing`), liberando requisições externas para as APIs da Vertex AI.

## 10. Lacunas

Nenhuma lacuna pendente.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-05 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-06-05 | Integração de esclarecimentos obtidos via `/reversa-clarify` (definição do runner Node.js nativo, validação híbrida no CI e confirmação das regras do firewall). | reversa |
