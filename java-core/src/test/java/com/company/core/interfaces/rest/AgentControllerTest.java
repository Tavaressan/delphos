package com.company.core.interfaces.rest;

import com.company.core.application.AgentService;
import com.company.core.domain.entities.Agent;
import com.company.core.domain.repositories.AgentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AgentController.class)
@TestPropertySource(properties = "app.cors.allowed-origins=http://localhost")
class AgentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AgentService agentService;

    @MockitoBean
    private AgentRepository agentRepository;

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
}
