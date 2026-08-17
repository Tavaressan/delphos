package com.company.core.interfaces.rest;

import com.company.core.domain.entities.AgentExecution;
import com.company.core.domain.repositories.AgentExecutionRepository;
import com.company.core.domain.repositories.AgentRepository;
import com.company.core.domain.repositories.ConversationRepository;
import com.company.core.domain.repositories.UserRepository;
import com.company.core.infrastructure.web.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private AgentRepository agentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AgentExecutionRepository agentExecutionRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new ChatController(conversationRepository, agentRepository, userRepository, agentExecutionRepository)
        ).build();
    }

    @Test
    void deleteConversation_withAssociatedExecutions_deletesExecutionsFirstAndReturns204() throws Exception {
        // issue #315: agent_executions.conversation_id não tem ON DELETE CASCADE (diferente
        // de messages.conversation_id) - excluir a conversa diretamente lançaria uma FK
        // violation não tratada. As execuções associadas devem ser removidas antes.
        UUID conversationId = UUID.randomUUID();
        AgentExecution execution = new AgentExecution();
        execution.setId(UUID.randomUUID());

        when(conversationRepository.existsById(conversationId)).thenReturn(true);
        when(agentExecutionRepository.findByConversationId(conversationId)).thenReturn(List.of(execution));

        mockMvc.perform(delete("/api/chats/" + conversationId))
                .andExpect(status().isNoContent());

        verify(agentExecutionRepository).deleteAll(anyList());
        verify(conversationRepository).deleteById(conversationId);
    }

    @Test
    void deleteConversation_withUnknownId_returns404() throws Exception {
        UUID conversationId = UUID.randomUUID();
        when(conversationRepository.existsById(conversationId)).thenReturn(false);

        mockMvc.perform(delete("/api/chats/" + conversationId))
                .andExpect(status().isNotFound());
    }

    /**
     * Issue #247: uma exceção interna (ex.: falha de conexão com o banco) não deve vazar sua
     * mensagem crua (e.getMessage()) para o corpo da resposta HTTP.
     */
    @Test
    void createConversation_whenRepositoryThrows_doesNotLeakInternalExceptionMessage() throws Exception {
        String sensitiveDetail = "FATAL: password authentication failed for user \"core_admin\" at db-internal:5432";
        when(userRepository.findByUsername("admin")).thenThrow(new RuntimeException(sensitiveDetail));

        MvcResult result = mockMvc.perform(post("/api/chats")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Nova conversa\"}"))
                .andExpect(status().isInternalServerError())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain(sensitiveDetail);
        assertThat(body).doesNotContain("db-internal");
        assertThat(body).contains(GlobalExceptionHandler.GENERIC_ERROR_MESSAGE);
    }
}
