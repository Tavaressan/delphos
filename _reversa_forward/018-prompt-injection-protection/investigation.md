# Investigation: Prompt Injection Protection

## Pesquisa de Fundo e Padrões de Segurança

O ataque de **Prompt Injection** ocorre quando um usuário ou um dado externo (como um trecho de texto vindo do RAG) injeta instruções adicionais que sobrepõem as diretrizes originais do sistema (System Instructions). Isso afeta sistemas que processam prompts de linguagem natural usando Large Language Models (LLMs).

De acordo com o **OWASP Top 10 for LLM Applications (LLM01: Prompt Injection)**:
- **Injeção Direta (Jailbreaking):** O usuário envia instruções explícitas de override (e.g. "Ignore tudo o que foi dito antes...").
- **Injeção Indireta:** O usuário insere um documento na base de conhecimento que contém instruções ocultas. Quando o RAG recupera esse documento e o injeta no prompt, o modelo é sequestrado pelas instruções do documento.

### Mitigações Avaliadas

1. **Delimitação Estruturada (Tags XML/JSON):**
   Modelos como o Gemini são altamente treinados para obedecer a estruturas e instruções contidas fora de tags específicas se instruídos no System Prompt.
   Exemplo de prompt estruturado:
   ```
   Você é um especialista em elevadores. Responda à pergunta do usuário contida em <user_query> usando apenas o contexto em <context>.
   
   <context>
   [chunks]
   </context>
   
   <user_query>
   [query]
   </user_query>
   ```

2. **Detecção Baseada em Heurísticas/Regex:**
   Filtros rápidos na aplicação que analisam o texto do usuário antes de enviar ao LLM.
   Padrões clássicos para bloquear:
   - `(?i)(ignore\s+as\s+instruções|ignore\s+as\s+diretrizes|ignore\s+everything\s+above)`
   - `(?i)(daqui\s+em\s+diante|you\s+are\s+now|você\s+agora\s+é)`
   - `(?i)(system\s+bypass|override\s+rules|regras\s+de\s+sistema)`
   - Tentativas de injeção de tags XML falsas: `</user_query>` ou `</context>`.

3. **Escape de Input:**
   Para evitar que o usuário tente "fechar" as tags XML enviando algo como `</user_query> <instrução maliciosa>`, devemos remover ou substituir caracteres `<` e `>` do input do usuário e do contexto recuperado, ou fazer um escape básico desses caracteres.

## Alternativas Avaliadas e Descartadas

- **Classificador de IA dedicado (BERT/Llama Guard):**
  Descartado nesta fase inicial devido ao overhead de latência (adiciona de 150ms a 400ms por requisição) e complexidade de infraestrutura para executar modelos adicionais localmente nos workers Python/Rust.
  *Decisão:* Adotar regras heurísticas/regex estritas como primeira linha de defesa, que têm custo computacional desprezível.

- **Filtro de Segurança Nativo do Gemini (Google AI Safety Settings):**
  O Vertex AI já possui configurações de segurança (`safetySettings`) contra assédio, discurso de ódio, conteúdo explícito e perigoso. No entanto, esses filtros nativos **não** cobrem ataques de bypass de regras de negócio ou roubo de prompts de sistema específicos do domínio.
  *Decisão:* Configurar os safetySettings nativos em conjunto com a validação de entrada proprietária na aplicação.

## Referências
- [OWASP LLM Top 10 — LLM01: Prompt Injection](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Gemini Safety Settings Guidelines](https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/configure-safety-attributes)
