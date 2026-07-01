package com.company.core.domain.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "retrieval_events")
public class RetrievalEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_id", nullable = false)
    private AgentExecution agentExecution;

    @NotNull
    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @NotNull
    @Column(name = "chunk_id", nullable = false)
    private UUID chunkId;

    @NotNull
    @Column(name = "similarity_score", nullable = false)
    private Double similarityScore;

    @Column(name = "document_name")
    private String documentName;

    @NotBlank
    @Column(name = "retrieved_content", columnDefinition = "text", nullable = false)
    private String retrievedContent;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public AgentExecution getAgentExecution() {
        return agentExecution;
    }

    public void setAgentExecution(AgentExecution agentExecution) {
        this.agentExecution = agentExecution;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public void setDocumentId(UUID documentId) {
        this.documentId = documentId;
    }

    public UUID getChunkId() {
        return chunkId;
    }

    public void setChunkId(UUID chunkId) {
        this.chunkId = chunkId;
    }

    public Double getSimilarityScore() {
        return similarityScore;
    }

    public void setSimilarityScore(Double similarityScore) {
        this.similarityScore = similarityScore;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public String getRetrievedContent() {
        return retrievedContent;
    }

    public void setRetrievedContent(String retrievedContent) {
        this.retrievedContent = retrievedContent;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
