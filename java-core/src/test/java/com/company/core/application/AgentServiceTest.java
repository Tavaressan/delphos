package com.company.core.application;

import com.company.core.domain.entities.Agent;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.AgentRepository;
import com.company.core.domain.repositories.DocumentRepository;
import com.company.core.domain.repositories.UserRepository;
import tools.jackson.databind.ObjectMapper;
import io.minio.MinioClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class AgentServiceTest {

    private AgentRepository agentRepository;
    private DocumentRepository documentRepository;
    private UserRepository userRepository;
    private MinioClient minioClient;
    private RabbitTemplate rabbitTemplate;
    private ObjectMapper objectMapper;
    private AuditService auditService;
    private AgentService agentService;

    @BeforeEach
    void setUp() {
        agentRepository = Mockito.mock(AgentRepository.class);
        documentRepository = Mockito.mock(DocumentRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        minioClient = Mockito.mock(MinioClient.class);
        rabbitTemplate = Mockito.mock(RabbitTemplate.class);
        objectMapper = Mockito.mock(ObjectMapper.class);
        auditService = Mockito.mock(AuditService.class);

        agentService = new AgentService(
                agentRepository,
                documentRepository,
                userRepository,
                minioClient,
                rabbitTemplate,
                objectMapper,
                auditService
        );
    }

    private byte[] createMockZip(String mdContent, String yamlContent) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(bos)) {
            if (mdContent != null) {
                ZipEntry entry = new ZipEntry("instructions.md");
                zos.putNextEntry(entry);
                zos.write(mdContent.getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
            if (yamlContent != null) {
                ZipEntry entry = new ZipEntry("manifest.yaml");
                zos.putNextEntry(entry);
                zos.write(yamlContent.getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        }
        return bos.toByteArray();
    }

    @Test
    void createAgent_WithManifestYaml_ShouldSaveManifestConfig() throws Exception {
        // Arrange
        String mdContent = "# Behavior Instructions";
        String yamlContent = "schema_version: 1\ntools:\n  - name: search_knowledge_base\n    enabled: true";
        byte[] zipBytes = createMockZip(mdContent, yamlContent);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "agent.zip",
                "application/zip",
                zipBytes
        );

        UUID tenantId = UUID.randomUUID();
        User admin = new User();
        admin.setUsername("admin");

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(agentRepository.save(any(Agent.class))).thenAnswer(invocation -> {
            Agent savedAgent = invocation.getArgument(0);
            if (savedAgent.getId() == null) {
                savedAgent.setId(UUID.randomUUID());
            }
            return savedAgent;
        });

        // Act
        Agent result = agentService.createAgent("Orchestrator Agent", file, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Orchestrator Agent");
        assertThat(result.getSystemInstructions()).isEqualTo(mdContent);
        assertThat(result.getManifestConfig()).isEqualTo(yamlContent);
    }

    @Test
    void createAgent_WithoutManifestYaml_ShouldSaveNullManifestConfig() throws Exception {
        // Arrange
        String mdContent = "# Behavior Instructions";
        byte[] zipBytes = createMockZip(mdContent, null);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "agent.zip",
                "application/zip",
                zipBytes
        );

        UUID tenantId = UUID.randomUUID();
        User admin = new User();
        admin.setUsername("admin");

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(agentRepository.save(any(Agent.class))).thenAnswer(invocation -> {
            Agent savedAgent = invocation.getArgument(0);
            if (savedAgent.getId() == null) {
                savedAgent.setId(UUID.randomUUID());
            }
            return savedAgent;
        });

        // Act
        Agent result = agentService.createAgent("Simple Agent", file, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getSystemInstructions()).isEqualTo(mdContent);
        assertThat(result.getManifestConfig()).isNull();
    }
}
