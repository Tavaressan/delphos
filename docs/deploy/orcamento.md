# Alfabra Vector — Orçamento de Deploy (Backend, Frontend e Provedores de IA)

> Consultado em 16/07/2026. Estágio assumido: dev/testes, baixo volume de uso de IA. Valores sujeitos a variação — reconfirmar nas fontes oficiais antes de qualquer compra ou compromisso anual.

## TL;DR

- **Frontend/Vercel**: não migrar agora. Hobby é gratuito e os limites (1M requests, 100GB transfer/mês) folgam para o estágio atual. **Ponto de atenção**: os Termos de Serviço da Vercel restringem o Hobby a uso pessoal/não-comercial — qualquer deploy com finalidade de ganho financeiro de alguém envolvido na produção (incluindo consultor/funcionário pago) conta como uso comercial e exige plano Pro ($20/usuário/mês). Como o Alfabra Vector é descrito como "plataforma corporativa", vale confirmar internamente se isso já se aplica.
- **Backend (dev/testes, baixo volume)**: um PaaS simplificado (Render/Railway) fica em ~$60–100/mês, abaixo de GCP (~$90–130/mês) ou AWS (~$85–130/mês) para o mesmo workload nesta escala. A complexidade operacional de VPC/IAM/instâncias reservadas da AWS/GCP só se paga quando o volume justificar.
- **IA**: no volume atual, nenhum desconto por reserva anual (PTU Azure, Provisioned Throughput AWS Bedrock) compensa — exigem ~150–200M tokens/mês para breakeven. A economia real agora vem de **prompt caching** (até 90% off em contexto repetido) e **Batch API** (50% off em processamento assíncrono), ambos sem compromisso.

---

## 1. Frontend — Vercel

| Plano | Preço | Limites principais | Uso comercial permitido? |
|---|---|---|---|
| Hobby | Grátis (forever) | 1M edge requests/mês, 100GB transfer, 4h active CPU, 1M invocações de função | **Não** — só pessoal/não-comercial |
| Pro | $20/usuário/mês + uso extra | 10M requests/mês incluídos, $20 de crédito, builds sem fila | Sim |
| Enterprise | Sob consulta | SLA 99,99%, SSO/SCIM | Sim |

**Achado relevante**: só o Enterprise tem faturamento anual nativo confirmado. O Pro é mensal apenas — desconto anual de 15–20% mencionado por agregadores não está confirmado na documentação oficial da Vercel. Se o uso for de fato comercial, o custo anual de referência é **$240/usuário/ano** no Pro.

Fontes: [vercel.com/pricing](https://vercel.com/pricing), [vercel.com/legal/terms](https://vercel.com/legal/terms), [vercel.com/docs/plans/pro-plan/billing](https://vercel.com/docs/plans/pro-plan/billing).

---

## 2. Backend — hospedagem (GCP vs AWS vs PaaS simplificado)

Premissa assumida: dimensionamento mínimo viável para dev/testes — 1 réplica por serviço, sem alta disponibilidade, dos 7 serviços (java-core, 5 workers Rust, crew-worker Python) + Postgres/pgvector + Redis + fila de mensagens + object storage.

### PaaS simplificado (referência: Render)

| Componente | Opção | Custo/mês |
|---|---|---|
| 7 serviços web (Starter, 0.5 vCPU/512MB cada) | Render Web Service | ~$49 (7×$7) |
| PostgreSQL com pgvector | Render Postgres Starter | ~$7–19 (pgvector **confirmado** suportado a partir do PostgreSQL 13 via `CREATE EXTENSION vector`, sem restrição documentada por tier) |
| Redis (fila/cache) | Render Key-Value | Grátis (25MB) até Starter pago |
| RabbitMQ | Não é nativo no Render → CloudAMQP | Grátis (Little Lemur, 1M msgs/mês) ou $19 (Tiger, dedicado) |
| Object storage (substituto do MinIO) | Cloudflare R2 | Grátis até 10GB, depois $0,015/GB, egress $0 |
| **Total estimado** | | **~$60–95/mês → $720–1.140/ano** |

Railway é alternativa equivalente (billing por segundo de uso real, Hobby $5/mês + consumo); sem desconto anual documentado no Hobby, só para Pro/Enterprise mediante negociação com vendas.

### Google Cloud (natural pela integração com Vertex AI)

| Componente | Opção | Custo/mês |
|---|---|---|
| 7 serviços (Cloud Run) | Serverless, baixo tráfego | Free tier cobre 360k vCPU-s + 360k GiB-s + 2M requests/mês — provavelmente $0–15/mês neste estágio |
| Cloud SQL PostgreSQL (1 vCPU/3,75GB, zonal, us-central1) | pgvector nativo | ~$55–65 (vCPU ~$30 + RAM ~$19 + storage) |
| Memorystore Redis (Basic, 1GB) | | ~$35–40 |
| RabbitMQ | Sem gerenciado nativo — self-host em Compute Engine e2-micro (free tier elegível) ou CloudAMQP | $0–19 |
| Cloud Storage (substituto MinIO) | Standard | ~$0,02/GB + egress |
| **Total estimado** | | **~$90–130/mês → $1.080–1.560/ano** |

Committed Use Discount de 1 ano: 25–30% em Cloud SQL/Memorystore — só compensa se a instância for permanecer estável no dimensionamento pelo ano inteiro (compromisso pouco reversível dentro do prazo).

### AWS

| Componente | Opção | Custo/mês |
|---|---|---|
| 7 serviços (Fargate, baixo uso) | ECS Fargate | ~$35–65 |
| RDS PostgreSQL (db.t4g.micro, pgvector) | On-demand | $11,68 (RI 1 ano: ~30% menos) |
| ElastiCache Redis (cache.t4g.micro) | On-demand | $11,68 (RI 1 ano: $8,03, -31%) |
| Amazon MQ (RabbitMQ gerenciado) | mq.t3.micro | **Confirmado**: $0,036/hr ≈ $26/mês on-demand; free tier de 750h/mês por 12 meses para contas novas (verificar se a política mudou para contas criadas após 15/07/2025) |
| S3 (substituto MinIO) | Standard | $0,023/GB + $0,09/GB egress |
| **Total estimado** | | **~$85–130/mês → $1.020–1.560/ano** |

Fontes: [cloud.google.com/run/pricing](https://cloud.google.com/run/pricing), [cloud.google.com/sql/pricing](https://cloud.google.com/sql/pricing), [cloud.google.com/memorystore/docs/redis/pricing](https://cloud.google.com/memorystore/docs/redis/pricing), [aws.amazon.com/rds/postgresql/pricing](https://aws.amazon.com/rds/postgresql/pricing/), [aws.amazon.com/elasticache/pricing](https://aws.amazon.com/elasticache/pricing/), [render.com/pricing](https://render.com/pricing), [railway.com/pricing](https://railway.com/pricing), [cloudamqp.com/plans.html](https://www.cloudamqp.com/plans.html), [developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/).

Vários valores GCP/AWS vieram de páginas oficiais truncadas na primeira consulta e foram cruzados com agregadores (economize.cloud, vantage.sh) — para uma decisão de compra, rodar a configuração exata na calculadora oficial antes de comprometer orçamento.

---

## 3. Provedores de IA — comparação

Uso atual: Vertex AI e Google AI Studio.

| Provedor | Modelo | Input $/1M tok | Output $/1M tok | Desconto sem compromisso |
|---|---|---|---|---|
| Google (já em uso) | Gemini 3 Flash | $0,50 | $3,00 | Batch -50%, cache -90% |
| Google (já em uso) | Gemini 3.1 Pro | $2,00 | $12,00 | Batch -50%, cache -90% |
| Google — embeddings (já em uso) | Gemini Embedding 2 | $0,20 (texto) | — | — |
| OpenAI | GPT-4.1 | $2,00 | $8,00 | Batch -50%, cache -90% |
| OpenAI | GPT-5.4 | $2,50 | $15,00 | Batch -50%, cache -90% |
| Anthropic (API direta) | Claude Haiku 4.5 | $1,00 | $5,00 | Batch -50%, cache -90% |
| Anthropic (API direta) | Claude Sonnet 5 | $2,00* / $3,00 (a partir de 01/09/2026) | $10,00* / $15,00 | Batch -50%, cache -90% |
| AWS Bedrock | Claude Sonnet (mesmo modelo) | $3,00 | $15,00 | Batch -50%; Provisioned Throughput -15-40% (compromisso 1–6 meses) |
| Azure OpenAI | GPT-4.1 | $2,00 | $8,00 | PTU até -70% (exige ~150-200M tok/mês para compensar) + -35% adicional em reserva anual sobre PTU |

*Sonnet 5 em preço promocional até 31/08/2026 segundo a documentação da Anthropic — volta ao preço padrão depois.

**Confirmado: o Google (Vertex AI e Gemini API/AI Studio) tem cache de prompt e batch, nos mesmos moldes da OpenAI/Anthropic:**
- **Context caching**: ~90% de desconto no input em cache (ex.: Gemini 3.1 Pro cai de $2,00 para $0,20/1M tokens na porção cacheada). Duas modalidades — **implícita** (habilitada por padrão em todo projeto pago, sem mudança de código, desconto aplicado automaticamente em hits) e **explícita** (opt-in, você define um TTL e recebe um cache ID). Há custo de escrita do cache ($0,50/1M tokens, cobrança única) e de armazenamento ($4,50/1M tokens/hora) — vale a pena só se o mesmo contexto for reaproveitado várias vezes dentro da janela de TTL.
- **Batch prediction**: 50% de desconto em tarefas assíncronas (ex.: reindexação noturna, backfill de embeddings), com SLA de 24h — mesmo modelo de trade-off do Batch API da OpenAI/Anthropic.
- Ou seja: para o RAG do Alfabra Vector, o cache implícito do Google já deve estar reduzindo custo de system prompt/contexto repetido automaticamente, sem nenhuma mudança de código necessária.

**Leitura para o volume atual (baixo, uso interno/testes):**
- Nenhum mecanismo de reserva anual (PTU Azure, Provisioned Throughput Bedrock) compensa neste volume — exigem dezenas a centenas de milhões de tokens/mês para breakeven, e são compromissos financeiros pouco reversíveis dentro do prazo.
- Ganho real agora: prompt caching (system prompt do RAG) e Batch API para ingestão/embeddings assíncronos — ambos pay-as-you-go, sem risco de compromisso.
- Preço por token é praticamente idêntico entre Bedrock e API direta da Anthropic (mesmo modelo) — a diferença é operacional (IAM da AWS vs chave de API), não de custo.

Fontes: [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing), [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing), [aws.amazon.com/bedrock/pricing](https://aws.amazon.com/bedrock/pricing/), [azure.microsoft.com/en-us/pricing/details/azure-openai](https://azure.microsoft.com/en-us/pricing/details/azure-openai/), [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing), [cloud.google.com/blog/products/ai-machine-learning/vertex-ai-context-caching](https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-context-caching).

---

## 4. Render free tier — dá para usar agora?

**Veredito: não para o backend completo, mas serve como prova de conceito de um serviço isolado (POC avaliada na issue [#240](https://github.com/Tavaressan/Alfabra-Vector/issues/240)).**

### Resumo dos Limites e Implicações

| Recurso | Limite free (confirmado 16/07/2026) | Implicação para o Alfabra Vector |
|---|---|---|
| Web services | 750h de instância compartilhadas por workspace/mês; dorme após 15 min de inatividade (cold start ~1 min) | Rodar 2+ dos 7 serviços 24/7 já ultrapassa as 750h — não dá para manter o backend todo sempre ativo de graça |
| Banda | 5GB/mês por workspace (reduzido de 100GB em abril/2026) | Aperta rápido com qualquer volume de teste de ingestão/RAG |
| PostgreSQL free | 1GB de storage, expira 30 dias após criação + 14 dias de carência antes de apagar | Não serve para dado persistente sem renovar manualmente a cada ~30 dias |
| pgvector | Suportado a partir do Postgres 13, sem restrição por tier | Não é o fator limitante (`CREATE EXTENSION vector` validado) |
| Redis (Key-Value) free | 25MB, 50 conexões | Ok só para cache/fila muito leve |
| RabbitMQ | Sem serviço nativo no Render | CloudAMQP Little Lemur (grátis, 1M msgs/mês, sem expiração) cobre essa lacuna |

### Avaliação Detalhada da Prova de Conceito (Issue #240)

1. **Seleção do Serviço para POC (`rag-worker` / `document-processing`)**:
   - **Serviço escolhido**: `rag-worker` (ou `document-processing`), localizados em `rust-services/`.
   - **Motivação**: Binários em Rust possuem baixíssimo consumo de memória RAM (~20–50MB RSS), cabendo confortavelmente no limite de 512MB do tier gratuito. Além disso, operam de forma assíncrona orientada a eventos/filas, evitando acoplamento síncrono com a API principal (`java-core`).
2. **Impacto do Cold Start (~1 min) e Limite de 750h/mês**:
   - **Cold Start**: Após 15 min sem tráfego de entrada, a instância entra em sleep. A primeira requisição para acordá-la sofre um atraso de ~1 minuto. Embora aceitável para testes pontuais assíncronos, o cold start inviabiliza sessões eficientes de QA manual e testes interativos.
   - **Capacidade de Instâncias**: 750h/mês por workspace sustentam apenas **uma única instância 24/7** (~744h num mês de 31 dias). Deployar o backend completo (7 microsserviços) estouraria a cota em menos de 5 dias ($7 \times 744h = 5.208h$), resultando em suspensão do workspace.
   - **Banda de Egress (5GB/mês)**: Testes de ingestão e tráfego de documentos rapidamente atingem essa cota.
3. **Validação do Postgres Free e `pgvector`**:
   - O comando `CREATE EXTENSION vector;` funciona perfeitamente nas instâncias Postgres free do Render (PostgreSQL v13+).
   - Contudo, a **expiração automática após 30 dias** (+ 14 dias de carência antes do expurgo permanente) torna o banco inviável para ambiente persistente de dev/staging, sendo aceitável unicamente para bancos efêmeros de teste com dump/restore frequente.

**Recomendação Final**: O free tier do Render deve ser usado estritamente para demonstrações ou POCs de 1 serviço isolado. Para sustentação continuada do ambiente de dev/testes completo do Alfabra Vector, o plano PaaS pago (Render Starter, ~$60–95/mês) ou Cloud Run GCP continuam sendo os caminhos recomendados.

Fontes: [render.com/docs/free](https://render.com/docs/free), [render.com/docs/postgresql-extensions](https://render.com/docs/postgresql-extensions), [render.com/changelog/free-postgresql-instances-now-expire-after-30-days-previously-90](https://render.com/changelog/free-postgresql-instances-now-expire-after-30-days-previously-90).

---

## Limitações desta análise

- Preços de nuvem por instância cruzados com agregadores (vantage.sh, economize.cloud) quando a página oficial truncou — rodar a config exata na calculadora oficial antes de decidir.
- Toda a análise assume dev/testes de baixo tráfego; se o volume real (usuários simultâneos, tamanho médio de documentos, frequência de ingestão) crescer, os números mudam — principalmente o de IA.
- Free tier do Amazon MQ (750h/12 meses) pode ter mudado de termos para contas AWS criadas após 15/07/2025 — não confirmado nesta rodada.

## Próximos passos sugeridos

- **Pendente — decisão do usuário, não de pesquisa**: confirmar se o uso atual do Vercel já se enquadra como comercial pelos ToS (envolve qualquer pessoa remunerada trabalhando no projeto).
- ✅ **Concluído (Issue #240)**: Executada a avaliação da prova de conceito no Render free tier (`rag-worker` / `document-processing` + Postgres `pgvector`). Confirmada a inviabilidade do backend completo no free tier (limite de 750h/mês e expiração de 30 dias do Postgres) e viabilidade apenas para POC de serviço isolado.
- Se/quando o volume de uso crescer, revisar a comparação de IA com dados reais de tokens/mês para avaliar se PTU/Provisioned Throughput passam a compensar.

## Itens já confirmados nesta rodada (16/07/2026)

- ✅ pgvector é suportado no Render Postgres (v13+, `CREATE EXTENSION vector`), sem restrição por tier.
- ✅ Amazon MQ (RabbitMQ na AWS): $0,036/hr (~$26/mês) on-demand; free tier de 750h/mês por 12 meses.
- ✅ Google (Vertex AI / AI Studio) tem prompt caching (implícito e explícito, ~90% off) e batch prediction (50% off) — ver seção 3.
- ✅ Render free tier avaliado em detalhe — seção 4. Prova de conceito da issue [#240](https://github.com/Tavaressan/Alfabra-Vector/issues/240) concluída.
