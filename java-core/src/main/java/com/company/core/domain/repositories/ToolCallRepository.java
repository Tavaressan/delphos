package com.company.core.domain.repositories;

import com.company.core.domain.entities.ToolCall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ToolCallRepository extends JpaRepository<ToolCall, UUID> {
    List<ToolCall> findByAgentExecutionId(UUID executionId);
}
