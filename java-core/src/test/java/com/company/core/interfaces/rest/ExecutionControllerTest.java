package com.company.core.interfaces.rest;

import com.company.core.application.AuditService;
import com.company.core.domain.entities.AgentExecution;
import com.company.core.domain.entities.Conversation;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.AgentExecutionRepository;
import com.company.core.domain.repositories.AgentRepository;
import com.company.core.domain.repositories.ConversationRepository;
import com.company.core.domain.repositories.MessageRepository;
import com.company.core.domain.repositories.RetrievalEventRepository;
import com.company.core.domain.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ExecutionControllerTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private AgentExecutionRepository executionRepository;
    @Mock
    private RabbitTemplate rabbitTemplate;
    @Mock
    private AgentRepository agentRepository;
    @Mock
    private MessageRepository messageRepository;
    @Mock
    private AuditService auditService;
    @Mock
    private RetrievalEventRepository retrievalEventRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        ObjectMapper objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders.standaloneSetup(new ExecutionController(
                userRepository, conversationRepository, executionRepository, rabbitTemplate,
                objectMapper, agentRepository, messageRepository, auditService, retrievalEventRepository)).build();
    }

    @Test
    void markTimeout_withRunningExecution_setsStatusToTimeout() throws Exception {
        UUID id = UUID.randomUUID();
        AgentExecution execution = new AgentExecution();
        execution.setId(id);
        execution.setStatus("TOOL_RUNNING");

        when(executionRepository.findById(id)).thenReturn(Optional.of(execution));
        when(executionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(patch("/api/executions/" + id + "/timeout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("TIMEOUT"));

        verify(executionRepository).save(any());
    }

    @Test
    void markTimeout_withUnknownId_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(executionRepository.findById(id)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/api/executions/" + id + "/timeout"))
                .andExpect(status().isNotFound());
    }

    @Test
    void markTimeout_withAlreadyCompletedExecution_keepsStatusAndDoesNotOverwrite() throws Exception {
        UUID id = UUID.randomUUID();
        AgentExecution execution = new AgentExecution();
        execution.setId(id);
        execution.setStatus("COMPLETED");
        execution.setOutputResult("Resposta já pronta");

        when(executionRepository.findById(id)).thenReturn(Optional.of(execution));

        mockMvc.perform(patch("/api/executions/" + id + "/timeout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        verify(executionRepository, never()).save(any());
    }

    @Test
    void submitExecution_withoutAgentId_doesNotGenerateRandomAgentId() throws Exception {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setUsername("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));

        when(conversationRepository.save(any())).thenAnswer(inv -> {
            Conversation c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        when(executionRepository.save(any())).thenAnswer(inv -> {
            AgentExecution e = inv.getArgument(0);
            if (e.getId() == null) {
                e.setId(UUID.randomUUID());
            }
            return e;
        });

        ArgumentCaptor<AgentExecution> executionCaptor = ArgumentCaptor.forClass(AgentExecution.class);
        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);

        mockMvc.perform(post("/api/executions")
                        .contentType("application/json")
                        .content("{\"prompt\":\"Olá\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agentId").doesNotExist());

        verify(executionRepository, org.mockito.Mockito.atLeastOnce()).save(executionCaptor.capture());
        assertThat(executionCaptor.getValue().getAgentId()).isNull();

        verify(rabbitTemplate).convertAndSend(anyString(), anyString(), payloadCaptor.capture());
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> publishedPayload = mapper.readValue(payloadCaptor.getValue(), Map.class);
        assertThat(publishedPayload).doesNotContainKey("agent_id");
    }

    @Test
    void listExecutions_withTenantId_returnsExecutionsForTenant() throws Exception {
        UUID tenantId = UUID.randomUUID();
        AgentExecution execution = new AgentExecution();
        execution.setId(UUID.randomUUID());
        execution.setTenantId(tenantId);
        execution.setStatus("COMPLETED");

        when(executionRepository.findByTenantId(tenantId)).thenReturn(List.of(execution));

        mockMvc.perform(get("/api/executions?tenantId=" + tenantId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("COMPLETED"));
    }
}
