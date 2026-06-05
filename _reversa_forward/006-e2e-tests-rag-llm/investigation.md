# Investigation: Testes E2E com Node.js Test Runner e assertions nativas

> Identificador: `006-e2e-tests-rag-llm`
> Data: `2026-06-05`
> Documento principal: `_reversa_forward/006-e2e-tests-rag-llm/roadmap.md`

Este documento consolida o estudo de viabilidade para a implementação da suíte de testes E2E do RAG e validação de scripts do Alfabra Vector, focando na escolha de bibliotecas leves e nativas para o ecossistema local.

## 1. Node.js Native Test Runner (`node:test`)

A partir do Node.js v18 (e consolidado estavelmente na v20), o runtime do Node passou a contar com um módulo nativo de testes robusto. Ele suporta descrever conjuntos de testes e asserções sem a necessidade de instalar pacotes de terceiros como `Jest`, `Mocha` ou `Vitest`.

### 1.1. Vantagens do runner nativo
- **Zero instalação de pacotes:** Não há necessidade de instalar um test runner pesado ou configurar bundlers de TS/JS na raiz do monorepo.
- **Velocidade de boot:** O tempo de inicialização de um teste nativo é de poucos milissegundos, agilizando execuções locais.
- **Suporte nativo a Hooks:** Disponibiliza `before`, `after`, `beforeEach` e `afterEach` nativos para setup e teardown de conexões com o banco de dados.

### 1.2. Estrutura de exemplo (Código nativo)
```javascript
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';

describe('Suíte de Testes E2E', () => {
  before(async () => {
    // Setup: conectar ao banco, validar que containers estão ativos
  });

  after(async () => {
    // Teardown: limpar dados temporários do banco
  });

  test('Deve verificar o healthcheck dos serviços principais', async () => {
    const res = await fetch('http://localhost:8080/actuator/health');
    assert.strictEqual(res.status, 200);
  });
});
```

## 2. Conectividade de Banco de Dados com `pg`

Para validar as tabelas de chunks e transições de estado dos documentos, o teste precisará interagir de forma simples com o PostgreSQL local.
Será necessária a instalação de apenas uma única dependência no package.json na raiz do projeto: `pg` (driver nativo de PostgreSQL para Node.js).
O driver `pg` permite executar consultas parametrizadas de forma assíncrona, viabilizando asserções rápidas:

```javascript
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rag_db'
});
await client.connect();

const res = await client.query('SELECT status FROM documents WHERE id = $1', [docId]);
assert.strictEqual(res.rows[0].status, 'INDEXED');
```

## 3. Alternativas avaliadas e descartadas

- **Scripts puros em Bash com `curl` e `jq`:**
  - *Razão do descarte:* Embora o Bash seja ótimo para chamar scripts de ciclo de vida (`reset.sh`, `setup.sh`), ele se torna muito complexo, inseguro e propenso a erros ao lidar com chamadas assíncronas concorrentes, decodificação de JSON aninhado nos retornos de chat da API, conexão e execução de queries SQL no PostgreSQL para validar chunks e controle de fluxos complexos de retentativa.
- **Framework de Testes Jest ou Mocha:**
  - *Razão do descarte:* Exigem dependências extensas, gerando um diretório `node_modules` volumoso na raiz e demandando configurações complexas de compilação ou carregamento de módulos ES6/TypeScript.
- **Testes de integração nativos em Rust/Java:**
  - *Razão do descarte:* Dividiriam a suíte de testes E2E do monorepo em duas bases separadas (`java-core/src/test` e `rust-services/tests`), perdendo a visão integrada e gerando a necessidade de configurar dependências em ambos os mundos apenas para rodar testes que cobrem as fronteiras entre eles.
