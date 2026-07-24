package com.company.core.application;

import com.company.core.domain.entities.Agent;
import com.company.core.domain.entities.AgentCustomTool;
import com.company.core.domain.entities.Document;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.AgentCustomToolRepository;
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
    private final AgentCustomToolRepository agentCustomToolRepository;
    private final MinioClient minioClient;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    @Value("${minio.bucket:agents-data}")
    private String minioBucket = "agents-data";

    // Nome de arquivo de tool derivado do basename de tools/<nome>.py: letras, dígitos,
    // underscore e hífen, começando por letra ou underscore (issue #129).
    private static final java.util.regex.Pattern TOOL_NAME_PATTERN =
            java.util.regex.Pattern.compile("^[A-Za-z_][A-Za-z0-9_-]*$");

    public AgentService(AgentRepository agentRepository,
                        DocumentRepository documentRepository,
                        UserRepository userRepository,
                        AgentCustomToolRepository agentCustomToolRepository,
                        MinioClient minioClient,
                        RabbitTemplate rabbitTemplate,
                        ObjectMapper objectMapper,
                        AuditService auditService) {
        this.agentRepository = agentRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.agentCustomToolRepository = agentCustomToolRepository;
        this.minioClient = minioClient;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    @Transactional
    public Agent createAgent(String name, MultipartFile file, UUID tenantId) throws Exception {
        byte[] zipBytes = readAndValidateZip(file);
        ParsedZip parsed = parseZip(zipBytes);

        // Create the Agent Entity
        Agent agent = new Agent();
        agent.setName(name);
        agent.setTenantId(tenantId);
        agent.setSystemInstructions(parsed.systemInstructions);
        if (parsed.manifestConfig != null) {
            agent.setManifestConfig(parsed.manifestConfig);
        }
        agent = agentRepository.save(agent);
        auditService.logAction("CREATE_AGENT", "Agent: " + name, "{\"agentId\":\"" + agent.getId() + "\"}", tenantId);

        agent = uploadZipAndProcessDocuments(agent, zipBytes, tenantId);
        saveCustomTools(agent, parsed.customTools);

        return agent;
    }

    @Transactional
    public Agent updateAgentPackage(Agent agent, MultipartFile file) throws Exception {
        byte[] zipBytes = readAndValidateZip(file);
        ParsedZip parsed = parseZip(zipBytes);

        agent.setSystemInstructions(parsed.systemInstructions);
        if (parsed.manifestConfig != null) {
            agent.setManifestConfig(parsed.manifestConfig);
        }
        agent = agentRepository.save(agent);

        agent = uploadZipAndProcessDocuments(agent, zipBytes, agent.getTenantId());
        saveCustomTools(agent, parsed.customTools);
        auditService.logAction("UPDATE_AGENT_PACKAGE", "Agent: " + agent.getName(), "{\"agentId\":\"" + agent.getId() + "\"}", agent.getTenantId());

        return agent;
    }

    /**
     * Persiste as tools Python customizadas extraídas de {@code tools/*.py} no ZIP do
     * agente (issue #129). Em atualização, substitui integralmente o conjunto anterior
     * (mesma semântica de replace usada para system_instructions/manifest_config).
     */
    private void saveCustomTools(Agent agent, Map<String, String> customTools) {
        agentCustomToolRepository.deleteByAgentId(agent.getId());
        if (customTools == null || customTools.isEmpty()) {
            return;
        }
        for (Map.Entry<String, String> entry : customTools.entrySet()) {
            AgentCustomTool tool = new AgentCustomTool();
            tool.setAgent(agent);
            tool.setToolName(entry.getKey());
            tool.setScriptContent(entry.getValue());
            agentCustomToolRepository.save(tool);
        }
    }

    private byte[] readAndValidateZip(MultipartFile file) throws Exception {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo ZIP vazio.");
        }
        return file.getBytes();
    }

    private static class ParsedZip {
        String systemInstructions;
        String manifestConfig;
        Map<String, String> customTools = new LinkedHashMap<>();
    }

    private ParsedZip parseZip(byte[] zipBytes) throws Exception {
        long totalUncompressedSize = 0;
        boolean hasRootMd = false;
        String systemInstructions = "";
        String manifestConfig = null;
        Map<String, String> customTools = new LinkedHashMap<>();

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
                    } else if (isToolsScript(entryName)) {
                        ByteArrayOutputStream bos = new ByteArrayOutputStream();
                        byte[] buffer = new byte[1024];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            bos.write(buffer, 0, len);
                        }
                        String scriptContent = bos.toString("UTF-8");
                        String toolName = toolNameFromEntry(entryName);
                        if (!scriptContent.isBlank()) {
                            customTools.put(toolName, scriptContent);
                        }
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

        ParsedZip parsed = new ParsedZip();
        parsed.systemInstructions = systemInstructions;
        parsed.manifestConfig = manifestConfig;
        parsed.customTools = customTools;
        return parsed;
    }

    /**
     * Um arquivo é uma tool customizada (issue #129) se estiver diretamente dentro da
     * pasta {@code tools/} na raiz do ZIP (não em subpastas) e tiver extensão {@code .py}.
     */
    private boolean isToolsScript(String entryName) {
        String normalized = entryName.replace('\\', '/');
        if (!normalized.startsWith("tools/") || !normalized.endsWith(".py")) {
            return false;
        }
        String rest = normalized.substring("tools/".length());
        return !rest.isEmpty() && !rest.contains("/");
    }

    /**
     * Deriva o nome da tool a partir do basename do arquivo (ex.: {@code tools/sum_values.py}
     * -> {@code sum_values}), validando que o resultado é um identificador seguro.
     */
    private String toolNameFromEntry(String entryName) {
        String normalized = entryName.replace('\\', '/');
        String fileName = normalized.substring(normalized.lastIndexOf('/') + 1);
        String toolName = fileName.substring(0, fileName.length() - ".py".length());
        if (!TOOL_NAME_PATTERN.matcher(toolName).matches()) {
            throw new IllegalArgumentException(
                    "Nome de tool inválido derivado de '" + entryName + "': '" + toolName
                            + "'. Use apenas letras, números, '_' e '-', começando por letra ou '_'.");
        }
        return toolName;
    }

    private Agent uploadZipAndProcessDocuments(Agent agent, byte[] zipBytes, UUID tenantId) throws Exception {
        // Upload original ZIP to MinIO
        String zipPath = "agents-data/agent-" + agent.getId() + "/agent.zip";
        try (InputStream is = new ByteArrayInputStream(zipBytes)) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(minioBucket)
                    .object(zipPath)
                    .stream(is, (long) zipBytes.length, -1L)
                    .contentType("application/zip")
                    .build());
        }
        agent.setZipPath(zipPath);
        agent = agentRepository.save(agent);

        // Extract and upload individual files, then notify ingestion worker
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
                                    .stream(fileIs, (long) fileData.length, -1L)
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
