package com.company.core.interfaces.rest;

import com.company.core.domain.entities.Agent;
import com.company.core.domain.entities.Message;
import com.company.core.domain.repositories.AgentRepository;
import com.company.core.domain.repositories.MessageRepository;
import tools.jackson.databind.ObjectMapper;
import com.company.core.domain.entities.AgentExecution;
import com.company.core.domain.entities.Conversation;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.AgentExecutionRepository;
import com.company.core.domain.repositories.ConversationRepository;
import com.company.core.domain.repositories.UserRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/executions")
public class ExecutionController {

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final AgentExecutionRepository executionRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final AgentRepository agentRepository;
    private final MessageRepository messageRepository;
    private final com.company.core.application.AuditService auditService;
    private final com.company.core.domain.repositories.RetrievalEventRepository retrievalEventRepository;

    public ExecutionController(UserRepository userRepository,
                               ConversationRepository conversationRepository,
                               AgentExecutionRepository executionRepository,
                               RabbitTemplate rabbitTemplate,
                               ObjectMapper objectMapper,
                               AgentRepository agentRepository,
                               MessageRepository messageRepository,
                               com.company.core.application.AuditService auditService,
                               com.company.core.domain.repositories.RetrievalEventRepository retrievalEventRepository) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.executionRepository = executionRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.agentRepository = agentRepository;
        this.messageRepository = messageRepository;
        this.auditService = auditService;
        this.retrievalEventRepository = retrievalEventRepository;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> submitExecution(@RequestBody Map<String, String> request) {
        try {
            String prompt = request.getOrDefault("prompt", "Simular execução cognitiva corporativa.");
            String tenantStr = request.get("tenantId");
            UUID tenantId = (tenantStr != null) ? UUID.fromString(tenantStr) : UUID.randomUUID();

            // 1. Ensure a default user exists for testing
            User user = userRepository.findByUsername("admin").orElseGet(() -> {
                User defaultUser = new User();
                defaultUser.setUsername("admin");
                defaultUser.setEmail("admin@company.com");
                defaultUser.setPasswordHash("no-pass-hash");
                defaultUser.setFirstName("Admin");
                defaultUser.setLastName("User");
                return userRepository.save(defaultUser);
            });

            // 2. Create and save a Conversation
            String convIdStr = request.get("conversationId");
            Conversation conversation = null;
            if (convIdStr != null && !convIdStr.isEmpty()) {
                conversation = conversationRepository.findById(UUID.fromString(convIdStr)).orElse(null);
            }

            String agentIdStr = request.get("agentId");
            if (agentIdStr == null || agentIdStr.isEmpty()) {
                Map<String, Object> errorResp = new HashMap<>();
                errorResp.put("error", "agentId é obrigatório");
                return ResponseEntity.badRequest().body(errorResp);
            }

            Agent agent = agentRepository.findById(UUID.fromString(agentIdStr)).orElse(null);
            if (agent == null) {
                Map<String, Object> errorResp = new HashMap<>();
                errorResp.put("error", "Agent not found: " + agentIdStr);
                return ResponseEntity.status(404).body(errorResp);
            }

            if (conversation == null) {
                conversation = new Conversation();
                conversation.setUser(user);
                conversation.setTenantId(tenantId);
                conversation.setTitle("Chat com " + agent.getName());
                conversation.setAgent(agent);
                conversation = conversationRepository.save(conversation);
            }

            // Save user message to database
            Message userMessage = new Message();
            userMessage.setConversation(conversation);
            userMessage.setAuthorRole("USER");
            userMessage.setContent(prompt);
            messageRepository.save(userMessage);

            // 3. Create and save AgentExecution in REQUESTED status
            AgentExecution execution = new AgentExecution();
            execution.setConversation(conversation);
            
            UUID actualAgentId = agent.getId();
            execution.setAgentId(actualAgentId);
            execution.setTenantId(tenantId);
            execution.setStatus("REQUESTED");
            execution.setPromptFinal(prompt);
            execution.setStartedAt(Instant.now());
            execution = executionRepository.save(execution);

            // 4. Build message payload for RabbitMQ
            Map<String, Object> payload = new HashMap<>();
            payload.put("execution_id", execution.getId().toString());
            payload.put("conversation_id", conversation.getId().toString());
            payload.put("agent_id", actualAgentId.toString());
            payload.put("tenant_id", tenantId.toString());
            payload.put("prompt_final", prompt);
            if (agent != null && agent.getManifestConfig() != null) {
                payload.put("manifest_config", agent.getManifestConfig());
            }

            // 5. Publish to RabbitMQ
            try {
                rabbitTemplate.convertAndSend(
                    "agent.execution.exchange",
                    "agent.execution.jobs",
                    objectMapper.writeValueAsString(payload)
                );
            } catch (org.springframework.amqp.AmqpException amqpEx) {
                execution.setStatus("FAILED");
                execution.setErrorMessage(amqpEx.getMessage());
                executionRepository.save(execution);
                Map<String, Object> errorResp = new HashMap<>();
                errorResp.put("error", "Message broker unavailable");
                errorResp.put("executionId", execution.getId().toString());
                return ResponseEntity.internalServerError().body(errorResp);
            }

            // 6. Transition to QUEUED status
            execution.setStatus("QUEUED");
            execution = executionRepository.save(execution);
            auditService.logAction("SUBMIT_RAG_CHAT", "Execution: " + execution.getId(), "{\"agentId\":\"" + actualAgentId + "\",\"conversationId\":\"" + conversation.getId() + "\"}", tenantId);

            // 7. Return JSON response
            Map<String, Object> response = new HashMap<>();
            response.put("executionId", execution.getId().toString());
            response.put("conversationId", conversation.getId().toString());
            response.put("status", execution.getStatus());
            response.put("prompt", execution.getPromptFinal());
            response.put("tenantId", tenantId.toString());
            response.put("agentId", actualAgentId.toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResp = new HashMap<>();
            errorResp.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResp);
        }
    }

    @GetMapping
    public ResponseEntity<java.util.List<Map<String, Object>>> listExecutions(@RequestParam(value = "tenantId", required = false) String tenantIdStr) {
        UUID tenantId = (tenantIdStr != null && !tenantIdStr.isEmpty())
                ? UUID.fromString(tenantIdStr)
                : UUID.fromString("00000000-0000-0000-0000-000000000000");

        java.util.List<Map<String, Object>> response = executionRepository.findByTenantId(tenantId)
                .stream()
                .map(execution -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("executionId", execution.getId().toString());
                    item.put("status", execution.getStatus());
                    item.put("prompt", execution.getPromptFinal());
                    item.put("startedAt", execution.getStartedAt());
                    item.put("finishedAt", execution.getFinishedAt());
                    return item;
                })
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getExecution(@PathVariable UUID id) {
        AgentExecution execution = executionRepository.findById(id).orElse(null);
        if (execution == null) {
            return ResponseEntity.notFound().build();
        }

        java.util.List<Map<String, Object>> sources = retrievalEventRepository.findByAgentExecutionId(id)
                .stream()
                .map(re -> {
                    Map<String, Object> s = new HashMap<>();
                    s.put("documentId", re.getDocumentId() != null ? re.getDocumentId().toString() : null);
                    s.put("documentName", re.getDocumentName());
                    s.put("similarityScore", re.getSimilarityScore());
                    return s;
                })
                .collect(java.util.stream.Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("executionId", execution.getId().toString());
        response.put("status", execution.getStatus());
        response.put("prompt", execution.getPromptFinal());
        response.put("output", execution.getOutputResult());
        response.put("errorMessage", execution.getErrorMessage());
        response.put("tokensConsumed", execution.getTokensConsumed());
        response.put("startedAt", execution.getStartedAt());
        response.put("finishedAt", execution.getFinishedAt());
        response.put("sources", sources);

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/timeout")
    public ResponseEntity<Map<String, Object>> markTimeout(@PathVariable UUID id) {
        AgentExecution execution = executionRepository.findById(id).orElse(null);
        if (execution == null) {
            return ResponseEntity.notFound().build();
        }

        // Execução já finalizada (por exemplo, a resposta chegou depois que o frontend desistiu):
        // não sobrescrever um resultado real com TIMEOUT.
        if (!java.util.Set.of("COMPLETED", "FAILED", "TIMEOUT").contains(execution.getStatus())) {
            execution.setStatus("TIMEOUT");
            execution.setFinishedAt(Instant.now());
            execution.setErrorMessage("Tempo limite de execução excedido (timeout do frontend).");
            execution = executionRepository.save(execution);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("executionId", execution.getId().toString());
        response.put("status", execution.getStatus());

        return ResponseEntity.ok(response);
    }
}
