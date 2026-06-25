package com.company.core.interfaces.rest;

import com.company.core.application.AgentService;
import com.company.core.application.AuditService;
import com.company.core.domain.entities.Agent;
import com.company.core.domain.repositories.AgentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AgentControllerTest {

    @Mock
    private AgentService agentService;

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private AuditService auditService;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AgentController(agentService, agentRepository, auditService)).build();
    }

    @Test
    void listAgents_withNoTenantId_returnsEmptyList() throws Exception {
        UUID defaultTenant = UUID.fromString("00000000-0000-0000-0000-000000000000");
        when(agentRepository.findByTenantId(defaultTenant)).thenReturn(List.of());

        mockMvc.perform(get("/api/agents"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void listAgents_withTenantId_returnsAgentsForTenant() throws Exception {
        UUID tenantId = UUID.randomUUID();
        Agent agent = new Agent();
        agent.setId(UUID.randomUUID());
        agent.setName("Agente RAG");
        agent.setTenantId(tenantId);
        when(agentRepository.findByTenantId(tenantId)).thenReturn(List.of(agent));

        mockMvc.perform(get("/api/agents").param("tenantId", tenantId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Agente RAG"));
    }

    @Test
    void createAgent_whenServiceThrows_returns500() throws Exception {
        when(agentService.createAgent(any(), any(), any()))
                .thenThrow(new RuntimeException("Storage unavailable"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "agent.zip", "application/zip", "zip-content".getBytes());

        mockMvc.perform(multipart("/api/admin/agents")
                        .file(file)
                        .param("name", "Novo Agente"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void createAgent_withInvalidTenantId_returns400() throws Exception {
        when(agentService.createAgent(any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Tenant inválido"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "agent.zip", "application/zip", "zip-content".getBytes());

        mockMvc.perform(multipart("/api/admin/agents")
                        .file(file)
                        .param("name", "Agente X"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Tenant inválido"));
    }

    @Test
    void updateAgent_withValidId_returnsUpdatedAgent() throws Exception {
        UUID id = UUID.randomUUID();
        Agent agent = new Agent();
        agent.setId(id);
        agent.setName("Agente Antigo");
        agent.setTenantId(UUID.randomUUID());
        agent.setStatus("IN_REVIEW");

        when(agentRepository.findById(id)).thenReturn(Optional.of(agent));
        when(agentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(put("/api/admin/agents/" + id)
                        .contentType("application/json")
                        .content("{\"name\":\"Agente Atualizado\",\"description\":\"Nova descricao\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Agente Atualizado"));
    }

    @Test
    void updateAgent_withUnknownId_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(agentRepository.findById(id)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/admin/agents/" + id)
                        .contentType("application/json")
                        .content("{\"name\":\"X\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void publishAgent_setsStatusToPublished() throws Exception {
        UUID id = UUID.randomUUID();
        Agent agent = new Agent();
        agent.setId(id);
        agent.setName("Agente Teste");
        agent.setTenantId(UUID.randomUUID());
        agent.setStatus("IN_REVIEW");

        when(agentRepository.findById(id)).thenReturn(Optional.of(agent));
        when(agentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(patch("/api/admin/agents/" + id + "/publish"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    @Test
    void deactivateAgent_setsStatusToInactive() throws Exception {
        UUID id = UUID.randomUUID();
        Agent agent = new Agent();
        agent.setId(id);
        agent.setName("Agente Publicado");
        agent.setTenantId(UUID.randomUUID());
        agent.setStatus("PUBLISHED");

        when(agentRepository.findById(id)).thenReturn(Optional.of(agent));
        when(agentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(patch("/api/admin/agents/" + id + "/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));
    }
}
