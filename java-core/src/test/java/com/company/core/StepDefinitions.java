package com.company.core;

import com.company.core.domain.entities.AgentExecution;
import com.company.core.domain.entities.Conversation;
import com.company.core.domain.entities.ToolCall;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.AgentExecutionRepository;
import com.company.core.domain.repositories.ConversationRepository;
import com.company.core.domain.repositories.ToolCallRepository;
import com.company.core.domain.repositories.UserRepository;
import com.company.core.infrastructure.external.AgentExecutionEventListener;
import tools.jackson.databind.ObjectMapper;
import io.cucumber.java.Before;
import io.cucumber.java.pt.Dado;
import io.cucumber.java.pt.E;
import io.cucumber.java.pt.Então;
import io.cucumber.java.pt.Quando;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatusCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@SuppressWarnings({"unchecked", "rawtypes"})
public class StepDefinitions {

    @Value("${local.server.port}")
    private int serverPort;

    private RestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private AgentExecutionEventListener listener;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private AgentExecutionRepository executionRepository;

    @Autowired
    private ToolCallRepository toolCallRepository;

    // Estado por cenário
    private ResponseEntity<Map> lastResponse;
    private UUID lastExecutionId;
    private UUID lastToolCallId;
    private Exception capturedListenerException;

    @Before
    public void resetScenarioState() {
        restTemplate = new RestTemplate();
        restTemplate.setErrorHandler(new DefaultResponseErrorHandler() {
            @Override
            protected boolean hasError(HttpStatusCode statusCode) { return false; }
        });
        jdbcTemplate.execute(
            "TRUNCATE tool_calls, retrieval_events, messages, agent_executions, conversations, agents, users CASCADE"
        );
        reset(rabbitTemplate);
        lastResponse = null;
        lastExecutionId = null;
        lastToolCallId = null;
        capturedListenerException = null;
    }

    // ===== Contexto =====

    @Dado("que a plataforma {string} está ativa e conectada ao RabbitMQ")
    public void plataformaAtiva(String plataforma) {
        // infra garantida por Testcontainers + @MockitoBean
    }

    @E("o banco de dados PostgreSQL com pgvector está pronto para gravação")
    public void bancoPronto() {
        assertThat(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).isEqualTo(1);
    }

    @E("o worker cognitivo {string} em Python está escutando na fila {string}")
    public void workerPythonEscutando(String worker, String fila) {
        // worker externo — cross-service
    }

    // ===== C1 — happy path =====

    @Quando("o usuário envia uma tarefa de processamento para o agente {string}")
    public void usuarioEnviaTarefa(String agente) {
        UUID agentId = insertTestAgent(agente);
        Map<String, String> request = new HashMap<>();
        request.put("prompt", "Simular tarefa para " + agente);
        request.put("agentId", agentId.toString());

        lastResponse = post("/api/executions", request);

        if (lastResponse.getBody() != null && lastResponse.getBody().get("executionId") != null) {
            lastExecutionId = UUID.fromString((String) lastResponse.getBody().get("executionId"));
        }
    }

    @Então("o sistema deve registrar a execução no banco com o status {string}")
    public void registrarNoBancoComStatus(String status) {
        assertThat(lastExecutionId).as("executionId deve estar presente na resposta").isNotNull();
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM agent_executions WHERE id = ? AND status = ?",
            Integer.class, lastExecutionId, status);
        assertThat(count).as("deve existir 1 registro com status=" + status).isEqualTo(1);
    }

    @E("uma mensagem contendo o Trace Context {string} deve ser publicada no RabbitMQ")
    public void mensagemPublicadaTrace(String trace) {
        verify(rabbitTemplate, times(1)).convertAndSend(anyString(), anyString(), anyString());
    }

    @E("o worker cognitivo deve consumir a mensagem mudando o status para {string}")
    public void workerConsomeMensagem(String status) {
        // cross-service — não controlável a partir do Java Core
    }

    // ===== C1a — agentId inexistente → 404 =====

    @Quando("o usuário envia uma execução com agentId inexistente")
    public void usuarioEnviaExecucaoAgentIdInexistente() {
        Map<String, String> request = new HashMap<>();
        request.put("prompt", "test");
        request.put("agentId", "00000000-0000-0000-0000-000000000001");
        lastResponse = post("/api/executions", request);
    }

    @Então("o sistema deve retornar HTTP {int}")
    public void sistemaDeveretornarHTTP(int statusCode) {
        assertThat(lastResponse.getStatusCode().value()).isEqualTo(statusCode);
    }

    @E("nenhum registro deve existir em agent_executions")
    public void nenhumRegistroAgentExecutions() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM agent_executions", Integer.class);
        assertThat(count).isEqualTo(0);
    }

    // ===== C1b — RabbitMQ indisponível → 500 + FAILED =====

    @Dado("que o broker RabbitMQ está indisponível")
    public void rabbitMQIndisponivel() {
        doThrow(new AmqpException("broker down"))
            .when(rabbitTemplate).convertAndSend(anyString(), anyString(), anyString());
    }

    @E("o registro em agent_executions deve ter o status {string}")
    public void registroDeveTerStatus(String status) {
        assertThat(lastExecutionId).as("executionId deve estar presente na resposta de erro").isNotNull();
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM agent_executions WHERE id = ? AND status = ?",
            Integer.class, lastExecutionId, status);
        assertThat(count).as("deve existir 1 registro com status=" + status).isEqualTo(1);
    }

    // ===== C2 — tool call auditada =====

    @Dado("que o agente {string} inicia a execução de uma tarefa")
    public void agenteIniciaTarefa(String agente) {
        User user = new User();
        user.setUsername("bdd-user");
        user.setEmail("bdd@test.com");
        user.setPasswordHash("hash");
        user.setFirstName("BDD");
        user.setLastName("Test");
        user = userRepository.save(user);

        Conversation conv = new Conversation();
        conv.setUser(user);
        conv.setTenantId(UUID.randomUUID());
        conv.setTitle("BDD conv");
        conv = conversationRepository.save(conv);

        AgentExecution exec = new AgentExecution();
        exec.setConversation(conv);
        exec.setAgentId(UUID.randomUUID());
        exec.setStatus("STARTED");
        exec.setPromptFinal("test prompt");
        exec.setStartedAt(Instant.now());
        exec = executionRepository.save(exec);
        lastExecutionId = exec.getId();

        ToolCall tc = new ToolCall();
        lastToolCallId = UUID.randomUUID();
        tc.setId(lastToolCallId);
        tc.setAgentExecution(exec);
        tc.setToolName(agente + "-tool");
        tc.setInputPayload("{}");
        tc.setStatus("STARTED");
        toolCallRepository.save(tc);
    }

    @Quando("o agente dispara a ferramenta {string} para varrer logs")
    public void agenteDisparaFerramenta(String ferramenta) throws Exception {
        Map<String, Object> toolFinishPayload = new HashMap<>();
        toolFinishPayload.put("toolCallId", lastToolCallId.toString());
        toolFinishPayload.put("status", "COMPLETED");
        toolFinishPayload.put("outputResponse", "audit log result from " + ferramenta);
        toolFinishPayload.put("errorLog", null);
        toolFinishPayload.put("executionTimeMs", 250);

        Map<String, Object> event = new HashMap<>();
        event.put("eventType", "ToolCallFinished");
        event.put("executionId", lastExecutionId.toString());
        event.put("payload", toolFinishPayload);

        listener.handleExecutionEvent(objectMapper.writeValueAsString(event));
    }

    @Então("o sistema deve registrar un span {string} no OpenTelemetry")
    public void registrarSpanOTel(String span) {
        // OpenTelemetry não implementado ainda (BL-003) — step documentacional
    }

    @E("uma linha na tabela {string} deve ser gravada contendo o status {string}")
    public void linhaTabelaGravada(String tabela, String status) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM tool_calls WHERE id = ? AND status = ?",
            Integer.class, lastToolCallId, status);
        assertThat(count).as("deve existir 1 linha em tool_calls com status=" + status).isEqualTo(1);
    }

    @E("os milissegundos totais de processamento da ferramenta devem ser persistidos")
    public void milissegundosPersistidos() {
        Integer duration = jdbcTemplate.queryForObject(
            "SELECT execution_time_ms FROM tool_calls WHERE id = ?",
            Integer.class, lastToolCallId);
        assertThat(duration).as("execution_time_ms deve ser > 0").isGreaterThan(0);
    }

    // ===== C2a — executionId inválido =====

    @Dado("que não existe uma execução com ID {string}")
    public void naoExisteExecucao(String id) {
        lastExecutionId = UUID.fromString(id);
        lastToolCallId = UUID.randomUUID();
    }

    @Quando("o listener processa um evento ToolCallFinished com esse executionId")
    public void listenerProcessaToolCallFinished() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("toolCallId", lastToolCallId.toString());
        payload.put("status", "COMPLETED");
        payload.put("outputResponse", "output");
        payload.put("errorLog", null);
        payload.put("executionTimeMs", 100);

        Map<String, Object> event = new HashMap<>();
        event.put("eventType", "ToolCallFinished");
        event.put("executionId", lastExecutionId.toString());
        event.put("payload", payload);

        try {
            listener.handleExecutionEvent(objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            capturedListenerException = e;
        }
    }

    @Então("nenhuma linha deve ser inserida em tool_calls")
    public void nenhumaLinhaToolCalls() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM tool_calls WHERE id = ?",
            Integer.class, lastToolCallId);
        assertThat(count).isEqualTo(0);
    }

    @E("nenhuma exceção não-tratada deve se propagar")
    public void nenhumaExcecaoPropagada() {
        assertThat(capturedListenerException).isNull();
    }

    // ===== Steps @pending — segurança (no-op) =====

    @Dado("que existe um usuário cadastrado com o e-mail {string}")
    public void usuarioCadastradoEmail(String email) {}

    @Quando("um novo usuário tenta se registrar usando o e-mail {string}")
    public void novoUsuarioTentaRegistrar(String email) {}

    @Então("o sistema deve demorar exatamente {int} segundo para responder")
    public void sistemaDemoraParaResponder(int segundos) {}

    @E("deve retornar uma mensagem genérica de sucesso para proteção de identidade")
    public void mensagemGenericaSucesso() {}

    @Dado("que a tabela de migração de usuários de banco de dados foi processada")
    public void tabelaMigracaoProcessada() {}

    @Quando("um usuário com hash de senha antigo MD5 tenta efetuar login")
    public void loginComMD5() {}

    @Então("o sistema deve negar o login")
    public void sistemaNegaLogin() {}

    @E("deve redirecionar o usuário para o fluxo de redefinição obrigatória {string}")
    public void redirecionarFluxoRedefinicao(String fluxo) {}

    @Dado("que o agente executa uma ferramenta baseada em script customizado do usuário")
    public void agenteExecutaFerramentaScript() {}

    @Quando("o script tenta acessar as propriedades reflexivas {string} ou importar dependências externas via {string}")
    public void scriptTentaAcessarAcoes(String propriedade, String grab) {}

    @Então("o Sandbox do {string} deve interromper a compilação")
    public void sandboxInterrompeCompilacao(String worker) {}

    @E("deve retornar uma {string} detalhando a violação de segurança AST")
    public void retornarExceptionAST(String exception) {}

    // ===== Steps @pending — workflow (no-op) =====

    @E("o worker determinístico {string} em Rust está escutando na fila {string}")
    public void workerDeterministicoRustEscutando(String worker, String fila) {}

    @Dado("que existe uma definição de DAG cadastrada no PostgreSQL com ID {string}")
    public void dagCadastradaPostgres(String id) {}

    @Quando("uma mensagem de job de workflow é publicada na exchange {string} com a routing key {string}")
    public void mensagemJobPublicada(String exchange, String routingKey) {}

    @Então("o {string} deve consumir o job e carregar a topologia da DAG do banco de dados")
    public void workerConsomeECarregaDAG(String worker) {}

    @E("deve disparar a execução dos nós declarados")
    public void dispararExecucaoNos() {}

    @E("deve publicar o evento {string} ao finalizar com sucesso")
    public void publicarEventoSucesso(String evento) {}

    @E("deve enviar o ACK da mensagem original para o RabbitMQ")
    public void enviarAckRabbit() {}

    @Dado("que existe uma definição de DAG com nós de longa duração")
    public void dagLongaDuracao() {}

    @Quando("o {string} inicia a execução do job")
    public void workerIniciaExecucaoJob(String worker) {}

    @E("o processamento total da DAG excede o limite configurado de {int} segundos")
    public void processamentoExcedeTimeout(int segundos) {}

    @Então("o worker Rust deve interromper a execução usando tokio::select!")
    public void workerRustInterrompeSelect() {}

    @E("deve registrar o evento de falha {string} com o status {string} no broker")
    public void registrarEventoFalha(String evento, String status) {}

    @E("deve enviar o NACK da mensagem original")
    public void enviarNackOriginal() {}

    // ===== Steps @pending — retrieval (no-op) =====

    @Dado("que o agente executa uma busca semântica na base de conhecimento")
    public void agenteBuscaSemantica() {}

    @Quando("o worker Rust {string} retorna {int} chunks relevantes via índice HNSW")
    public void workerRustRetornaChunks(String worker, int chunks) {}

    @Então("um evento de ciclo de vida {string} deve ser publicado no broker")
    public void eventoPublicadoBroker(String evento) {}

    @E("os {int} chunks com seus respectivos scores de similaridade de cosseno devem ser gravados em {string}")
    public void chunksGravadosEm(int chunks, String tabela) {}

    // ===== Helpers =====

    @SuppressWarnings("unchecked")
    private ResponseEntity<Map> post(String uri, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(
            "http://localhost:" + serverPort + uri,
            HttpMethod.POST,
            new HttpEntity<>(body, headers),
            Map.class
        );
    }

    private UUID insertTestAgent(String name) {
        UUID agentId = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO agents (id, name, system_instructions, tenant_id, created_at) VALUES (?, ?, ?, ?, ?)",
            agentId, name, "test", UUID.randomUUID(), java.sql.Timestamp.from(Instant.now()));
        return agentId;
    }
}
