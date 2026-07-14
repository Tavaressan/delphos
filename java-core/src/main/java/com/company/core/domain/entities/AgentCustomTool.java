package com.company.core.domain.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

/**
 * Representa uma tool Python customizada extraída da pasta {@code tools/} do ZIP de
 * um agente (issue #129). O conteúdo bruto do script é persistido e, no crew-worker,
 * validado estaticamente (allowlist AST) antes de ser registrado como tool CrewAI.
 */
@Entity
@Table(name = "agent_custom_tools")
public class AgentCustomTool {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private Agent agent;

    @NotBlank
    @Size(max = 100)
    @Column(name = "tool_name", nullable = false)
    private String toolName;

    @NotBlank
    @Column(name = "script_content", nullable = false)
    private String scriptContent;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Agent getAgent() {
        return agent;
    }

    public void setAgent(Agent agent) {
        this.agent = agent;
    }

    public String getToolName() {
        return toolName;
    }

    public void setToolName(String toolName) {
        this.toolName = toolName;
    }

    public String getScriptContent() {
        return scriptContent;
    }

    public void setScriptContent(String scriptContent) {
        this.scriptContent = scriptContent;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
