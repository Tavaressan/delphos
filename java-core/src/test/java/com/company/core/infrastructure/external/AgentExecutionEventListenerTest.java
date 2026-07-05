package com.company.core.infrastructure.external;

import com.company.core.domain.entities.AgentExecution;
import com.company.core.domain.repositories.AgentExecutionRepository;
import com.company.core.domain.repositories.MessageRepository;
import com.company.core.domain.repositories.RetrievalEventRepository;
import com.company.core.domain.repositories.ToolCallRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentExecutionEventListenerTest {

    @Mock
    private AgentExecutionRepository executionRepository;
    @Mock
    private ToolCallRepository toolCallRepository;
    @Mock
    private RetrievalEventRepository retrievalEventRepository;
    @Mock
    private MessageRepository messageRepository;

    private AgentExecutionEventListener listener;
    private UUID executionId;
    private AgentExecution execution;

    @BeforeEach
    void setUp() {
        listener = new AgentExecutionEventListener(
                executionRepository, toolCallRepository, retrievalEventRepository,
                new ObjectMapper(), messageRepository);
        executionId = UUID.randomUUID();
        execution = new AgentExecution();
        execution.setId(executionId);
        when(executionRepository.findById(executionId)).thenReturn(Optional.of(execution));
    }

    // rag-worker (Rust) publica o payload de falha com a chave "error".
    @Test
    void agentExecutionFailedReadsErrorKeyFromRagWorker() {
        String message = """
                {"eventType":"AgentExecutionFailed","executionId":"%s","payload":{"error":"vertex ai timeout"}}
                """.formatted(executionId);

        listener.handleExecutionEvent(message);

        assertThat(execution.getStatus()).isEqualTo("FAILED");
        assertThat(execution.getErrorMessage()).isEqualTo("vertex ai timeout");
    }

    // crew-worker (Python) publica o payload de falha com a chave "reason".
    @Test
    void agentExecutionFailedReadsReasonKeyFromCrewWorker() {
        String message = """
                {"eventType":"AgentExecutionFailed","executionId":"%s","payload":{"reason":"agent_id 'x' not found in database"}}
                """.formatted(executionId);

        listener.handleExecutionEvent(message);

        assertThat(execution.getStatus()).isEqualTo("FAILED");
        assertThat(execution.getErrorMessage()).isEqualTo("agent_id 'x' not found in database");
    }

    // Caso a chave "errorMessage" venha a ser usada por algum produtor futuro, continua funcionando.
    @Test
    void agentExecutionFailedReadsErrorMessageKeyWhenPresent() {
        String message = """
                {"eventType":"AgentExecutionFailed","executionId":"%s","payload":{"errorMessage":"boom"}}
                """.formatted(executionId);

        listener.handleExecutionEvent(message);

        assertThat(execution.getErrorMessage()).isEqualTo("boom");
    }

    // workflow-worker (Rust) publica agent.workflow.failed com a chave "errorMessage".
    @Test
    void workflowFailedReadsErrorMessageKey() {
        String message = """
                {"eventType":"agent.workflow.failed","executionId":"%s","payload":{"errorMessage":"step 2 failed"}}
                """.formatted(executionId);

        listener.handleExecutionEvent(message);

        assertThat(execution.getStatus()).isEqualTo("FAILED");
        assertThat(execution.getErrorMessage()).isEqualTo("step 2 failed");
    }
}
