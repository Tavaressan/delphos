# Roadmap: Prompt Injection Protection

> Identificador: `018-prompt-injection-protection`
> Data: 2026-06-25
> Requirements: `_reversa_forward/018-prompt-injection-protection/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A abordagem consiste em introduzir uma camada defensiva de sanitização heurística baseada em padrões/expressões regulares (regex) nos pontos de entrada de prompts de usuário e chunks recuperados do banco nos workers `crew-worker` e `rag-worker`. Adicionalmente, as queries do usuário e contextos do RAG serão explicitamente isolados e encapsulados em tags XML delimitadoras para forçar o modelo LLM a reconhecê-los como dados, e não instruções. Casos suspeitos de Prompt Injection ou inputs excedendo o limite de caracteres (4000) serão rejeitados na validação, disparando o evento de falha e prevenindo a chamada à API externa do Gemini.

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| n/a | Nenhum princípio global configurado em `.reversa/principles.md`. | - |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Detecção heurística de regras/regex local | Solução muito rápida (< 2ms), determinística e sem dependência de APIs adicionais. Evita custo de tokens extra. | Classificador inteligente BERT/LLM local (descartado por latência e consumo de memória nos workers). | 🟢 |
| D-02 | Delimitação de prompt por tags XML | Técnica padrão e altamente eficaz para sinalizar ao LLM Gemini a separação semântica entre instruções e conteúdo de usuário/documento. | Delimitação por Markdown ou aspas simples (menos confiável e mais sujeito a escape). | 🟢 |
| D-03 | Rejeição imediata sem chamada ao LLM | Abortar na detecção de injection reduz o risco de faturamento com prompts maliciosos e protege o ecossistema de loops. | Enviar com instrução extra de "ignore injeções" (ineficaz contra técnicas avançadas de jailbreak). | 🟢 |
| D-04 | Limite rígido de input de 4000 caracteres | Previne inundações de contexto e injeções longas de forma barata. | Truncar silenciosamente (descartado pois pode quebrar lógica/corte de palavras do usuário). | 🟢 |

## 4. Premissas

Nenhuma premissa adotada a partir de dúvidas pendentes (todas as dúvidas do Requirements foram resolvidas na sessão de clarify).

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `crew-worker` (Python) | `python-services/crew-worker/src/runtime/crewai_adapter.py` | regra-alterada | Adicionar validador de Prompt e sanitizador de RAG no script de execução. Envolver input do usuário na task com tags `<user_query>` e `<retrieved_context>`. |
| `rag-worker` (Rust) | `rust-services/rag-worker/src/rabbitmq.rs` | regra-alterada | Adicionar checagem de tamanho, sanitização de input e detecção de padrões de injection em Rust antes de formular o `user_content` com tags XML. |

## 6. Delta no modelo de dados

- Resumo das mudanças: n/a (nenhuma alteração em tabelas, colunas ou estruturas de dados).
- Detalhe completo em: `_reversa_forward/018-prompt-injection-protection/data-delta.md`

## 7. Delta de contratos externos

Nenhum contrato externo HTTP, fila RabbitMQ ou gRPC alterado. A carga útil do job permanece a mesma, mudando apenas a validação interna do payload.

## 8. Plano de migração

A feature não exige migração de banco de dados ou alteração de dados históricos. A implantação nos microsserviços ocorre sem impactos retroativos.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Falsos positivos no detector regex (perguntas legítimas bloqueadas) | médio | baixo | Manter a lista de regras regex restrita a padrões clássicos e explícitos de jailbreak, documentar e expor logs de violação detalhados. |
| Injeções indiretas escapando tags XML | médio | baixo | Sanitizar tags XML literais do input do usuário para evitar fechamento precoce das tags (escape de caracteres `<` e `>` no input). |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado
- [ ] Testes unitários de sanitização/detecção em Python e Rust cobrindo casos positivos e negativos implementados e passando.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-25 | Versão inicial gerada por `/reversa-plan` | reversa |
