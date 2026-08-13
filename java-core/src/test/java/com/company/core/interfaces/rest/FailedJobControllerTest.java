package com.company.core.interfaces.rest;

import com.company.core.domain.entities.Document;
import com.company.core.domain.entities.FailedJob;
import com.company.core.domain.repositories.DocumentRepository;
import com.company.core.domain.repositories.FailedJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FailedJobControllerTest {

    @Mock
    private FailedJobRepository failedJobRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private RabbitTemplate rabbitTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new FailedJobController(failedJobRepository, documentRepository, rabbitTemplate)
        ).build();
    }

    @Test
    void retryDocument_whenRabbitPublishFails_revertsDocumentStateAndReports5xx() throws Exception {
        UUID documentId = UUID.randomUUID();

        FailedJob job = new FailedJob();
        job.setId(UUID.randomUUID());
        job.setDocumentId(documentId);
        job.setPayload("{}");
        job.setRetryCount(2);

        Document document = new Document();
        document.setId(documentId);
        document.setStatus("FAILED");
        document.setProcessingError("timeout ao processar documento");

        when(failedJobRepository.findByDocumentIdOrderByCreatedAtDesc(documentId))
                .thenReturn(List.of(job));
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        org.mockito.Mockito.doThrow(new AmqpException("broker indisponível"))
                .when(rabbitTemplate).convertAndSend(anyString(), anyString(), anyString());

        mockMvc.perform(post("/api/documents/" + documentId + "/retry"))
                .andExpect(status().is5xxServerError());

        // Documento não deve ficar preso em PROCESSING nem perder o erro anterior.
        assertThat(document.getStatus()).isEqualTo("FAILED");
        assertThat(document.getProcessingError()).isEqualTo("timeout ao processar documento");

        // O job nunca deve registrar uma tentativa de retry que na verdade falhou.
        assertThat(job.getRetryCount()).isEqualTo(2);
        verify(failedJobRepository, never()).save(any());
    }
}
