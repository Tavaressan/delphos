# Investigação — Issue #424: `Alfabra_Lift_Compliance_V2.md` com status FAILED

## Resumo

Não foi possível determinar a causa raiz **definitiva** com as evidências disponíveis no ambiente
sandboxed (sem acesso a Docker/DB/logs em execução). O código do pipeline de ingestão foi mapeado
por completo e o próximo passo de investigação mais barato e decisivo (consultar duas colunas já
existentes no banco) foi identificado e documentado abaixo. Nenhum fix foi implementado — a causa
não é óbvia o suficiente para justificar uma mudança de código sem essa evidência.

## O que foi feito

1. Branch `fix/424-document-failed-status` criada a partir do worktree do agente.
2. Mapeado o fluxo completo de ingestão de documentos:
   - `java-core/src/main/java/com/company/core/interfaces/rest/DocumentController.java` (`POST
     /api/documents/upload`): valida o arquivo (`FileTypeValidator`, magic bytes via Apache Tika),
     sobe para o MinIO (`objectPath = documents/<docId>/<docId>.<ext>`), grava o `Document` com
     `status = PROCESSING` e publica um job em `agent.execution.exchange` /
     `document.ingestion.jobs`.
   - `rust-services/ingestion-worker/src/main.rs` (`process_delivery` → `execute_ingestion`):
     baixa o arquivo do MinIO, extrai texto (pdf/docx/texto-plano — `.md` cai no branch de
     texto-plano), faz *chunking*, chama o `embedding-service` (`get_embeddings_from_service`) e
     grava os `document_chunks`. Em caso de erro, o documento é marcado `FAILED` com
     `processing_error` preenchido (linha 443) **antes mesmo** de decidir se o job será reagendado
     (retry) ou roteado para a DLQ.
   - Existe uma tabela de auditoria dedicada, `failed_jobs`
     (`java-core/src/main/resources/db/migration/V6__failed_jobs.sql`), que grava
     `document_id`, `error_message`, `retry_count` e `payload` a cada tentativa que falhou — **essa
     é a fonte de evidência mais precisa disponível**, mais confiável que logs de container (que
     podem já ter rotacionado).
   - Também existe um "reaper" de heartbeat (`reap_stale_processing_documents`, linha 301) que
     varre documentos presos em `PROCESSING` por mais de `HEARTBEAT_TIMEOUT_MINUTES` (default 10
     min) e os marca `FAILED` com a mensagem fixa `"Heartbeat timeout: worker travou ou foi
     interrompido durante o processamento."` — isso cobre o caso de o worker ter crashado/OOM no
     meio do processamento sem nunca chegar ao branch de erro do `process_delivery`.
3. Buscado o nome do arquivo (`Alfabra_Lift_Compliance_V2.md`) e termos relacionados
   (`Lift`, `Compliance`) em todo o repositório, incluindo `git log --all`. **Nenhuma ocorrência
   encontrada.** Isso descarta a hipótese de que o documento viria de `seed_rag.py` (só insere
   `manual_alfabra_xyz.pdf`, confirmado pela própria issue) ou de `seed_mock_agents.py`: esse
   script cria os 4 agentes mockados via `POST /api/admin/agents` com arquivos fixos
   (`instructions.md`, `norma_abnt_nbr_7192.md`, `norma_nr18_elevadores.md`, etc. — ver
   `python-services/crew-worker/src/mock_agents/compliance/`), nenhum chamado
   `Alfabra_Lift_Compliance_V2.md`, e esse endpoint de agentes tem um pipeline totalmente
   diferente do de `documents`/`ingestion-worker`.
   - Conclusão: o documento é quase certamente um **upload manual/ad-hoc** feito por um humano
     durante testes locais (via `POST /api/documents/upload`, provavelmente pela UI), não
     originado por nenhum script de seed do repositório atual. Isso é consistente com a suspeita já
     registrada na própria issue.
4. Tentativa de reprodução via `docker compose`: **uma única tentativa**, conforme a política do
   projeto para o sandbox. `docker compose ps` falhou porque não existe `.env` no worktree
   (`open .../.env: no such file or directory`) — a stack não está configurada/rodando neste
   ambiente isolado. Não foi feita nova tentativa (ex.: copiar `.env` do root ou subir a stack),
   pois isso envolveria manipular segredos/infra fora do escopo de um worktree de agente e a
   política do projeto pede parar após uma tentativa bloqueada.

## Hipóteses de causa raiz (por probabilidade, sem confirmação)

1. **Rate limit / quota da Vertex AI ou Google AI Studio no `embedding-service` (mais provável).**
   Há memória de sessões anteriores confirmando que a cota gratuita da Vertex AI expirou
   (issues #192–#194) e que a cota diária da API do Gemini/AI Studio já foi "queimada" por um bug
   de retry infinito (issue #391, `crew-worker`). Se este documento foi processado depois de vários
   outros no mesmo seed/sessão de teste (esgotando a cota do minuto/dia), a chamada
   `get_embeddings_from_service` retornaria erro justamente para ele e não para os anteriores —
   exatamente o padrão relatado ("todos os demais ficaram INDEXED"). O erro cairia no branch de
   `Err` do `process_delivery` (`main.rs:436-450`), com `processing_error` contendo a mensagem de
   erro HTTP do `embedding-service` (`main.rs:836-840`, formato `"embedding-service returned error
   {status}: {body}"`).
2. **Documento maior/mais complexo que os demais (mais chunks, texto mais longo)** — normas
   técnicas de compliance de elevadores tendem a ser documentos mais longos que os demais itens do
   seed, aumentando a chance de acertar algum limite (tamanho de payload para o
   `embedding-service`, timeout HTTP, ou simplesmente maior probabilidade estatística de bater em
   rate limit por ter mais chunks/chamadas).
3. **Worker travado (heartbeat reaper)** — se o `ingestion-worker` crashou/reiniciou no meio do
   processamento deste documento específico (ex.: OOM), o documento ficaria preso em `PROCESSING`
   e seria marcado `FAILED` pelo reaper ~10 min depois, com a mensagem fixa de heartbeat timeout.
   Isso é distinguível das demais hipóteses pelo texto de `processing_error`.
4. **Menos provável: extração de texto/tipo de arquivo.** `.md` cai direto no branch de
   texto-plano (`main.rs:459-468`), sem parser dedicado — não há motivo estrutural para falhar
   nesse ponto para um `.md` bem-formado. A validação de tipo de arquivo (`FileTypeValidator`, Tika)
   roda **antes** da criação do registro `Document` no `java-core`; como o documento existe no
   banco com um `id`, o upload e essa validação já passaram — descarta essa camada como causa.

## Evidência que falta (próximo passo recomendado)

O passo mais barato e decisivo, que qualquer pessoa com acesso ao ambiente onde o seed rodou pode
executar em segundos, é consultar as duas colunas/tabela que já existem para exatamente este
propósito e que a issue ainda não consultou:

```sql
-- 1. A causa exata já está gravada na própria linha de documents:
SELECT id, name, status, processing_error, updated_at
FROM documents
WHERE id = '9696b686-3964-4ba1-9fe2-654faae02c34';

-- 2. Histórico de tentativas com erro detalhado por retry:
SELECT id, error_message, retry_count, created_at
FROM failed_jobs
WHERE document_id = '9696b686-3964-4ba1-9fe2-654faae02c34'
ORDER BY created_at;
```

Com o texto de `processing_error`/`error_message` em mãos, a causa raiz entre as 4 hipóteses acima
fica imediatamente óbvia (é literalmente o texto do erro capturado pelo próprio pipeline) e um fix
direcionado pode ser implementado com TDD em uma iteração seguinte — sem essa evidência, qualquer
fix agora seria especulativo e violaria KISS/YAGNI (risco de "consertar" a hipótese errada).

Secundariamente, também vale conferir:
- Logs do container `ingestion-worker` (`docker compose logs ingestion-worker`) por volta de
  `2026-08-21 13:42:55` — o worker faz `println!` com o `document_id` em cada etapa
  (`main.rs:415`, `426`, `439-441`), então a linha exata do erro deve aparecer ali também, se o
  container não tiver sido reciclado.
- Profundidade da fila DLQ (`document.ingestion.jobs.dlq` — ver `DLQ_QUEUE` em `main.rs`) no
  RabbitMQ management UI, para confirmar se o job chegou a esgotar os retries e ser roteado para lá.

## Reprodutibilidade

Não reproduzido neste ambiente (sandbox sem stack Docker configurada — `.env` ausente no
worktree). Não há indício de que seja um bug estrutural/determinístico do pipeline (o texto `.md`
não tem nada de especial no código); a hipótese líder (rate limit/quota) é inerentemente
não-determinística e dependente do estado externo (cota da API no momento do teste), o que também
explica por que não haveria uma forma simples de reproduzir isso de forma confiável a partir de um
ambiente limpo sem as mesmas condições de cota.

## Recomendação

1. Rodar as duas queries acima no ambiente onde o `FAILED` foi observado para obter o
   `processing_error`/`error_message` exato.
2. Se confirmada a hipótese de rate limit/quota (hipótese 1): não é um bug de código a corrigir
   agora — é o mesmo problema estrutural já rastreado nas issues #192–#194 (fallback
   Vertex→AI Studio) e #391 (retry sem limite). Vale re-executar a ingestão deste documento
   isoladamente (reindexação) fora de uma janela de esgotamento de cota, para confirmar que ele
   indexa normalmente quando a cota está disponível.
3. Se confirmada a hipótese 3 (heartbeat reaper): investigar por que o worker travou nesse
   documento específico (tamanho do arquivo, uso de memória) — aí sim caberia um fix-loop TDD
   dedicado.
4. Nenhum fix de código foi aplicado nesta issue por não haver causa raiz confirmada — evitando
   uma mudança especulativa fora do escopo (§3.2 KISS/YAGNI de
   `planning-conventions.md`).
