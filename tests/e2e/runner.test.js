import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Client } = pg;

// API HTTP de management do RabbitMQ (mesma instância já usada pelo teste T005/T006 para
// publicar diretamente na exchange, sem depender de um publisher amqp dedicado no Node).
const RABBITMQ_MGMT_BASE = 'http://localhost:15672/api';
const RABBITMQ_MGMT_AUTH = 'Basic ' + Buffer.from('guest:guest').toString('base64');

describe('Suite de Testes End-to-End - Alfabra Vector', () => {
  let dbClient;

  before(async () => {
    // Inicializar conexão com o banco de dados PostgreSQL
    dbClient = new Client({
      connectionString: config.dbUrl
    });
    // Vamos conectar apenas após subir os containers no primeiro teste
  });

  after(async () => {
    if (dbClient) {
      try {
        await dbClient.end();
        console.log('Conexão com PostgreSQL encerrada.');
      } catch (err) {
        console.error('Erro ao fechar conexão com PostgreSQL:', err.message);
      }
    }
  });

  test('T004 - Validação do Ciclo de Vida do Ambiente (reset.sh e setup.sh)', async () => {
    if (process.env.SKIP_RESET === 'true') {
      console.log('Passo 1: SKIP_RESET=true detectado. Pulando scripts de reinicialização do ambiente Docker.');
    } else {
      console.log('Passo 1: Executando scripts de reinicialização e provisionamento do ambiente...');

      // Executar reset.sh e setup.sh
      try {
        execSync('./scripts/reset.sh', { stdio: 'inherit' });
        execSync('./scripts/setup.sh', { stdio: 'inherit' });
      } catch (err) {
        assert.fail(`Erro ao executar scripts de inicialização: ${err.message}`);
      }
    }

    console.log('Passo 2: Monitorando healthchecks dos serviços...');

    // Realizar polling ativo dos endpoints de healthcheck
    let backendHealthy = false;
    let embeddingHealthy = false;
    let frontendHealthy = false;

    const maxAttempts = 30; // 60 segundos no total (tentativas de 2s)
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Tentativa ${attempt}/${maxAttempts} de healthcheck...`);

      if (!backendHealthy) {
        try {
          const res = await fetch(`${config.backendUrl}/actuator/health`);
          if (res.status === 200) {
            backendHealthy = true;
            console.log('🟢 Backend (Spring Boot) está saudável.');
          }
        } catch (e) {
          // Ignorar erros de conexão temporários
        }
      }

      if (!embeddingHealthy) {
        try {
          const res = await fetch('http://localhost:8000/healthz');
          if (res.status === 200) {
            embeddingHealthy = true;
            console.log('🟢 Embedding Service (Rust) está saudável.');
          }
        } catch (e) {
          // Ignorar
        }
      }

      if (!frontendHealthy) {
        try {
          const res = await fetch('http://localhost:3000');
          if (res.status === 200 || res.status === 304) {
            frontendHealthy = true;
            console.log('🟢 Frontend (Next.js) está saudável.');
          }
        } catch (e) {
          // Ignorar
        }
      }

      if (backendHealthy && embeddingHealthy && frontendHealthy) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    assert.ok(backendHealthy, 'Erro: Backend (Spring Boot) não ficou pronto no tempo limite.');
    assert.ok(embeddingHealthy, 'Erro: Embedding Service (Rust) não ficou pronto no tempo limite.');
    assert.ok(frontendHealthy, 'Erro: Frontend (Next.js) não ficou pronto no tempo limite.');

    console.log('🟢 Todos os serviços subiram e estão respondendo com sucesso.');

    // Conectar ao banco agora que o container PostgreSQL está saudável
    await dbClient.connect();
    console.log('Conectado ao PostgreSQL com sucesso.');
  });

  test('T005 e T006 - Teste Integrado de Ingestão de Documentos (RAG) e Vetores', async () => {
    // 1. Inserir documento fictício no status UPLOADING
    const docId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';

    // Desde a correção da issue #117, o ingestion-worker não tem mais um
    // fallback silencioso para arquivo ausente — ele precisa encontrar o
    // arquivo de verdade (MinIO ou, como aqui, leitura local). O diretório
    // rust-services/ é montado como /app dentro do container do
    // ingestion-worker (docker-compose.yml), então um arquivo escrito aqui
    // no host é lido pelo fallback legítimo de leitura local
    // (std::fs::read), sem precisar subir nada no MinIO nem usar
    // INGESTION_DEV_FALLBACK.
    const fileName = 'e2e_test_doc_T005.txt';
    const localFilePath = path.resolve(__dirname, '../../rust-services', fileName);
    fs.writeFileSync(
      localFilePath,
      'Texto de teste E2E para validar chunking, geração de embeddings e persistência no pgvector.'
    );

    console.log(`Passo 1: Inserindo documento de teste com ID ${docId}...`);

    // Assegurar usuário padrão admin para o FK
    await dbClient.query(`
      INSERT INTO users (id, username, email, password_hash, first_name, last_name, status)
      VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00', 'admin_e2e', 'admin_e2e@company.com', 'hash', 'Admin', 'E2E', 'ACTIVE')
      ON CONFLICT (username) DO NOTHING
    `);

    const userRes = await dbClient.query("SELECT id FROM users WHERE username = 'admin_e2e'");
    const userId = userRes.rows[0].id;

    await dbClient.query(`
      INSERT INTO documents (id, name, file_path, file_size, file_type, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [docId, fileName, fileName, 1024, 'txt', userId, 'UPLOADING']);

    try {
      // 2. Publicar mensagem para o RabbitMQ via API de Gerenciamento HTTP
      console.log('Passo 2: Publicando mensagem de ingestão no RabbitMQ...');
      const rabbitUrl = 'http://localhost:15672/api/exchanges/%2f/amq.default/publish';
      const auth = 'Basic ' + Buffer.from('guest:guest').toString('base64');

      const rabbitPublishRes = await fetch(rabbitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth
        },
        body: JSON.stringify({
          properties: { delivery_mode: 2 },
          routing_key: 'document.ingestion.jobs',
          payload: JSON.stringify({
            document_id: docId,
            file_path: fileName,
            tenant_id: tenantId,
            file_type: 'txt'
          }),
          payload_encoding: 'string'
        })
      });

      assert.strictEqual(rabbitPublishRes.status, 200, 'Falha ao enviar mensagem de ingestão ao RabbitMQ via API de Gerenciamento.');

      // 3. Fazer polling no banco verificando a transição de status para INDEXED
      console.log('Passo 3: Monitorando alteração de status do documento no banco...');
      let indexed = false;
      const maxPollAttempts = 15;
      for (let i = 0; i < maxPollAttempts; i++) {
        const res = await dbClient.query('SELECT status, processing_error FROM documents WHERE id = $1', [docId]);
        const status = res.rows[0]?.status;
        const error = res.rows[0]?.processing_error;

        console.log(`Verificação ${i + 1}/${maxPollAttempts}: Status = ${status}`);
        if (status === 'INDEXED') {
          indexed = true;
          break;
        }
        if (status === 'FAILED') {
          assert.fail(`O processamento do documento falhou com erro: ${error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      assert.ok(indexed, 'Erro: O status do documento de teste não transicionou para INDEXED no tempo esperado.');

      // 4. Validar chunks de vetores no pgvector
      console.log('Passo 4: Validando persistência e dimensionalidade dos vetores no PostgreSQL...');
      const chunksRes = await dbClient.query('SELECT id, embedding::text FROM document_chunks WHERE document_id = $1', [docId]);

      assert.ok(chunksRes.rows.length > 0, 'Erro: Nenhum chunk vetorial foi localizado no banco.');

      // Obter o vetor e verificar o tamanho
      const rawVector = chunksRes.rows[0].embedding;
      // O formato retornado do cast ::text é: [0.123, -0.456, ...]
      const vectorElements = rawVector.replace('[', '').replace(']', '').split(',');

      assert.strictEqual(vectorElements.length, 768, `Erro: A dimensionalidade do vetor deveria ser 768, mas retornou ${vectorElements.length}.`);
      console.log('🟢 Chunks vetoriais e dimensões validados com sucesso.');
    } finally {
      fs.rmSync(localFilePath, { force: true });
    }
  });

  test('T010 - Regressão #117: arquivo ausente no MinIO deve falhar a ingestão (FAILED + processing_error), sem mascarar com texto mock', async () => {
    // 1. Inserir documento fictício apontando para um arquivo que não existe
    // nem no MinIO nem localmente no ingestion-worker.
    const docId = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01';
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    const missingFilePath = 'arquivo_que_nao_existe_no_minio_117.pdf';

    console.log(`Passo 1: Inserindo documento de teste com ID ${docId} apontando para arquivo inexistente...`);

    await dbClient.query(`
      INSERT INTO users (id, username, email, password_hash, first_name, last_name, status)
      VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00', 'admin_e2e', 'admin_e2e@company.com', 'hash', 'Admin', 'E2E', 'ACTIVE')
      ON CONFLICT (username) DO NOTHING
    `);

    const userRes = await dbClient.query("SELECT id FROM users WHERE username = 'admin_e2e'");
    const userId = userRes.rows[0].id;

    await dbClient.query(`
      INSERT INTO documents (id, name, file_path, file_size, file_type, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [docId, 'documento_ausente_117.pdf', missingFilePath, 1024, 'pdf', userId, 'UPLOADING']);

    // 2. Publicar mensagem para o RabbitMQ via API de Gerenciamento HTTP
    console.log('Passo 2: Publicando mensagem de ingestão referenciando arquivo ausente...');
    const rabbitUrl = 'http://localhost:15672/api/exchanges/%2f/amq.default/publish';
    const auth = 'Basic ' + Buffer.from('guest:guest').toString('base64');

    const rabbitPublishRes = await fetch(rabbitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify({
        properties: { delivery_mode: 2 },
        routing_key: 'document.ingestion.jobs',
        payload: JSON.stringify({
          document_id: docId,
          file_path: missingFilePath,
          tenant_id: tenantId,
          file_type: 'pdf'
        }),
        payload_encoding: 'string'
      })
    });

    assert.strictEqual(rabbitPublishRes.status, 200, 'Falha ao enviar mensagem de ingestão ao RabbitMQ via API de Gerenciamento.');

    // 3. Fazer polling no banco verificando a transição de status para FAILED
    // com processing_error populado (nunca deve virar INDEXED com texto mock).
    console.log('Passo 3: Monitorando alteração de status do documento no banco...');
    let failed = false;
    let lastStatus = null;
    let lastError = null;
    const maxPollAttempts = 20;
    for (let i = 0; i < maxPollAttempts; i++) {
      const res = await dbClient.query('SELECT status, processing_error FROM documents WHERE id = $1', [docId]);
      lastStatus = res.rows[0]?.status;
      lastError = res.rows[0]?.processing_error;

      console.log(`Verificação ${i + 1}/${maxPollAttempts}: Status = ${lastStatus}`);
      if (lastStatus === 'FAILED') {
        failed = true;
        break;
      }
      if (lastStatus === 'INDEXED') {
        assert.fail('O documento com arquivo ausente foi indexado com sucesso — o fallback de desenvolvimento mascarou a falha (regressão da issue #117).');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    assert.ok(failed, `Erro: O documento com arquivo ausente não transicionou para FAILED no tempo esperado (último status: ${lastStatus}).`);
    assert.ok(lastError && lastError.length > 0, 'Erro: processing_error deveria estar populado para o documento com arquivo ausente.');
    console.log(`🟢 Documento com arquivo ausente corretamente marcado como FAILED. processing_error: "${lastError}"`);

    // 4. Limpeza
    await dbClient.query('DELETE FROM documents WHERE id = $1', [docId]);
  });

  test('T007 e T008 - Teste do Endpoint de Chat / RAG de ponta a ponta', async () => {
    // Validar se provedor real exige chaves de acesso
    if (config.embeddingProvider === 'real' && !config.vertexAiApiKey && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('⚠️ Provedor configurado como REAL, mas VERTEX_AI_API_KEY e GOOGLE_APPLICATION_CREDENTIALS estão ausentes no ambiente. Ignorando teste real e reportando precondição.');
      return;
    }

    console.log('Passo 1: Enviando requisição de Chat/RAG para o backend Spring Boot...');
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';

    // Desde a issue #100, agentId é obrigatório em POST /api/executions — o backend
    // não gera mais um UUID aleatório para "chat genérico". Buscamos um agente real
    // do tenant; se nenhum existir, o precondition não está satisfeito e o teste é
    // ignorado (mesmo padrão usado acima para credenciais reais da Vertex AI ausentes).
    const agentsRes = await fetch(`${config.backendUrl}/api/agents?tenantId=${tenantId}`);
    const agents = agentsRes.ok ? await agentsRes.json() : [];
    if (!Array.isArray(agents) || agents.length === 0) {
      console.log('⚠️ Nenhum agente cadastrado para o tenant de teste. Ignorando teste e reportando precondição.');
      return;
    }
    const agentId = agents[0].id;

    const chatReq = await fetch(`${config.backendUrl}/api/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Qual a periodicidade de manutenção dos cabos?',
        tenantId: tenantId,
        agentId: agentId
      })
    });

    assert.strictEqual(chatReq.status, 200, 'Falha ao iniciar execução cognitiva de chat.');
    const chatPayload = await chatReq.json();
    const executionId = chatPayload.executionId;
    assert.ok(executionId, 'Erro: executionId não retornado pelo backend.');

    console.log(`Passo 2: Polling da execução cognitiva ${executionId}...`);

    let completed = false;
    let finalOutput = '';
    const maxAttempts = 20;

    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`${config.backendUrl}/api/executions/${executionId}`);
      if (res.status === 200) {
        const payload = await res.json();
        console.log(`Verificação ${i + 1}/${maxAttempts}: Status = ${payload.status}`);
        if (payload.status === 'COMPLETED') {
          completed = true;
          finalOutput = payload.output;
          break;
        }
        if (payload.status === 'FAILED') {
          assert.fail(`A execução do chat falhou com erro: ${payload.errorMessage}`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    assert.ok(completed, 'Erro: A execução cognitiva de chat não transicionou para COMPLETED.');
    assert.ok(finalOutput && finalOutput.length > 0, 'Erro: Resposta gerada do chat retornou vazia.');

    console.log('🟢 Chat E2E e orquestração cognitiva do RAG validados com sucesso!');
    console.log(`Saída do chat: "${finalOutput}"`);
  });

  test('T011 - Fluxo RAG resiliente com contexto vazio (tenant sem documentos indexados)', async () => {
    if (config.embeddingProvider === 'real' && !config.vertexAiApiKey && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('⚠️ Provedor configurado como REAL, mas credenciais ausentes. Ignorando teste.');
      return;
    }

    console.log('Passo 1: Enviando chat para tenant sem nenhum documento indexado...');
    const emptyTenantId = '11111111-1111-1111-1111-111111111111';

    const chatReq = await fetch(`${config.backendUrl}/api/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Existe algum documento cadastrado sobre esse assunto?',
        tenantId: emptyTenantId
      })
    });

    assert.strictEqual(chatReq.status, 200, 'Falha ao iniciar execução cognitiva para tenant sem documentos.');
    const chatPayload = await chatReq.json();
    const executionId = chatPayload.executionId;
    assert.ok(executionId, 'Erro: executionId não retornado pelo backend.');

    console.log(`Passo 2: Polling da execução cognitiva ${executionId} (contexto vazio)...`);

    let completed = false;
    let finalOutput = '';
    const maxAttempts = 20;

    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`${config.backendUrl}/api/executions/${executionId}`);
      if (res.status === 200) {
        const payload = await res.json();
        console.log(`Verificação ${i + 1}/${maxAttempts}: Status = ${payload.status}`);
        if (payload.status === 'COMPLETED') {
          completed = true;
          finalOutput = payload.output;
          break;
        }
        if (payload.status === 'FAILED') {
          assert.fail(`A execução com contexto vazio falhou inesperadamente: ${payload.errorMessage}`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    assert.ok(completed, 'Erro: execução com contexto vazio não transicionou para COMPLETED.');
    assert.ok(finalOutput && finalOutput.length > 0, 'Erro: rag-worker não retornou resposta mesmo sem chunks recuperados.');

    console.log('🟢 rag-worker responde de forma resiliente mesmo sem chunks indexados para o tenant.');
  });

  test('T012 - workflow-worker (Rust) consome job real e executa a DAG determinística', async () => {
    // Descoberta de dispatch (issue #118): hoje nenhum caminho em java-core
    // (AgentService, ExecutionController) publica na routing key "agent.workflow.requested"
    // que o workflow-worker consome (ver rust-services/workflow-worker/src/rabbitmq.rs -
    // start_consumer declara a fila "agent.workflow.queue" ligada a essa routing key na
    // exchange "agent.execution.exchange"). O próprio cenário Gherkin em
    // java-core/src/test/resources/features/04-workflow-execution.feature já descreve esse
    // fluxo, mas está marcado "@pending" - nunca foi automatizado. Este teste publica o job
    // diretamente na exchange (mesma técnica já usada pelo T005/T006 para
    // document.ingestion.jobs) para exercitar o worker Rust real, sem inventar filas/routing
    // keys que não existem no código.
    //
    // A definição de DAG usada (workflow_id fixo) já é semeada pela migração Flyway
    // V4__seed_workflow_data.sql: 2 nós (RAG -> TOOL) para a versão 1.
    //
    // Limitação conhecida e documentada: o workflow-worker publica seus eventos de ciclo de
    // vida (agent.workflow.started/completed/failed) usando routing_key = eventType. O
    // RabbitMQConfig do java-core só liga a fila "agent.execution.events" à routing key
    // "agent.execution.events" - essas mensagens não são roteadas para lá e por isso nunca
    // chegam ao AgentExecutionEventListener nem à tabela agent_executions. Ou seja, HOJE não
    // existe nenhuma linha em Postgres para consultar como "outcome" desta execução de
    // workflow. Para validar o comportamento real do worker sem fabricar uma integração que
    // não existe, este teste declara uma fila temporária e a vincula, via API de
    // gerenciamento do RabbitMQ, diretamente às routing keys que o worker já publica.
    const workflowId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    const workflowVersion = 1;
    const executionId = randomUUID();
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    const tmpQueue = `e2e.workflow.outcome.${executionId}`;

    console.log('Passo 1: Aguardando o workflow-worker declarar a fila "agent.workflow.queue"...');
    let workerReady = false;
    for (let i = 0; i < 30; i++) {
      const res = await fetch(`${RABBITMQ_MGMT_BASE}/queues/%2f/agent.workflow.queue`, {
        headers: { Authorization: RABBITMQ_MGMT_AUTH }
      });
      if (res.status === 200) {
        workerReady = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.ok(workerReady, 'Erro: workflow-worker não declarou a fila "agent.workflow.queue" a tempo (worker não conectou ao RabbitMQ?).');

    console.log('Passo 2: Declarando fila temporária e vinculando às routing keys de eventos do workflow-worker...');
    const declareRes = await fetch(`${RABBITMQ_MGMT_BASE}/queues/%2f/${tmpQueue}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: RABBITMQ_MGMT_AUTH },
      body: JSON.stringify({ durable: false, auto_delete: true })
    });
    assert.ok([200, 201, 204].includes(declareRes.status), 'Falha ao declarar fila temporária de observação de eventos.');

    for (const routingKey of ['agent.workflow.started', 'agent.workflow.completed', 'agent.workflow.failed']) {
      const bindRes = await fetch(`${RABBITMQ_MGMT_BASE}/bindings/%2f/e/agent.execution.exchange/q/${tmpQueue}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: RABBITMQ_MGMT_AUTH },
        body: JSON.stringify({ routing_key: routingKey })
      });
      assert.ok([200, 201, 204].includes(bindRes.status), `Falha ao vincular fila temporária à routing key ${routingKey}.`);
    }

    try {
      console.log(`Passo 3: Publicando job de workflow (execution_id=${executionId}) na routing key "agent.workflow.requested"...`);
      const publishRes = await fetch(`${RABBITMQ_MGMT_BASE}/exchanges/%2f/agent.execution.exchange/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: RABBITMQ_MGMT_AUTH },
        body: JSON.stringify({
          properties: { delivery_mode: 2 },
          routing_key: 'agent.workflow.requested',
          payload: JSON.stringify({
            workflow_id: workflowId,
            workflow_version: workflowVersion,
            tenant_id: tenantId,
            execution_id: executionId
          }),
          payload_encoding: 'string'
        })
      });
      assert.strictEqual(publishRes.status, 200, 'Falha ao publicar job de workflow no RabbitMQ.');
      const publishBody = await publishRes.json();
      assert.strictEqual(publishBody.routed, true, 'Erro: mensagem de job de workflow não foi roteada a nenhuma fila (binding "agent.workflow.requested" ausente - o workflow-worker subiu?).');

      console.log('Passo 4: Monitorando a fila temporária até o workflow-worker publicar o evento de conclusão...');
      let completionEvent = null;
      const maxAttempts = 20;
      for (let i = 0; i < maxAttempts; i++) {
        const getRes = await fetch(`${RABBITMQ_MGMT_BASE}/queues/%2f/${tmpQueue}/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: RABBITMQ_MGMT_AUTH },
          body: JSON.stringify({ count: 5, ackmode: 'ack_requeue_false', encoding: 'auto' })
        });
        const messages = await getRes.json();
        const events = messages.map((m) => JSON.parse(m.payload));
        const match = events.find(
          (evt) => evt.executionId === executionId && evt.eventType !== 'agent.workflow.started'
        );
        console.log(`Verificação ${i + 1}/${maxAttempts}: ${events.length} evento(s) recebido(s) na fila temporária.`);
        if (match) {
          completionEvent = match;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      assert.ok(completionEvent, 'Erro: workflow-worker não publicou evento de conclusão (completed/failed) a tempo.');
      assert.strictEqual(
        completionEvent.eventType,
        'agent.workflow.completed',
        `Erro: workflow-worker finalizou com evento inesperado: ${JSON.stringify(completionEvent)}`
      );
      assert.strictEqual(completionEvent.executionId, executionId, 'Erro: evento de conclusão não corresponde ao execution_id do job publicado.');
      assert.ok(
        completionEvent.payload && typeof completionEvent.payload.outputResult === 'string' && completionEvent.payload.outputResult.length > 0,
        'Erro: payload de conclusão do workflow-worker não contém outputResult.'
      );
      assert.ok(
        completionEvent.payload.outputResult.includes('2 nodes'),
        `Erro: DAG semeada tem 2 nós (RAG -> TOOL), mas o resultado não reflete isso: ${completionEvent.payload.outputResult}`
      );
      assert.ok(
        typeof completionEvent.payload.executionTimeMs === 'number' && completionEvent.payload.executionTimeMs >= 0,
        'Erro: executionTimeMs ausente ou inválido no evento de conclusão.'
      );

      console.log('🟢 workflow-worker consumiu o job real, carregou a DAG semeada do Postgres e publicou o evento de conclusão.');
    } finally {
      // Limpeza da fila temporária de observação, independentemente do resultado do teste.
      await fetch(`${RABBITMQ_MGMT_BASE}/queues/%2f/${tmpQueue}`, {
        method: 'DELETE',
        headers: { Authorization: RABBITMQ_MGMT_AUTH }
      });
    }
  });

  test('T013 - crew-worker (Python/CrewAI) executa job real usando agente mockado seedado (piso)', async () => {
    if (config.embeddingProvider === 'real' && !config.vertexAiApiKey && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('⚠️ Provedor configurado como REAL, mas credenciais ausentes. Ignorando teste.');
      return;
    }

    // Dispatch real (issue #118): ExecutionController.submitExecution publica
    // {execution_id, conversation_id, agent_id, tenant_id, prompt_final, manifest_config?}
    // na routing key "agent.execution.jobs" (RabbitMQConfig.QUEUE_JOBS/ROUTING_KEY_JOBS).
    // Essa é a MESMA fila consumida pelo crew-worker Python
    // (python-services/crew-worker/src/main.py: basic_consume(queue="agent.execution.jobs")),
    // não pelo rag-worker (que escuta "agent.retrieval.queue" / "agent.retrieval.requested",
    // usado hoje apenas no sub-fluxo de delegação multi-agente do CrewAiRuntimeAdapter).
    //
    // Para exercitar esse caminho com um agente CrewAI real (mockado via
    // CREW_WORKER_MODE=mock - runtime/crewai_adapter.py troca o LLM Vertex AI por MockLLM),
    // semeamos diretamente uma linha em `agents` com o mesmo texto de
    // mock_agents/piso/instructions.md usado por seed_mock_agents.py (um dos 4 agentes mock
    // do MVP), em vez de repetir o fluxo de upload de ZIP multipart em Node - consistente com
    // a orientação de adicionar apenas o setup mínimo necessário, como já é feito para
    // documents/users nos testes T005/T006.
    const agentId = '2f5c9e02-7a4b-4dfb-9e60-2a139c0d55d4';
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';

    console.log('Passo 1: Semeando agente CrewAI mockado (piso) diretamente no PostgreSQL...');
    const pisoInstructionsPath = path.resolve(
      process.cwd(),
      'python-services/crew-worker/src/mock_agents/piso/instructions.md'
    );
    const pisoInstructions = fs.readFileSync(pisoInstructionsPath, 'utf8');

    await dbClient.query(
      `INSERT INTO agents (id, tenant_id, name, system_instructions, status, tag)
       VALUES ($1, $2, $3, $4, 'PUBLISHED', 'piso')`,
      [agentId, tenantId, 'Agente de Piso E2E', pisoInstructions]
    );

    console.log('Passo 2: Enviando requisição de execução referenciando o agentId real seedado...');
    const chatReq = await fetch(`${config.backendUrl}/api/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Calcule a especificação de piso para uma cabine comercial de 630kg, 1100x1400mm.',
        tenantId,
        agentId
      })
    });

    assert.strictEqual(chatReq.status, 200, 'Falha ao iniciar execução via crew-worker com agente seedado (piso).');
    const chatPayload = await chatReq.json();
    const executionId = chatPayload.executionId;
    assert.ok(executionId, 'Erro: executionId não retornado pelo backend.');
    assert.strictEqual(
      chatPayload.agentId,
      agentId,
      'Erro: o dispatch não propagou o agentId seedado (piso) para o payload de execução.'
    );

    console.log(`Passo 3: Polling da execução ${executionId} processada pelo crew-worker (CREW_WORKER_MODE=mock)...`);
    let completed = false;
    let finalOutput = '';
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`${config.backendUrl}/api/executions/${executionId}`);
      if (res.status === 200) {
        const payload = await res.json();
        console.log(`Verificação ${i + 1}/${maxAttempts}: Status = ${payload.status}`);
        if (payload.status === 'COMPLETED') {
          completed = true;
          finalOutput = payload.output;
          break;
        }
        if (payload.status === 'FAILED') {
          assert.fail(`A execução via agente CrewAI mockado (piso) falhou: ${payload.errorMessage}`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    assert.ok(completed, 'Erro: a execução via crew-worker (agente piso) não transicionou para COMPLETED.');
    assert.ok(finalOutput && finalOutput.length > 0, 'Erro: crew-worker não retornou resposta para o agente piso.');

    console.log('Passo 4: Confirmando no Postgres que o crew-worker de fato processou com o agent_id seedado...');
    const execRes = await dbClient.query('SELECT agent_id FROM agent_executions WHERE id = $1', [executionId]);
    assert.strictEqual(
      execRes.rows[0]?.agent_id,
      agentId,
      'Erro: agent_executions.agent_id não corresponde ao agente piso seedado.'
    );

    console.log('🟢 crew-worker processou execução real via agente CrewAI mockado (piso), dispatch ponta a ponta validado.');
  });

  test('T009 - Teardown / Limpeza pós-teste robusta', async () => {
    console.log('Passo 1: Executando limpeza dos dados de teste criados no PostgreSQL...');

    const docId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';

    // A remoção do documento aciona ON DELETE CASCADE em document_chunks
    const delRes = await dbClient.query('DELETE FROM documents WHERE id = $1', [docId]);
    console.log(`Linhas de documento deletadas: ${delRes.rowCount}`);

    // Limpar o usuário de teste
    await dbClient.query("DELETE FROM users WHERE username = 'admin_e2e'");

    // Limpar o agente CrewAI mockado (piso) seedado pelo teste T013. FK de
    // conversations/documents para agents é ON DELETE SET NULL, então a remoção é segura
    // mesmo com conversas já criadas apontando para este agente.
    const pisoAgentId = '2f5c9e02-7a4b-4dfb-9e60-2a139c0d55d4';
    const delAgentRes = await dbClient.query('DELETE FROM agents WHERE id = $1', [pisoAgentId]);
    console.log(`Linhas de agente (piso E2E) deletadas: ${delAgentRes.rowCount}`);

    // Validar se chunks sumiram
    const chunksCount = await dbClient.query('SELECT count(*) FROM document_chunks WHERE document_id = $1', [docId]);
    assert.strictEqual(parseInt(chunksCount.rows[0].count, 10), 0, 'Erro: Chunks órfãos permaneceram após delete cascade.');

    console.log('🟢 Limpeza executada com absoluto sucesso. Banco limpo.');
  });
});
