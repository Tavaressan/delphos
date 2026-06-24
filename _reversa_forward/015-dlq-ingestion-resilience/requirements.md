# Requirements: DLQ + Resiliência no Ingestion-Worker

> Identificador: `015-dlq-ingestion-resilience`
> Data: `2026-06-19`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O `ingestion-worker` (Rust/Tokio) descarta silenciosamente qualquer job de ingestão que falhe — o NACK com `requeue: false` elimina a mensagem sem registro ou retry. Adicionalmente, o parser de documentos suporta apenas PDF e texto plano, e os parâmetros de chunking são hardcoded. Esta feature entrega: (1) mecanismo de Dead Letter Queue para jobs de ingestão com falha, (2) parser `.docx` via `docx-rs`, e (3) chunking configurável via variáveis de ambiente. O público beneficiado são operadores do sistema que hoje não têm visibilidade sobre falhas de ingestão e documentos `.docx` que entram no fluxo mas não são corretamente indexados.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/review.md#G-NEW-05` | NACK com `requeue: false` em `ingestion-worker/main.rs:148` — jobs falhos descartados sem registro | 🟢 |
| `_reversa_sdd/review.md#G-NEW-06` | Parser de documentos suporta apenas `.pdf` (lopdf) e texto plano; `.docx` tratado como texto bruto | 🟢 |
| `_reversa_sdd/review.md#G-NEW-07` | `chunk_size=1000` e `chunk_overlap=200` hardcoded em `ingestion-worker/main.rs:222` | 🟢 |
| `_reversa_sdd/detective.md#ADR-R006` | Comunicação Java→Workers via RabbitMQ assíncrono; descarte em exchange `document.ingestion` | 🟢 |
| `_reversa_sdd/detective.md#3.2` | Ciclo de vida do Document: `PROCESSING → INDEXED \| FAILED` — estado `FAILED` já existe no schema | 🟢 |
| `_reversa_sdd/domain.md#Document` | Documentos `.docx` estão na lista de tipos aceitos (`AgentService.java:177` — RN-03) mas não no parser do worker | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| **Operador do sistema** | Identificar e reprocessar documentos que falharam na ingestão | Acessa fila DLQ via RabbitMQ Management ou tabela de jobs falhos; reprocessa sem re-upload |
| **Usuário final** | Fazer upload de documento `.docx` e ter embedding gerado corretamente | Faz upload de relatório Word; conteúdo aparece nas buscas do RAG |
| **DevOps / SRE** | Ajustar tamanho de chunk para documentos técnicos longos sem rebuild | Define `CHUNK_SIZE` e `CHUNK_OVERLAP` no `.env` e reinicia o worker |

## 4. Regras de negócio novas ou alteradas

1. **RN-B01:** Um job de ingestão que falha deve ser registrado em mecanismo de DLQ antes do NACK, preservando o payload original e a mensagem de erro. 🟢
   - Origem no legado: `ingestion-worker/main.rs:148` — comportamento atual é descarte puro
   - Tipo: nova

2. **RN-B02:** O documento deve permanecer em status `FAILED` no banco após falha de ingestão; uma segunda tentativa de processamento (re-enqueue do DLQ) pode mudar o status de volta para `PROCESSING`. 🟢
   - Origem no legado: `_reversa_sdd/detective.md#3.2` — `FAILED` já existe como estado terminal
   - Tipo: alterada (de terminal para re-entrante)

3. **RN-B03:** Arquivos `.docx` enviados via ZIP de agente devem ter seu texto extraído pelo parser `docx-rs` antes do chunking; fallback para texto plano é inaceitável (resulta em XML cru indexado). 🟢
   - Origem no legado: `_reversa_sdd/domain.md#Regras-Document` — `.docx` declarado como tipo aceito
   - Tipo: nova

4. **RN-B04:** Os parâmetros `CHUNK_SIZE` e `CHUNK_OVERLAP` devem ser lidos de variáveis de ambiente na inicialização do worker, com fallback para os valores atuais (1000 e 200) se ausentes. 🟢
   - Origem no legado: `ingestion-worker/main.rs:222` — valores hardcoded
   - Tipo: nova (sem alteração de comportamento padrão)

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Implementar DLQ via tabela PostgreSQL `failed_jobs` — ao capturar erro no consumer loop, o worker deve inserir registro com payload e mensagem de erro **antes** de emitir NACK | Must | Job que lança erro aparece em `failed_jobs` com `document_id`, `tenant_id`, `error_message` e `payload` não-nulos; documento em status `FAILED` no banco | 🟢 |
| RF-02 | Implementar parser `.docx` usando crate `docx-rs` para extrair texto de documentos Word durante ingestão | Must | Upload de arquivo `.docx` de 3 páginas resulta em chunks com texto legível indexados no pgvector; sem XML cru | 🟢 |
| RF-03 | Tornar `chunk_size` e `chunk_overlap` configuráveis via variáveis de ambiente `CHUNK_SIZE` e `CHUNK_OVERLAP` | Should | Worker iniciado com `CHUNK_SIZE=500 CHUNK_OVERLAP=100` usa esses valores; sem variável, usa 1000/200 como antes | 🟢 |
| RF-04 | Registrar mensagem de erro associada ao job falho (stacktrace ou mensagem Rust) junto ao payload da DLQ | Must | Campo `error_message` não-nulo para jobs na DLQ | 🟢 |
| RF-05 | Permitir reprocessamento manual de job na DLQ sem re-upload do documento (re-publish na fila principal) | Should | Operador aciona re-enqueue via interface existente (RabbitMQ Management ou endpoint a definir); documento muda de `FAILED` para `PROCESSING` | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Resiliência | Jobs na DLQ devem ser persistidos de forma durável — sobrevivem a restart do worker e do broker | DLQ é mecanismo de segurança; dados voláteis invalidam o propósito | 🟢 |
| Observabilidade | Métrica ou log estruturado emitido a cada job que vai para DLQ, com `document_id`, `tenant_id` e `error` | Operadores precisam alertar quando DLQ acumula jobs | 🟡 |
| Performance | Parser `.docx` não deve aumentar latência de ingestão de PDF em mais de 5% (documentos `.docx` têm própria latência) | Ingestão atual processa PDF sem degradação perceptível | 🟡 |
| Compatibilidade | `CHUNK_SIZE` e `CHUNK_OVERLAP` lidos apenas na inicialização do worker; mudança requer restart (não hot-reload) | Simplifica implementação; comportamento já esperado para variáveis de ambiente Rust | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Job de ingestão falha com erro de embedding
  Dado que o ingestion-worker está ativo e o embedding-service retorna erro 503
  Quando o worker processa um job da fila `document.ingestion.jobs`
  Então o job deve ser registrado no mecanismo de DLQ com payload e mensagem de erro
  E o documento deve ter status FAILED no banco de dados
  E o worker NÃO deve recolocar a mensagem na fila principal (requeue: false)

Cenário: Upload de documento .docx
  Dado que um agente tem um arquivo relatório.docx no ZIP de cadastro
  Quando o ingestion-worker processa o job de ingestão desse documento
  Então o texto extraído deve conter o conteúdo legível do Word (não tags XML)
  E chunks devem ser indexados no pgvector com embedding de 768 dimensões

Cenário: Configuração de chunking via variáveis de ambiente
  Dado que o worker é iniciado com CHUNK_SIZE=500 e CHUNK_OVERLAP=50
  Quando um documento PDF de 10 páginas é ingerido
  Então os chunks gerados devem ter no máximo 500 caracteres com sobreposição de 50
  E o número de chunks deve ser maior que com CHUNK_SIZE=1000

Cenário: DLQ sem variáveis de configuração de chunk
  Dado que o worker é iniciado sem CHUNK_SIZE nem CHUNK_OVERLAP definidos
  Quando um documento é ingerido
  Então o comportamento deve ser idêntico ao atual (chunk_size=1000, chunk_overlap=200)
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 — DLQ para jobs falhos | Must | Falhas silenciosas impedem diagnóstico operacional; gap crítico G-NEW-05 |
| RF-04 — Registro de erro na DLQ | Must | Sem mensagem de erro a DLQ é inútil para troubleshooting |
| RF-02 — Parser .docx | Must | `.docx` declarado como tipo aceito na API mas não processado corretamente; gap G-NEW-06 |
| RF-03 — Chunking configurável | Should | Melhora operabilidade sem impacto funcional; gap G-NEW-07 |
| RF-05 — Reprocessamento manual | Should | Reduz necessidade de re-upload mas exige endpoint extra; pode ser fase 2 |

## 9. Esclarecimentos

### Sessão 2026-06-19

- **Q:** Mecanismo de DLQ: RabbitMQ Dead Letter Exchange (DLX) ou tabela PostgreSQL `failed_jobs`?
- **R:** PostgreSQL `failed_jobs`. Justificativa: (1) multi-tenancy nativo — coluna `tenant_id` na tabela evita o gap análogo ao `audit_logs` G-04; (2) visibilidade via Java Core admin sem consumer Rust adicional; (3) reprocessamento via `POST /api/documents/{id}/retry` no Java Core — fluxo uniforme com o resto da API; (4) sem mudança de infraestrutura RabbitMQ. DLX descartado por ausência de tenant-awareness e necessidade de consumer Rust extra.

## 10. Lacunas

*Nenhuma lacuna ou dúvida pendente.*

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-19 | Versão inicial gerada por `/reversa-requirements` | reversa |
