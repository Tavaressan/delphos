# Onboarding: Instruções de Configuração e Validação da PoC

> Identificador da feature: `007-poc-api-integration`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/007-poc-api-integration/requirements.md`

Este guia fornece instruções práticas passo a passo para inicializar o ambiente de desenvolvimento, configurar as integrações de rede e validar o funcionamento da PoC integrada.

---

## 1. Configuração do Ambiente Local

### 1.1. Variáveis de Ambiente do Frontend
1. Crie o arquivo `frontend/.env.local` na raiz da pasta `frontend/`:
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://<seu-subdominio-duckdns>.duckdns.org
   ```
   *Nota: Caso precise realizar testes apontando diretamente para o contêiner local sem passar pelo proxy Caddy (e.g. contornando problemas de DNS local ou SSL), configure para:*
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
   ```

### 1.2. Inicializando os Serviços Backend (Docker)
Garanta que os serviços de apoio estejam de pé. Execute no terminal a partir da raiz do monorepo:
```bash
# Sobe o banco de dados PostgreSQL, Redis, RabbitMQ e o Spring Boot
docker-compose up -d postgres redis rabbitmq core
```
Alternativamente, utilize o script de desenvolvimento fornecido:
```bash
./scripts/dev.sh
```

---

## 2. Execução do Frontend

Navegue até o diretório do frontend, instale as dependências de pacotes e inicialize o servidor de desenvolvimento do Next.js:
```bash
cd frontend
npm install
npm run dev
```
O console deverá indicar que o servidor Next.js iniciou na porta `3000` (`http://localhost:3000`).

---

## 3. Validação do Funcionamento (Roteiro de Testes)

### 3.1. Validação de Conectividade (Health Check)
1. Abra a aplicação em `http://localhost:3000`.
2. Observe o indicador de conectividade posicionado no menu lateral ou cabeçalho.
3. Ele deve realizar a chamada para `GET /actuator/health` e apresentar a cor **Verde (Online)**.
4. Para testar o comportamento negativo, pare o serviço `core`:
   ```bash
   docker stop core
   ```
5. Aguarde até 30 segundos. O indicador do frontend deve mudar para **Vermelho (Offline)**. Inicialize o contêiner novamente antes de prosseguir:
   ```bash
   docker start core
   ```

### 3.2. Teste do Fluxo de Execução do Chat RAG
1. Com o backend online, acesse a aba de chat no console do frontend.
2. Escreva um prompt na caixa de chat (Ex.: "Qual é a periodicidade de inspeção de cabos?") e clique em Enviar.
3. No console de desenvolvedor do navegador (F12 > guia Rede/Network):
   * Confirme a requisição HTTP POST para `${NEXT_PUBLIC_BACKEND_URL}/api/executions` enviando o prompt e retornando o `executionId`.
   * Monitore as requisições HTTP GET periódicas a cada 2 segundos direcionadas a `${NEXT_PUBLIC_BACKEND_URL}/api/executions/{executionId}`.
4. Veja se o componente de timeline na tela reflete o progresso do status (REQUESTED -> QUEUED -> COMPLETED).
5. Após o status retornar `COMPLETED`, valide se a resposta de texto gerada pelo pipeline do RAG é exibida no balão do assistente na tela do chat.

---

## 4. Resolução de Problemas (Depuração de CORS)

Durante a integração do frontend com o backend via DuckDNS (`https://<seu-subdominio-duckdns>.duckdns.org`), erros de políticas CORS (Cross-Origin Resource Sharing) podem ser exibidos no console de desenvolvedor do navegador (F12 > Console).

### 4.1. Sintomas Comuns
- Mensagem no console: `Access to fetch at '...' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check`.
- Indicador de Health Check mostra "Offline" mesmo com o backend Java e Caddy rodando localmente.

### 4.2. Como Investigar
1. Verifique a aba **Network (Rede)** no painel do desenvolvedor.
2. Identifique a requisição vermelha (bloqueada).
3. Verifique se o status do preflight (`OPTIONS`) retornou sucesso (status `200` ou `204`).
4. Verifique as configurações na classe [SecurityConfig.java](file:///Users/vitortavares/Desktop/Alfabra%20Vector/java-core/src/main/java/com/company/core/infrastructure/config/SecurityConfig.java) no backend Java. As origens permitidas devem bater exatamente com o endereço do frontend (incluindo porta e protocolo):
   - `http://localhost:3000` (desenvolvimento)
   - `https://alfabra-vector.vercel.app` (produção)

### 4.3. Resolução no Caddy
Se o erro de CORS persistir nas requisições roteadas pelo Caddy, confirme que os headers de CORS não estão sendo suprimidos ou alterados pelo proxy. O arquivo [infrastructure/caddy/Caddyfile](file:///Users/vitortavares/Desktop/Alfabra%20Vector/infrastructure/caddy/Caddyfile) deve apenas encaminhar as requisições (`reverse_proxy core:8080`), permitindo que a resposta de CORS configurada pelo Spring Security chegue intacta ao cliente.
