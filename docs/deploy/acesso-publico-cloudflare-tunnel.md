# Acesso público ao backend via Cloudflare Tunnel

> Escrito em 2026-08-18, após validação de runtime da stack completa.
> Contexto: tornar o frontend hospedado em `https://alfabra-vector.vercel.app`
> utilizável por pessoas fora da máquina de desenvolvimento.

## TL;DR

O frontend na Vercel chama `NEXT_PUBLIC_BACKEND_URL`. Hoje essa variável aponta para
`https://rag-corporativo.duckdns.org`, que resolve para `127.0.0.1` — só funciona no
próprio Mac de desenvolvimento. O Cloudflare Tunnel resolve isso sem mexer em roteador,
sem IP fixo e sem depender do provedor.

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:8080
```

Copie a URL `https://<algo>.trycloudflare.com` que ele imprime, defina como
`NEXT_PUBLIC_BACKEND_URL` no projeto da Vercel e **redeploye**.

> **O redeploy não é opcional.** `NEXT_PUBLIC_*` entra no bundle em build time — salvar
> a variável no painel da Vercel sem redeployar não altera o site publicado. Detalhes na
> [seção 5](#5-ajustar-as-variáveis-de-ambiente-na-vercel).

---

## Por que não usar DuckDNS apontando para o IP público

Testado e descartado em 2026-08-18. O registro foi apontado para o IP público
(`187.10.236.26`) e o resultado foi:

| Porta | Resultado |
|---|---|
| 443 | `Operation timed out` — sem encaminhamento |
| 80 | `HTTP/1.1 502 Connection refused` com header `Via: HTTP/1.1 forward.http.proxy:3128` |

Esse `Via` é um **proxy transparente do provedor** interceptando a porta 80. O tráfego
nunca chega na máquina — o ISP responde antes. Port forwarding no roteador **não
resolveria**, porque a interceptação acontece a montante.

O registro foi revertido para `127.0.0.1`, que é o único estado em que o acesso local
funciona.

Conclusão: em conexão residencial com proxy transparente, DNS dinâmico + port forward
não é um caminho viável. O túnel é, porque a conexão parte **de dentro para fora**
(egress), que o provedor não intercepta.

---

## Arquitetura da solução

```
Visitante
   |
   v
https://alfabra-vector.vercel.app        <- frontend (Next.js, hospedado na Vercel)
   |
   |  fetch(NEXT_PUBLIC_BACKEND_URL + "/api/...")
   v
https://<algo>.trycloudflare.com         <- borda da Cloudflare (TLS terminado aqui)
   |
   |  túnel persistente, iniciado de dentro da rede local
   v
cloudflared (processo local)
   |
   v
localhost:8080                            <- core-platform (Spring Boot)
```

### Por que apontar para a porta 8080 e não para o Caddy (80/443)

Duas razões concretas:

1. **O Caddyfile tem um único site block, `{$DOMAIN_NAME}`.** Requisições chegando com
   Host `<algo>.trycloudflare.com` não casam com nenhum bloco e caem em 404.
2. **O Caddy na porta 80 emite `308 Permanent Redirect` para `https://`.** Pelo túnel,
   isso mandaria o visitante de volta para `rag-corporativo.duckdns.org`, que resolve
   para o `localhost` **dele** — quebrando exatamente o que se quer consertar.

Expondo `localhost:8080` diretamente, o túnel serve a API e a Vercel serve a UI. O CORS
do core já libera a origem da Vercel (`CORS_ALLOWED_ORIGINS` no `.env`), então não há
configuração adicional.

---

## Passo a passo

### 1. Instalar

```bash
brew install cloudflared
cloudflared --version   # validado com 2026.8.2
```

### 2. Subir a stack

```bash
cd /Users/vitortavares/Desktop/Alfabra-Vector
docker compose up -d --wait --no-build \
  postgres minio rabbitmq core embedding-service \
  ingestion-worker rag-worker workflow-worker script-executor frontend caddy
```

Confirme que o core responde antes de abrir o túnel:

```bash
curl -s http://localhost:8080/actuator/health
# esperado: {"groups":["liveness","readiness"],"status":"UP"}
```

### 3. Abrir o túnel

```bash
cloudflared tunnel --url http://localhost:8080
```

A saída inclui um bloco parecido com:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):   |
|  https://algum-nome-aleatorio.trycloudflare.com                                             |
+--------------------------------------------------------------------------------------------+
```

O processo precisa continuar rodando. Fechando o terminal, o túnel cai.

### 4. Validar antes de mexer na Vercel

```bash
curl -s https://<algo>.trycloudflare.com/actuator/health
# esperado: {"groups":["liveness","readiness"],"status":"UP"}
```

Se isso não responder, não adianta seguir — o problema está no túnel ou na stack.

### 5. Ajustar as variáveis de ambiente na Vercel

**Este é o passo que efetivamente liga o frontend ao backend. Sem ele, nada do que foi
feito acima tem efeito visível.**

No painel da Vercel: **Project → Settings → Environment Variables**

| Nome | Valor | Environments |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://<algo>.trycloudflare.com` | Production, Preview, Development |

Sem barra no final. O código concatena direto (`BASE_URL + "/api/..."`), então uma barra
sobrando gera `//api/...`.

#### ⚠️ Redeploy é obrigatório

`NEXT_PUBLIC_*` é embutida no bundle JavaScript em **build time**, não lida em runtime.
Salvar a variável no painel **não muda nada** no site já publicado. É preciso:

**Deployments → deployment mais recente → menu (⋯) → Redeploy**

Desmarque "Use existing Build Cache" para garantir que o valor novo entre no bundle.

#### Como confirmar que pegou

Abra `https://alfabra-vector.vercel.app`, DevTools → aba **Network**, e recarregue. As
chamadas XHR devem sair para `https://<algo>.trycloudflare.com/api/...`. Se ainda
aparecer `rag-corporativo.duckdns.org`, o redeploy não aconteceu ou usou cache.

#### O fallback hardcoded

Se a variável não estiver definida, o código cai em um default embutido:

```js
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rag-corporativo.duckdns.org';
```

Presente em `frontend/src/app/(main)/catalog/CatalogClient.tsx` (linhas 111, 149, 171, 185)
e `frontend/src/app/(main)/knowledge-base/page.tsx` (linha 88). Como esse domínio resolve
para `127.0.0.1`, o visitante bate no próprio localhost e o sintoma é a página carregar
mas ficar vazia, sem erro óbvio.

#### Toda vez que o túnel reiniciar

O quick tunnel gera **hostname novo a cada execução** do `cloudflared`. Sempre que o
processo cair e você reabrir, é obrigatório repetir: atualizar `NEXT_PUBLIC_BACKEND_URL`
**e** redeployar. Um túnel nomeado elimina esse ciclo — ver seção de limitações.

#### Gotcha no `.env.example`

O `.env.example` versionado traz `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`. Essa
porta é do **embedding-service**, não do java-core (que escuta em `8080`). Para uso local
o valor correto é `http://localhost:8080`. Não corrigido aqui para manter este commit
restrito ao escopo documentado.

---

## ⚠️ Antes de divulgar o link: não há autenticação

O `SecurityConfig` do java-core é `.anyRequest().permitAll()`, sem filtro de JWT. O
isolamento entre tenants é feito por um **query param escolhido pelo cliente**:

```
GET /api/documents?tenantId=<qualquer-uuid>
```

Qualquer pessoa com a URL do túnel pode listar, ler e enviar documentos de qualquer
tenant, bastando trocar o UUID. Isso é o mecanismo de acesso atual, não uma hipótese.

Rastreado em #171 (RBAC + ownership) e #338 (validação de tenant no ChatController).

### Mitigação sem tocar no código: Cloudflare Access

Um túnel nomeado (não o quick tunnel) pode ficar atrás do Cloudflare Access, que exige
login antes de qualquer requisição chegar na aplicação:

1. Criar conta Cloudflare e adicionar um domínio
2. `cloudflared tunnel login`
3. `cloudflared tunnel create alfabra`
4. `cloudflared tunnel route dns alfabra api.seudominio.com`
5. Zero Trust → Access → Applications → política de e-mails permitidos

Isso põe autenticação na frente do sistema enquanto o RBAC não existe. É a forma mais
rápida de compensar a ausência de JWT.

---

## Limitações do quick tunnel

| Limitação | Detalhe |
|---|---|
| URL efêmera | Muda a cada reinício do `cloudflared` — e exige novo redeploy na Vercel |
| Sem SLA | `trycloudflare.com` é explicitamente para testes, não para produção |
| Máquina precisa ficar acordada | O daemon do Docker já caiu duas vezes por sleep/recurso nesta máquina |
| Sem autenticação | Ver seção acima |

Para uso contínuo, um **túnel nomeado** resolve a URL efêmera (hostname fixo) e habilita
o Access. Para produção de verdade, o caminho é deploy do backend — ver
`docs/deploy/orcamento.md` (~$60–95/mês no Render) e `infrastructure/render/render.yaml`
(hoje só um PoC do rag-worker, com Postgres free que expira em 30 dias).

---

## Estado funcional conhecido (validado em 2026-08-18)

Funciona ponta a ponta:

- Upload de documento → MinIO autenticado via S3 → chunking → embedding 768 dims →
  pgvector → busca vetorial → resposta do LLM
- Verificado com pergunta cuja resposta só existia no documento indexado

Requer atenção:

- `GCP_CHAT_MODEL_ID` precisa ser `gemini-3.6-flash`. O `gemini-2.5-flash` foi aposentado
  pelo Google ("no longer available to new users") e o `.env.example` versionado ainda
  traz `gemini-1.5-flash-002`, mais antigo ainda.
- O Vertex AI retorna `BILLING_DISABLED` e o sistema cai no fallback do Google AI Studio.
  Isso é esperado e não quebra nada — a resposta vem em ~3s.
- `crew-worker` não sobe (imagem não builda, ver #384). Não participa do fluxo RAG nem
  do frontend.
