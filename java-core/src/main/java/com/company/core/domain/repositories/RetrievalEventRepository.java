package com.company.core.domain.repositories;

import com.company.core.domain.entities.RetrievalEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface RetrievalEventRepository extends JpaRepository<RetrievalEvent, UUID> {
    List<RetrievalEvent> findByAgentExecutionId(UUID executionId);
}
