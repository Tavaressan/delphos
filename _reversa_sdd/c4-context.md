# C4 Model - Nível 1 (Contexto)

```mermaid
C4Context
    title Diagrama de Contexto de Sistema - Alfabra Vector

    Person(user, "Usuário Interno / Admin", "Gerencia agentes, sobe bases de conhecimento e interage no chat.")
    
    System(alfabra, "Alfabra Vector Platform", "Plataforma multitenant de orquestração cognitiva com IA.")
    
    System_Ext(vertex, "Google Vertex AI", "Provedor de LLMs fundacionais (Gemini) e recursos de ML.")
    
    Rel(user, alfabra, "Acessa dashboards, faz perguntas e agenda tarefas")
    Rel(alfabra, vertex, "Envia prompts e recebe completions via API")
```
