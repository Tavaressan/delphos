import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import pg from 'pg';
import { config } from './config.js';

const { Client } = pg;

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
    `, [docId, 'e2e_test_doc.pdf', 'e2e_test_doc.pdf', 1024, 'pdf', userId, 'UPLOADING']);

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
          file_path: 'e2e_test_doc.pdf',
          tenant_id: tenantId,
          file_type: 'pdf'
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
  });

  test('T007 e T008 - Teste do Endpoint de Chat / RAG de ponta a ponta', async () => {
    // Validar se provedor real exige chaves de acesso
    if (config.embeddingProvider === 'real' && !config.vertexAiApiKey && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('⚠️ Provedor configurado como REAL, mas VERTEX_AI_API_KEY e GOOGLE_APPLICATION_CREDENTIALS estão ausentes no ambiente. Ignorando teste real e reportando precondição.');
      return;
    }

    console.log('Passo 1: Enviando requisição de Chat/RAG para o backend Spring Boot...');
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';

    const chatReq = await fetch(`${config.backendUrl}/api/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Qual a periodicidade de manutenção dos cabos?',
        tenantId: tenantId
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

  test('T009 - Teardown / Limpeza pós-teste robusta', async () => {
    console.log('Passo 1: Executando limpeza dos dados de teste criados no PostgreSQL...');

    const docId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';

    // A remoção do documento aciona ON DELETE CASCADE em document_chunks
    const delRes = await dbClient.query('DELETE FROM documents WHERE id = $1', [docId]);
    console.log(`Linhas de documento deletadas: ${delRes.rowCount}`);

    // Limpar o usuário de teste
    await dbClient.query("DELETE FROM users WHERE username = 'admin_e2e'");

    // Validar se chunks sumiram
    const chunksCount = await dbClient.query('SELECT count(*) FROM document_chunks WHERE document_id = $1', [docId]);
    assert.strictEqual(parseInt(chunksCount.rows[0].count, 10), 0, 'Erro: Chunks órfãos permaneceram após delete cascade.');

    console.log('🟢 Limpeza executada com absoluto sucesso. Banco limpo.');
  });
});
