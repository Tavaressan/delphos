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

    public ExecutionController(UserRepository userRepository,
                               ConversationRepository conversationRepository,
                               AgentExecutionRepository executionRepository,
                               RabbitTemplate rabbitTemplate,
                               ObjectMapper objectMapper,
                               AgentRepository agentRepository,
                               MessageRepository messageRepository,
                               com.company.core.application.AuditService auditService) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.executionRepository = executionRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.agentRepository = agentRepository;
        this.messageRepository = messageRepository;
        this.auditService = auditService;
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
            Agent agent = null;
            if (agentIdStr != null && !agentIdStr.isEmpty()) {
                agent = agentRepository.findById(UUID.fromString(agentIdStr)).orElse(null);
                if (agent == null) {
                    Map<String, Object> errorResp = new HashMap<>();
                    errorResp.put("error", "Agent not found: " + agentIdStr);
                    return ResponseEntity.status(404).body(errorResp);
                }
            }

            if (conversation == null) {
                conversation = new Conversation();
                conversation.setUser(user);
                conversation.setTenantId(tenantId);
                conversation.setTitle(agent != null ? "Chat com " + agent.getName() : "Conversa de Teste RAG");
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
            
            UUID actualAgentId = (agent != null) ? agent.getId() : UUID.randomUUID();
            execution.setAgentId(actualAgentId);
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
            auditService.logAction("SUBMIT_RAG_CHAT", "Execution: " + execution.getId(), "{\"agentId\":\"" + actualAgentId + "\",\"conversationId\":\"" + conversation.getId() + "\"}");

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

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getExecution(@PathVariable UUID id) {
        AgentExecution execution = executionRepository.findById(id).orElse(null);
        if (execution == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("executionId", execution.getId().toString());
        response.put("status", execution.getStatus());
        response.put("prompt", execution.getPromptFinal());
        response.put("output", execution.getOutputResult());
        response.put("errorMessage", execution.getErrorMessage());
        response.put("tokensConsumed", execution.getTokensConsumed());
        response.put("startedAt", execution.getStartedAt());
        response.put("finishedAt", execution.getFinishedAt());

        return ResponseEntity.ok(response);
    }
}
