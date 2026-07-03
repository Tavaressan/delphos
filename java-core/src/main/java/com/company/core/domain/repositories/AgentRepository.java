package com.company.core.domain.repositories;

import com.company.core.domain.entities.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AgentRepository extends JpaRepository<Agent, UUID> {
    List<Agent> findByTenantId(UUID tenantId);
    List<Agent> findByTenantIdAndStatusNot(UUID tenantId, String status);
}
