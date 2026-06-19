package com.company.core.domain.repositories;

import com.company.core.domain.entities.Agent;
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
class AgentRepositoryTest {

    @Autowired
    private AgentRepository agentRepository;

    @Test
    void findByTenantId_returnsEmptyListForUnknownTenant() {
        List<Agent> result = agentRepository.findByTenantId(UUID.randomUUID());
        assertThat(result).isEmpty();
    }

    @Test
    void findByTenantId_returnsOnlyAgentsBelongingToTenant() {
        UUID tenant1 = UUID.randomUUID();
        UUID tenant2 = UUID.randomUUID();

        Agent a1 = new Agent();
        a1.setName("Agente do Tenant 1");
        a1.setTenantId(tenant1);
        agentRepository.save(a1);

        Agent a2 = new Agent();
        a2.setName("Agente do Tenant 2");
        a2.setTenantId(tenant2);
        agentRepository.save(a2);

        List<Agent> result = agentRepository.findByTenantId(tenant1);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Agente do Tenant 1");
    }

    @Test
    void save_persistsAgentWithGeneratedId() {
        Agent agent = new Agent();
        agent.setName("Agente Teste");
        agent.setTenantId(UUID.randomUUID());
        Agent saved = agentRepository.save(agent);

        assertThat(saved.getId()).isNotNull();
        assertThat(agentRepository.findById(saved.getId())).isPresent();
    }

    @Test
    void findByTenantId_returnsAllAgentsForTenant() {
        UUID tenantId = UUID.randomUUID();

        for (int i = 1; i <= 3; i++) {
            Agent agent = new Agent();
            agent.setName("Agente " + i);
            agent.setTenantId(tenantId);
            agentRepository.save(agent);
        }

        List<Agent> result = agentRepository.findByTenantId(tenantId);
        assertThat(result).hasSize(3);
    }
}
