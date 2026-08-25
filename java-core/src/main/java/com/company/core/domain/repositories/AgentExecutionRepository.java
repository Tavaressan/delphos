package com.company.core.domain.repositories;

import com.company.core.domain.entities.AgentExecution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AgentExecutionRepository extends JpaRepository<AgentExecution, UUID> {
    List<AgentExecution> findByConversationId(UUID conversationId);
    List<AgentExecution> findByStatus(String status);
    List<AgentExecution> findByTenantId(UUID tenantId);
    Page<AgentExecution> findByTenantId(UUID tenantId, Pageable pageable);
    boolean existsByAgentIdAndStatusIn(UUID agentId, List<String> statuses);
}
