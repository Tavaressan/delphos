package com.company.core.domain.repositories;

import com.company.core.domain.entities.DocumentChunk;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {
    List<DocumentChunk> findByDocumentId(UUID documentId);
    List<DocumentChunk> findByTenantId(UUID tenantId);

    @Query("SELECT dc FROM DocumentChunk dc JOIN dc.document d WHERE dc.tenantId = :tenantId AND (d.agent.id = :agentId OR d.agent IS NULL)")
    List<DocumentChunk> findByTenantIdAndAgentId(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId);
}
