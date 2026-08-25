package com.company.core.interfaces.rest;

import com.company.core.application.AuditService;
import com.company.core.application.FileTypeValidator;
import com.company.core.domain.entities.Document;
import com.company.core.domain.repositories.AgentRepository;
import com.company.core.domain.repositories.DocumentRepository;
import com.company.core.domain.repositories.UserRepository;
import com.company.core.infrastructure.web.GlobalExceptionHandler;
import tools.jackson.databind.ObjectMapper;
import io.minio.MinioClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class DocumentControllerTest {

    private DocumentRepository documentRepository;
    private AgentRepository agentRepository;
    private UserRepository userRepository;
    private MinioClient minioClient;
    private RabbitTemplate rabbitTemplate;
    private ObjectMapper objectMapper;
    private AuditService auditService;
    private FileTypeValidator fileTypeValidator;
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
        fileTypeValidator = new FileTypeValidator();

        documentController = new DocumentController(
                documentRepository,
                agentRepository,
                userRepository,
                minioClient,
                rabbitTemplate,
                objectMapper,
                auditService,
                fileTypeValidator
        );
    }

    @Test
    void listDocuments_WithoutTenantId_ShouldReturnBadRequestAndNeverQueryRepository() {
        ResponseEntity<?> response = documentController.listDocuments(null, Pageable.unpaged());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(documentRepository);
    }

    @Test
    void listDocuments_withMoreRecordsThanPageSize_returnsPaginatedResponse() {
        UUID tenantId = UUID.randomUUID();
        int pageSize = 20;
        int totalElements = 25;

        List<Document> pageContent = new ArrayList<>();
        for (int i = 0; i < pageSize; i++) {
            Document doc = new Document();
            doc.setId(UUID.randomUUID());
            doc.setTenantId(tenantId);
            pageContent.add(doc);
        }

        Pageable defaultPageable = PageRequest.of(0, pageSize);
        when(documentRepository.findByTenantId(eq(tenantId), eq(defaultPageable)))
                .thenReturn(new PageImpl<>(pageContent, defaultPageable, totalElements));

        ResponseEntity<?> response = documentController.listDocuments(tenantId.toString(), defaultPageable);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Page<Document> body = (Page<Document>) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getContent()).hasSize(pageSize);
        assertThat(body.getTotalElements()).isEqualTo(totalElements);
        assertThat(body.getSize()).isEqualTo(pageSize);
        assertThat(body.getNumber()).isEqualTo(0);
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

    /**
     * Issue #247: uma exceção inesperada (ex.: falha ao persistir metadados) não pode vazar sua
     * mensagem crua (e.getMessage()) para o corpo da resposta HTTP.
     */
    @Test
    void uploadDocument_WhenRepositoryThrows_DoesNotLeakInternalExceptionMessage() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "doc.txt",
                "text/plain",
                "conteudo".getBytes()
        );
        String tenantId = UUID.randomUUID().toString();
        String sensitiveDetail = "Connection refused: minio-internal:9000";

        Mockito.when(documentRepository.save(Mockito.any())).thenThrow(new RuntimeException(sensitiveDetail));

        ResponseEntity<?> response = documentController.uploadDocument(file, null, tenantId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        String body = response.getBody().toString();
        assertThat(body).doesNotContain(sensitiveDetail);
        assertThat(body).doesNotContain("minio-internal");
        assertThat(body).contains(GlobalExceptionHandler.GENERIC_ERROR_MESSAGE);
    }
}
