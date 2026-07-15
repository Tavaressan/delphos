# Fluxo Principal (User Story)

**Como** um usuário interno da Alfabra
**Eu quero** fazer uma pergunta no chat informando (ou não) um Agente especializado
**Para que** eu possa obter respostas embasadas na minha base de conhecimento sobre elevadores (RAG).

**Critérios de Aceite:**
1. Dado que estou autenticado, eu vejo a interface do NextJS (`frontend`).
2. Digito a dúvida. O SSE inicia e vejo a mensagem transitando de "Pendente" para "Aguardando LLM" e "Analisando Conhecimento".
3. Enquanto isso, o LLM recebe contexto vetorial gerado pelo worker de Rust e orquestrado pelo worker de Python.
4. Ao fim, o texto vai aparecendo em pedaços e sendo parseado em Markdown.
5. Se uma ferramenta sensível for invocada, surge um painel exigindo minha aprovação (HITL).
