package com.company.core.interfaces.rest;

import com.company.core.application.FileTypeValidator;
import com.company.core.domain.entities.Agent;
import com.company.core.domain.entities.Document;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.AgentRepository;
import com.company.core.domain.repositories.DocumentRepository;
import com.company.core.domain.repositories.UserRepository;
import com.company.core.infrastructure.web.GlobalExceptionHandler;
import tools.jackson.databind.ObjectMapper;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

    private final DocumentRepository documentRepository;
    private final AgentRepository agentRepository;
    private final UserRepository userRepository;
    private final MinioClient minioClient;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final com.company.core.application.AuditService auditService;
    private final FileTypeValidator fileTypeValidator;

    @Value("${minio.bucket:agents-data}")
    private String minioBucket;

    public DocumentController(DocumentRepository documentRepository,
                              AgentRepository agentRepository,
                              UserRepository userRepository,
                              MinioClient minioClient,
                              RabbitTemplate rabbitTemplate,
                              ObjectMapper objectMapper,
                              com.company.core.application.AuditService auditService,
                              FileTypeValidator fileTypeValidator) {
        this.documentRepository = documentRepository;
        this.agentRepository = agentRepository;
        this.userRepository = userRepository;
        this.minioClient = minioClient;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
        this.fileTypeValidator = fileTypeValidator;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "agentId", required = false) String agentIdStr,
            @RequestParam(value = "tenantId", required = false) String tenantIdStr) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Arquivo vazio."));
            }

            if (tenantIdStr == null || tenantIdStr.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "tenantId é obrigatório para o upload de documentos."));
            }

            UUID tenantId;
            try {
                tenantId = UUID.fromString(tenantIdStr);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "tenantId inválido."));
            }

            Agent agent = null;
            if (agentIdStr != null && !agentIdStr.isEmpty()) {
                agent = agentRepository.findById(UUID.fromString(agentIdStr)).orElse(null);
            }

            String name = file.getOriginalFilename();
            if (name == null || name.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Nome do arquivo é obrigatório."));
            }
            if (name.length() > 255) {
                name = name.substring(name.length() - 255);
            }
            String ext = getFileExtension(name).toLowerCase();

            byte[] fileBytes = file.getBytes();
            try {
                fileTypeValidator.validate(fileBytes, ext);
            } catch (FileTypeValidator.ValidationException e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }

            // Create document UUID e object key baseado em UUID (nome original vira só metadado)
            UUID docId = UUID.randomUUID();
            String storedFileName = docId + "." + ext;

            // Upload to MinIO
            String objectPath = "documents/" + docId + "/" + storedFileName;
            try (InputStream is = new ByteArrayInputStream(fileBytes)) {
                minioClient.putObject(PutObjectArgs.builder()
                        .bucket(minioBucket)
                        .object(objectPath)
                        .stream(is, (long) fileBytes.length, -1L)
                        .contentType(getContentType(ext))
                        .build());
            }

            User creator = userRepository.findByUsername("admin").orElse(null);

            // Save metadata
            Document doc = new Document();
            doc.setId(docId);
            doc.setName(name);
            doc.setFilePath(objectPath);
            doc.setFileSize(file.getSize());
            doc.setFileType(ext);
            doc.setStatus("PROCESSING");
            doc.setTenantId(tenantId);
            doc.setAgent(agent);
            doc.setCreatedBy(creator);
            doc = documentRepository.save(doc);
            auditService.logAction("UPLOAD_DOCUMENT", "Document: " + name, "{\"documentId\":\"" + doc.getId() + "\",\"agentId\":" + (agent != null ? "\"" + agent.getId() + "\"" : "null") + "}", tenantId);

            // Publish job to RabbitMQ
            Map<String, Object> jobPayload = new HashMap<>();
            jobPayload.put("document_id", doc.getId().toString());
            jobPayload.put("file_path", objectPath);
            jobPayload.put("tenant_id", tenantId.toString());
            jobPayload.put("file_type", ext);

            rabbitTemplate.convertAndSend(
                    "agent.execution.exchange",
                    "document.ingestion.jobs",
                    objectMapper.writeValueAsString(jobPayload)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("id", doc.getId().toString());
            response.put("name", doc.getName());
            response.put("status", doc.getStatus());
            response.put("agentId", agent != null ? agent.getId().toString() : null);
            response.put("tenantId", doc.getTenantId().toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to upload document", e);
            return ResponseEntity.internalServerError().body(Map.of("error", GlobalExceptionHandler.GENERIC_ERROR_MESSAGE));
        }
    }

    @GetMapping
    public ResponseEntity<?> listDocuments(
            @RequestParam(value = "tenantId", required = false) String tenantIdStr,
            Pageable pageable) {
        if (tenantIdStr == null || tenantIdStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "tenantId é obrigatório para listar documentos."));
        }

        UUID tenantId;
        try {
            tenantId = UUID.fromString(tenantIdStr);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "tenantId inválido."));
        }

        Page<Document> docs = documentRepository.findByTenantId(tenantId, pageable);
        return ResponseEntity.ok(docs);
    }

    private String getFileExtension(String fileName) {
        if (fileName == null) return "";
        int lastIndex = fileName.lastIndexOf('.');
        return (lastIndex == -1) ? "" : fileName.substring(lastIndex + 1);
    }

    private String getContentType(String ext) {
        switch (ext) {
            case "pdf": return "application/pdf";
            case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "txt": return "text/plain";
            case "md": return "text/markdown";
            default: return "application/octet-stream";
        }
    }
}
