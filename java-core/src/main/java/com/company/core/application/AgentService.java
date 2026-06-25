package com.company.core.application;

import com.company.core.domain.entities.Agent;
import com.company.core.domain.entities.Document;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.AgentRepository;
import com.company.core.domain.repositories.DocumentRepository;
import com.company.core.domain.repositories.UserRepository;
import tools.jackson.databind.ObjectMapper;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class AgentService {

    private static final Logger log = LoggerFactory.getLogger(AgentService.class);

    private final AgentRepository agentRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final MinioClient minioClient;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    @Value("${minio.bucket:agents-data}")
    private String minioBucket;

    public AgentService(AgentRepository agentRepository,
                        DocumentRepository documentRepository,
                        UserRepository userRepository,
                        MinioClient minioClient,
                        RabbitTemplate rabbitTemplate,
                        ObjectMapper objectMapper,
                        AuditService auditService) {
        this.agentRepository = agentRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.minioClient = minioClient;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    @Transactional
    public Agent createAgent(String name, MultipartFile file, UUID tenantId) throws Exception {
        // 1. Validation of the ZIP file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo ZIP vazio.");
        }

        byte[] zipBytes = file.getBytes();
        long totalUncompressedSize = 0;
        boolean hasRootMd = false;
        String systemInstructions = "";
        String manifestConfig = null;

        // First pass: validation
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    totalUncompressedSize += entry.getSize();
                    String entryName = entry.getName();
                    
                    // Check if MD is in root (does not contain slashes, or is at depth 0)
                    if (entryName.endsWith(".md") && !entryName.contains("/") && !entryName.contains("\\")) {
                        hasRootMd = true;
                        
                        // Read first root MD content as system instructions
                        if (systemInstructions.isEmpty()) {
                            ByteArrayOutputStream bos = new ByteArrayOutputStream();
                            byte[] buffer = new byte[1024];
                            int len;
                            while ((len = zis.read(buffer)) > 0) {
                                bos.write(buffer, 0, len);
                            }
                            systemInstructions = bos.toString("UTF-8");
                        }
                    } else if ((entryName.equalsIgnoreCase("manifest.yaml") || entryName.equalsIgnoreCase("manifest.yml"))
                            && !entryName.contains("/") && !entryName.contains("\\")) {
                        ByteArrayOutputStream bos = new ByteArrayOutputStream();
                        byte[] buffer = new byte[1024];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            bos.write(buffer, 0, len);
                        }
                        manifestConfig = bos.toString("UTF-8");
                    }
                }
                zis.closeEntry();
            }
        }

        if (!hasRootMd) {
            throw new IllegalArgumentException("O arquivo ZIP deve conter pelo menos um arquivo '.md' na raiz com as diretrizes de comportamento.");
        }

        if (totalUncompressedSize > 20 * 1024 * 1024) { // 20MB limit
            throw new IllegalArgumentException("O tamanho total descompactado do ZIP (" + (totalUncompressedSize / (1024 * 1024)) + "MB) excede o limite de 20MB.");
        }

        // 2. Create the Agent Entity
        Agent agent = new Agent();
        agent.setName(name);
        agent.setTenantId(tenantId);
        agent.setSystemInstructions(systemInstructions);
        if (manifestConfig != null) {
            agent.setManifestConfig(manifestConfig);
        }
        agent = agentRepository.save(agent);
        auditService.logAction("CREATE_AGENT", "Agent: " + name, "{\"agentId\":\"" + agent.getId() + "\"}");

        // 3. Upload original ZIP to MinIO
        String zipPath = "agents-data/agent-" + agent.getId() + "/agent.zip";
        try (InputStream is = new ByteArrayInputStream(zipBytes)) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(minioBucket)
                    .object(zipPath)
                    .stream(is, zipBytes.length, -1)
                    .contentType("application/zip")
                    .build());
        }
        agent.setZipPath(zipPath);
        agent = agentRepository.save(agent);

        // 4. Extract and upload individual files, then notify ingestion worker
        User creator = userRepository.findByUsername("admin").orElse(null);

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    String entryName = entry.getName();
                    // We only process knowledge documents like PDF, DOCX, TXT, MD
                    String ext = getFileExtension(entryName).toLowerCase();
                    if (Arrays.asList("pdf", "docx", "txt", "md").contains(ext)) {
                        ByteArrayOutputStream bos = new ByteArrayOutputStream();
                        byte[] buffer = new byte[1024];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            bos.write(buffer, 0, len);
                        }
                        byte[] fileData = bos.toByteArray();

                        String objectPath = "agents-data/agent-" + agent.getId() + "/" + entryName;
                        try (InputStream fileIs = new ByteArrayInputStream(fileData)) {
                            minioClient.putObject(PutObjectArgs.builder()
                                    .bucket(minioBucket)
                                    .object(objectPath)
                                    .stream(fileIs, fileData.length, -1)
                                    .contentType(getContentType(ext))
                                    .build());
                        }

                        // Save Document metadata
                        Document doc = new Document();
                        doc.setName(entryName);
                        doc.setFilePath(objectPath);
                        doc.setFileSize((long) fileData.length);
                        doc.setFileType(ext);
                        doc.setStatus("PROCESSING");
                        doc.setTenantId(tenantId);
                        doc.setAgent(agent);
                        doc.setCreatedBy(creator);
                        doc = documentRepository.save(doc);

                        // Publish to RabbitMQ document ingestion queue
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
                        log.info("Published document ingestion job for doc: {} of agent: {}", doc.getId(), agent.getId());
                    }
                }
                zis.closeEntry();
            }
        }

        return agent;
    }

    private String getFileExtension(String fileName) {
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
