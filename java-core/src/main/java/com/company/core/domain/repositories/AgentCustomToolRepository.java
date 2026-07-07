package com.company.core.domain.repositories;

import com.company.core.domain.entities.AgentCustomTool;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AgentCustomToolRepository extends JpaRepository<AgentCustomTool, UUID> {
    List<AgentCustomTool> findByAgentId(UUID agentId);
    void deleteByAgentId(UUID agentId);
}
