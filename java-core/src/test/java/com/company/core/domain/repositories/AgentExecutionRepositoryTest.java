package com.company.core.domain.repositories;

import com.company.core.domain.entities.AgentExecution;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Tag("integration")
@Transactional
class AgentExecutionRepositoryTest {

    @Autowired
    private AgentExecutionRepository agentExecutionRepository;

    private AgentExecution buildExecution(UUID tenantId) {
        AgentExecution execution = new AgentExecution();
        execution.setAgentId(UUID.randomUUID());
        execution.setTenantId(tenantId);
        execution.setStatus("REQUESTED");
        execution.setPromptFinal("prompt de teste");
        return execution;
    }

    @Test
    void findByTenantId_returnsOnlyExecutionsBelongingToTenant() {
        UUID tenant1 = UUID.randomUUID();
        UUID tenant2 = UUID.randomUUID();

        agentExecutionRepository.save(buildExecution(tenant1));
        agentExecutionRepository.save(buildExecution(tenant2));

        List<AgentExecution> result = agentExecutionRepository.findByTenantId(tenant1);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTenantId()).isEqualTo(tenant1);
    }

    @Test
    void findByTenantId_returnsEmptyListForUnknownTenant() {
        List<AgentExecution> result = agentExecutionRepository.findByTenantId(UUID.randomUUID());
        assertThat(result).isEmpty();
    }
}
