# Alfabra Vector — Relatório de Avaliação de Deploy & Prova de Conceito (Render Free Tier)

> **Documento referente à Issue [#240](https://github.com/Tavaressan/Alfabra-Vector/issues/240)**  
> **Localização canônica no repositório**: [`docs/deploy/orcamento.md`](file:///Users/vitortavares/Desktop/Alfabra-Vector/.claude/worktrees/chore-240-deploy-render/docs/deploy/orcamento.md)

---

## 1. Visão Geral e Objetivo

Este documento consolida a avaliação técnica e financeira de deploy do Alfabra Vector, com foco na prova de conceito (POC) da **Issue #240**: análise da viabilidade de uso do **Render free tier** para o estágio de dev/testes.

---

## 2. Critérios de Aceite e Avaliação da POC (Issue #240)

### 2.1. Escolha de 1 serviço não-crítico do backend para POC
- **Serviço Selecionado**: `rag-worker` (ou `document-processing`), localizado em `rust-services/`.
- **Justificativa**:
  - Binários Rust compilados possuem consumo mínimo de memória RAM (~20–50MB RSS), enquadrando-se com ampla folga no limite de 512MB de RAM do Web Service gratuito do Render.
  - Baixo acoplamento síncrono no fluxo de UI: opera via filas de mensagens / jobs assíncronos.
  - Permite isolar o teste de conteinerização Docker no Render sem exigir que o frontend ou o `java-core` (que consome muito mais memória devido à JVM) estejam rodando no Render.

### 2.2. Impacto do Cold Start (~1 min) e Limite de 750h/mês
- **Cold Start**: Após 15 minutos de inatividade no tráfego de entrada HTTP, a instância do Web Service entra em modo de hibernação ("sleep"). O cold start para reativar o container leva em média de 30 a 90 segundos. Para testes assíncronos/pontuais é suportável, porém frustrante e inviável para fluxos contínuos de QA manual interativo.
- **Limite de 750h/mês por Workspace**:
  - Render concede 750 horas de instâncias gratuitas por mês por workspace.
  - 1 única instância 24/7 consome cerca de 744h/mês (31 dias × 24h), esgotando praticamente todo o saldo do workspace.
  - Subir os 7 serviços do backend do Alfabra Vector simultaneamente consumiria 5.208h/mês, estourando a cota em menos de 5 dias e causando a suspensão imediata de todos os serviços do workspace.
- **Banda de Egress (5GB/mês por workspace)**: Reduzida em abril/2026, é facilmente esgotada em testes de ingestão de documentos pesados ou reindexação.

### 2.3. Validação do PostgreSQL Free e `pgvector`
- **Suporte ao `pgvector`**: Confirmado 100% funcional no Render Postgres a partir da v13 (`CREATE EXTENSION vector`), sem restrição por plano/tier.
- **Expiração Obrigatória em 30 Dias**: Instâncias Postgres gratuitas no Render expiram 30 dias após a criação (com 14 dias adicionais de carência antes do expurgo irreversível dos dados).
- **Veredito para Banco de Dados**: Inviável para ambiente persistente de dev/staging sem uma rotina manual e recorrente de exportação/importação de dados. Serve apenas para bancos de dados efêmeros de teste.

---

## 3. Matriz Comparativa do Render Free Tier

| Recurso | Limite Free Tier | Veredito / Implicação para o Alfabra Vector |
|---|---|---|
| **Web Services** | 750h/mês compartilhadas; sleep após 15 min | Viável para 1 serviço isolado; inviável para os 7 serviços do backend. |
| **Banda** | 5GB/mês por workspace | Restritivo para cargas pesadas de documentos. |
| **PostgreSQL** | 1GB storage; expira em 30 dias | Apenas para testes efêmeros (`CREATE EXTENSION vector` funciona). |
| **Redis (Key-Value)** | 25MB, 50 conexões | Suficiente para cache efêmero muito leve. |
| **RabbitMQ** | Sem serviço nativo no Render | Usar CloudAMQP plano Little Lemur (grátis, 1M msgs/mês, sem expiração). |

---

## 4. Recomendação Final de Deploy

1. **Dev / Testes Contínuos**: Não utilizar o free tier do Render para o backend completo. A opção de menor custo e maior facilidade operacional para o backend completo permanece sendo um PaaS pago (Render Starter a ~$60–95/mês) ou Google Cloud Run + Cloud SQL.
2. **POC Pontual**: O free tier pode ser utilizado pontualmente para validar a conteinerização e execução de 1 serviço desacoplado (como o `rag-worker`).

---

*Para a análise completa de custos incluindo Vercel, GCP, AWS e Provedores de LLM, consulte [`docs/deploy/orcamento.md`](file:///Users/vitortavares/Desktop/Alfabra-Vector/.claude/worktrees/chore-240-deploy-render/docs/deploy/orcamento.md).*
