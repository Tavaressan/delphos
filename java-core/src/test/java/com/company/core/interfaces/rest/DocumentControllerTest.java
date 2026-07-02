package com.company.core.interfaces.rest;

import com.company.core.application.AuditService;
import com.company.core.domain.repositories.AgentRepository;
import com.company.core.domain.repositories.DocumentRepository;
import com.company.core.domain.repositories.UserRepository;
import tools.jackson.databind.ObjectMapper;
import io.minio.MinioClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

class DocumentControllerTest {

    private DocumentRepository documentRepository;
    private AgentRepository agentRepository;
    private UserRepository userRepository;
    private MinioClient minioClient;
    private RabbitTemplate rabbitTemplate;
    private ObjectMapper objectMapper;
    private AuditService auditService;
    private DocumentController documentController;

    @BeforeEach
    void setUp() {
        documentRepository = Mockito.mock(DocumentRepository.class);
        agentRepository = Mockito.mock(AgentRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        minioClient = Mockito.mock(MinioClient.class);
        rabbitTemplate = Mockito.mock(RabbitTemplate.class);
        objectMapper = Mockito.mock(ObjectMapper.class);
        auditService = Mockito.mock(AuditService.class);

        documentController = new DocumentController(
                documentRepository,
                agentRepository,
                userRepository,
                minioClient,
                rabbitTemplate,
                objectMapper,
                auditService
        );
    }

    @Test
    void listDocuments_WithoutTenantId_ShouldReturnBadRequestAndNeverQueryRepository() {
        ResponseEntity<?> response = documentController.listDocuments(null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(documentRepository);
    }

    @Test
    void uploadDocument_WithoutTenantId_ShouldReturnBadRequestAndNeverTouchRepositoryOrMinio() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "doc.txt",
                "text/plain",
                "conteudo".getBytes()
        );

        ResponseEntity<?> response = documentController.uploadDocument(file, null, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(documentRepository);
        verifyNoInteractions(minioClient);
    }
}
