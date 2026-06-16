# Investigation: Hardened CI & Defense in Depth

Este documento apresenta a análise de engenharia e a fundamentação teórica para as escolhas de design da feature `013-ci-security-hardening`.

---

## 1. Otimização e Cache de CI/CD (GitHub Actions)

### 1.1. Caching do Next.js
Compilar aplicações Next.js gera a pasta `.next/cache`, que armazena payloads de páginas estáticas e resultados de compilações intermediárias. 
*   **Investigação:** De acordo com as diretrizes do Vercel e GitHub, o uso de `actions/cache` apontando para `frontend/.next/cache` com uma chave composta pelo hash de arquivos fontes React/TypeScript reduz drasticamente (até 65%) o tempo de execução de `next build`.
*   **Alternativa avaliada:** Sem cache (recompilação limpa do zero a cada execução). Descartado porque aumentaria muito o consumo de minutos do workflow e atrasaria o feedback de PRs.

### 1.2. Swatinem/rust-cache
O Rust possui tempos de compilação historicamente altos devido à resolução de tipos e dependências pesadas (`cargo build`). 
*   **Análise:** O `Swatinem/rust-cache` é o padrão da comunidade Rust para GitHub Actions, salvando automaticamente o diretório `target` do cargo workspace. A configuração do parâmetro `workspaces` no formato `pasta -> pasta/target` é necessária em monorepos para evitar conflitos de cache cruzados.

---

## 2. Mitigação de Prompt Injection (OWASP LLM01)

### 2.1. Abordagens Analisadas
1.  **Classificador LLM Secundário (Llama Guard / Guardrails):** Utilizar um modelo menor local ou chamada a APIs dedicadas de moderação.
    *   *Trade-off:* Introduz latência significativa (uma chamada de rede a mais para cada prompt) e custos adicionais na Vertex AI.
2.  **Delimitadores de Contexto Estruturados (XML/System Rules):** Isolar os trechos do RAG dentro de tags delimitadas (ex: `<context>...</context>`) instruindo o LLM a tratar tudo dentro delas estritamente como informação bruta, não comandos.
3.  **Pattern Matching / Regex Middleware (Recomendado):** Analisar a String do prompt antes do envio para a LLM, gerando um score baseado na presença de strings de injeção de sistema clássicas ("ignore previous instructions", "reveal system prompt", "jailbreak").
    *   *Trade-off:* Extremamente rápido (sub-milissegundo), sem custo e fácil de manter via regras estáticas configuráveis.

*Decisão:* Combinar a abordagem 2 (delimitadores no prompt) com a 3 (regex no middleware) para fornecer proteção contra injeções comuns sem adicionar latência ou custo.

---

## 3. Escaneamento de Arquivos no Upload (ClamAV TCP Protocol)

### 3.1. Abordagens de Integração com ClamAV
*   **ClamAV CLI local (`clamscan`):** Instalar o ClamAV na própria imagem Docker da API Java. Cada upload executa um processo subprocess `clamscan arquivo.pdf`.
    *   *Problema:* Extremamente lento, consome recursos excessivos de CPU/Memória a cada chamada e infla o tamanho da imagem de produção.
*   **ClamAV Daemon via Socket TCP (`clamd`):** Rodar um container separado do ClamAV em background no Docker. A API Spring Boot comunica-se via rede interna utilizando o protocolo TCP e enviando o stream de bytes em lotes (`INSTREAM`).
    *   *Vantagens:* Altamente escalável, isolamento de recursos (se o scan travar ou estourar a memória, não derruba a API principal), rapidez no retorno e imagens de aplicação limpas.

---

## 4. Isolamento Multi-Tenant em Persistência

### 4.1. Row Level Security (RLS) vs Filtro na Aplicação
1.  **Filtro Manual via JPA (`WHERE tenant_id = :id`):** O desenvolvedor adiciona a cláusula em cada repositório JPA.
    *   *Risco:* Altamente propenso a erros humanos. Se um desenvolvedor esquecer de adicionar o filtro numa nova query, haverá vazamento de dados.
2.  **PostgreSQL Row Level Security (RLS):** Habilitar RLS nas tabelas e rodar um comando SQL no início de cada transação configurando a sessão (`SET LOCAL app.current_tenant_id = '...'`). O próprio banco rejeita requisições fora do escopo.
    *   *Vantagens:* Camada de segurança intransponível direto no banco de dados, protegendo contra vazamentos mesmo em queries ad-hoc escritas sem o filtro de tenant explícito.

*Decisão:* Adotar RLS no banco de dados como barreira de segurança física de persistência principal, e manter a validação no Repository do Java para feedback de validação explícita.
