# User Story: Fluxo Principal de Execução de Agente com RAG e Tools

## Título
Como um **Usuário do Alfabra-Vector**, 
eu quero **submeter um prompt no chat que engatilhe um agente autônomo**, 
para que **a IA possa buscar dados do meu acervo (RAG), processar scripts Python e me devolver uma resposta consolidadada em tempo real.**

## Narrativa / Fluxo Base
1. O usuário entra na interface de Chat via `frontend` SPA.
2. O usuário escolhe um agente no Catálogo.
3. O usuário digita "Gere um relatório das vendas da semana baseando-se no doc Anexo_Vendas_Semana.pdf e plotando um gráfico".
4. A UI aciona o API Gateway (`nucleo-java`) e aguarda o SSE.
5. O backend do Java Core cadastra a solicitação no banco (`AgentExecution`) atrelada ao `tenant_id` e enfileira um Job no RabbitMQ.
6. O `servicos-python` assume a tarefa.
7. O CrewAI entende que precisa usar duas ferramentas: `BuscaDoc` (RAG) e `GerarGrafico` (Custom Tool).
8. O CrewAI publica um evento `agent.retrieval.queue`. O `servicos-rust` busca por semelhança e devolve os dados em banco (`RetrievalCompleted`).
9. O CrewAI roda o Python Script no sandbox contido pra gerar o gráfico (`ToolCallStarted`/`Finished`).
10. Com as duas respostas agregadas, o LLM termina o texto, e envia `AgentExecutionCompleted`.
11. O gateway Java retransmite todas essas sub-fases pelo pipe de SSE até o browser.
12. O frontend monta as palavras no Canvas gradualmente e muda ícones visuais apontando que as ferramentas foram utilizadas.

## Critérios de Aceitação Adicionais
- [ ] A tela nunca trava (freeze) enquanto aguarda eventos SSE.
- [ ] O backend bloqueia leitura de documentos do Tenant B caso o Tenant A force IDs maliciosos.
- [ ] Se o Python Script customizado de plotagem demorar mais que `30s`, é morto via timeout e o erro é renderizado polidamente.
