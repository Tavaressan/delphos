package com.company.core.infrastructure.external;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.company.core.domain.entities.AgentExecution;
import com.company.core.domain.entities.Message;
import com.company.core.domain.entities.RetrievalEvent;
import com.company.core.domain.entities.ToolCall;
import com.company.core.domain.repositories.AgentExecutionRepository;
import com.company.core.domain.repositories.RetrievalEventRepository;
import com.company.core.domain.repositories.ToolCallRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class AgentExecutionEventListener {

    private static final Logger log = LoggerFactory.getLogger(AgentExecutionEventListener.class);

    private final AgentExecutionRepository executionRepository;
    private final ToolCallRepository toolCallRepository;
    private final RetrievalEventRepository retrievalEventRepository;
    private final ObjectMapper objectMapper;
    private final com.company.core.domain.repositories.MessageRepository messageRepository;

    public AgentExecutionEventListener(AgentExecutionRepository executionRepository,
                                       ToolCallRepository toolCallRepository,
                                       RetrievalEventRepository retrievalEventRepository,
                                       ObjectMapper objectMapper,
                                       com.company.core.domain.repositories.MessageRepository messageRepository) {
        this.executionRepository = executionRepository;
        this.toolCallRepository = toolCallRepository;
        this.retrievalEventRepository = retrievalEventRepository;
        this.objectMapper = objectMapper;
        this.messageRepository = messageRepository;
    }

    @RabbitListener(queues = "agent.execution.events")
    @Transactional
    @SuppressWarnings("unchecked")
    public void handleExecutionEvent(String messageBody) {
        log.info("Received execution event: {}", messageBody);
        try {
            Map<String, Object> event = objectMapper.readValue(messageBody, new TypeReference<Map<String, Object>>() {});
            String eventType = (String) event.get("eventType");
            UUID executionId = UUID.fromString((String) event.get("executionId"));

            AgentExecution execution = executionRepository.findById(executionId).orElse(null);
            if (execution == null) {
                log.warn("AgentExecution not found for ID: {}", executionId);
                return;
            }

            switch (eventType) {
                case "AgentExecutionStarted":
                    execution.setStatus("STARTED");
                    execution.setStartedAt(Instant.now());
                    executionRepository.save(execution);
                    log.info("Agent execution {} set to STARTED", executionId);
                    break;

                case "RetrievalStarted":
                    execution.setStatus("RETRIEVAL_RUNNING");
                    executionRepository.save(execution);
                    log.info("Agent execution {} set to RETRIEVAL_RUNNING", executionId);
                    break;

                case "RetrievalCompleted":
                    execution.setStatus("THINKING");
                    executionRepository.save(execution);

                    Map<String, Object> retPayload = (Map<String, Object>) event.get("payload");

                    // allSources contém cada documento único usado no RAG; se ausente, cria entrada única com os campos top-level
                    java.util.List<Map<String, Object>> allSources = (java.util.List<Map<String, Object>>) retPayload.get("allSources");
                    if (allSources == null || allSources.isEmpty()) {
                        allSources = java.util.List.of(retPayload);
                    }
                    for (Map<String, Object> src : allSources) {
                        RetrievalEvent retrievalEvent = new RetrievalEvent();
                        retrievalEvent.setAgentExecution(execution);
                        retrievalEvent.setDocumentId(UUID.fromString((String) src.get("documentId")));
                        retrievalEvent.setChunkId(UUID.fromString((String) src.get("chunkId")));
                        retrievalEvent.setSimilarityScore(((Number) src.get("similarityScore")).doubleValue());
                        retrievalEvent.setDocumentName((String) src.get("documentName"));
                        retrievalEvent.setRetrievedContent((String) retPayload.get("retrievedContent"));
                        retrievalEventRepository.save(retrievalEvent);
                    }
                    log.info("Recorded {} RetrievalEvent(s) for execution {}", allSources.size(), executionId);
                    break;

                case "ToolCallStarted":
                    execution.setStatus("TOOL_RUNNING");
                    executionRepository.save(execution);

                    Map<String, Object> toolStartPayload = (Map<String, Object>) event.get("payload");
                    ToolCall toolCall = new ToolCall();
                    toolCall.setId(UUID.fromString((String) toolStartPayload.get("toolCallId")));
                    toolCall.setAgentExecution(execution);
                    toolCall.setToolName((String) toolStartPayload.get("toolName"));
                    toolCall.setInputPayload(objectMapper.writeValueAsString(toolStartPayload.get("inputPayload")));
                    toolCall.setStatus("STARTED");
                    toolCallRepository.save(toolCall);
                    log.info("Recorded ToolCall {} started for execution {}", toolCall.getId(), executionId);
                    break;

                case "ToolCallFinished":
                    execution.setStatus("THINKING");
                    executionRepository.save(execution);

                    Map<String, Object> toolFinishPayload = (Map<String, Object>) event.get("payload");
                    UUID toolCallId = UUID.fromString((String) toolFinishPayload.get("toolCallId"));
                    ToolCall activeToolCall = toolCallRepository.findById(toolCallId).orElse(null);
                    if (activeToolCall != null) {
                        activeToolCall.setStatus((String) toolFinishPayload.get("status"));
                        activeToolCall.setOutputResponse((String) toolFinishPayload.get("outputResponse"));
                        activeToolCall.setErrorLog((String) toolFinishPayload.get("errorLog"));
                        activeToolCall.setExecutionTimeMs(((Number) toolFinishPayload.get("executionTimeMs")).intValue());
                        toolCallRepository.save(activeToolCall);
                        log.info("Recorded ToolCall {} finished with status {}", toolCallId, activeToolCall.getStatus());
                    } else {
                        log.warn("ToolCall not found for ID: {}", toolCallId);
                    }
                    break;

                case "AgentExecutionFinished":
                    execution.setStatus("COMPLETED");
                    execution.setFinishedAt(Instant.now());
                    Map<String, Object> finishPayload = (Map<String, Object>) event.get("payload");
                    String outputResult = (String) finishPayload.get("outputResult");
                    execution.setOutputResult(outputResult);
                    execution.setTokensConsumed(((Number) finishPayload.get("tokensConsumed")).intValue());
                    executionRepository.save(execution);

                    // Save assistant message to chat history
                    if (execution.getConversation() != null) {
                        Message assistantMessage = new Message();
                        assistantMessage.setConversation(execution.getConversation());
                        assistantMessage.setAuthorRole("ASSISTANT");
                        assistantMessage.setContent(outputResult);
                        messageRepository.save(assistantMessage);
                    }

                    log.info("Agent execution {} COMPLETED successfully", executionId);
                    break;

                case "AgentExecutionFailed":
                    execution.setStatus("FAILED");
                    execution.setFinishedAt(Instant.now());
                    Map<String, Object> failPayload = (Map<String, Object>) event.get("payload");
                    // Produtores diferentes usam chaves diferentes para a mensagem de erro:
                    // rag-worker (Rust) publica "error", crew-worker (Python) publica "reason".
                    // Nenhum dos dois usa "errorMessage", então o campo ficava sempre null.
                    execution.setErrorMessage(extractErrorMessage(failPayload));
                    executionRepository.save(execution);
                    log.error("Agent execution {} FAILED: {}", executionId, execution.getErrorMessage());
                    break;

                // Eventos de conclusão/falha do workflow-worker (Rust). Usam eventType em formato
                // diferente (dotted) dos eventos de RAG/CrewAI acima (PascalCase), por isso precisam
                // de um branch próprio — ver rust-services/workflow-worker/src/rabbitmq.rs (issue #123).
                case "agent.workflow.completed":
                    execution.setStatus("COMPLETED");
                    execution.setFinishedAt(Instant.now());
                    Map<String, Object> workflowCompletedPayload = (Map<String, Object>) event.get("payload");
                    execution.setOutputResult((String) workflowCompletedPayload.get("outputResult"));
                    executionRepository.save(execution);
                    log.info("Workflow execution {} COMPLETED successfully", executionId);
                    break;

                case "agent.workflow.failed":
                    execution.setStatus("FAILED");
                    execution.setFinishedAt(Instant.now());
                    Map<String, Object> workflowFailedPayload = (Map<String, Object>) event.get("payload");
                    execution.setErrorMessage((String) workflowFailedPayload.get("errorMessage"));
                    executionRepository.save(execution);
                    log.error("Workflow execution {} FAILED: {}", executionId, execution.getErrorMessage());
                    break;

                default:
                    log.warn("Unknown event type: {}", eventType);
                    break;
            }
        } catch (Exception e) {
            log.error("Error processing agent execution event", e);
        }
    }

    private String extractErrorMessage(Map<String, Object> payload) {
        Object value = payload.get("errorMessage");
        if (value == null) {
            value = payload.get("reason");
        }
        if (value == null) {
            value = payload.get("error");
        }
        return value != null ? value.toString() : null;
    }
}
