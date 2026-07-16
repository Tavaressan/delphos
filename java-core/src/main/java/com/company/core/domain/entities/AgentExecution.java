package com.company.core.domain.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_executions")
public class AgentExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @Column(name = "agent_id")
    private UUID agentId;

    @NotNull
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false)
    // Estados efetivamente atribuídos por ExecutionController/AgentExecutionEventListener
    // (java-core) e pelos workers (rag-worker, crew-worker, workflow-worker). 'DISPATCHED'
    // e 'WAITING_TOOL' foram removidos deste ciclo de vida por não serem atribuídos por
    // nenhum produtor de eventos (ver issue #221); reintroduza-os apenas quando um worker
    // passar a emiti-los de fato.
    private String status; // 'REQUESTED', 'QUEUED', 'STARTED', 'THINKING', 'TOOL_RUNNING', 'RETRIEVAL_RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'

    @NotBlank
    @Column(name = "prompt_final", columnDefinition = "text", nullable = false)
    private String promptFinal;

    @Column(name = "output_result", columnDefinition = "text")
    private String outputResult;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "tokens_consumed")
    private Integer tokensConsumed = 0;

    @Column(name = "started_at")
    private Instant startedAt = Instant.now();

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public void setConversation(Conversation conversation) {
        this.conversation = conversation;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public void setAgentId(UUID agentId) {
        this.agentId = agentId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPromptFinal() {
        return promptFinal;
    }

    public void setPromptFinal(String promptFinal) {
        this.promptFinal = promptFinal;
    }

    public String getOutputResult() {
        return outputResult;
    }

    public void setOutputResult(String outputResult) {
        this.outputResult = outputResult;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Integer getTokensConsumed() {
        return tokensConsumed;
    }

    public void setTokensConsumed(Integer tokensConsumed) {
        this.tokensConsumed = tokensConsumed;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
