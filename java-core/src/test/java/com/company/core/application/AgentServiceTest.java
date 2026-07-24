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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
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
    private AgentCustomToolRepository agentCustomToolRepository;
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
        agentCustomToolRepository = Mockito.mock(AgentCustomToolRepository.class);
        minioClient = Mockito.mock(MinioClient.class);
        rabbitTemplate = Mockito.mock(RabbitTemplate.class);
        objectMapper = Mockito.mock(ObjectMapper.class);
        auditService = Mockito.mock(AuditService.class);

        agentService = new AgentService(
                agentRepository,
                documentRepository,
                userRepository,
                agentCustomToolRepository,
                minioClient,
                rabbitTemplate,
                objectMapper,
                auditService
        );

        when(agentCustomToolRepository.save(any(AgentCustomTool.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private byte[] createMockZip(String mdContent, String yamlContent) throws Exception {
        return createMockZip(mdContent, yamlContent, null);
    }

    private byte[] createMockZip(String mdContent, String yamlContent, Map<String, String> toolsScripts) throws Exception {
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
            if (toolsScripts != null) {
                for (Map.Entry<String, String> toolEntry : toolsScripts.entrySet()) {
                    ZipEntry entry = new ZipEntry("tools/" + toolEntry.getKey());
                    zos.putNextEntry(entry);
                    zos.write(toolEntry.getValue().getBytes(StandardCharsets.UTF_8));
                    zos.closeEntry();
                }
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
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> {
            Document savedDoc = invocation.getArgument(0);
            if (savedDoc.getId() == null) {
                savedDoc.setId(UUID.randomUUID());
            }
            return savedDoc;
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
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> {
            Document savedDoc = invocation.getArgument(0);
            if (savedDoc.getId() == null) {
                savedDoc.setId(UUID.randomUUID());
            }
            return savedDoc;
        });

        // Act
        Agent result = agentService.createAgent("Simple Agent", file, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getSystemInstructions()).isEqualTo(mdContent);
        assertThat(result.getManifestConfig()).isNull();
    }

    @Test
    void updateAgentPackage_replacesInstructionsAndManifestOfExistingAgent() throws Exception {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        Agent existingAgent = new Agent();
        existingAgent.setId(UUID.randomUUID());
        existingAgent.setName("Agente Existente");
        existingAgent.setTenantId(tenantId);
        existingAgent.setSystemInstructions("instrucoes antigas");

        String newMdContent = "# Novas instrucoes";
        String newYamlContent = "schema_version: 2";
        byte[] zipBytes = createMockZip(newMdContent, newYamlContent);

        MockMultipartFile file = new MockMultipartFile(
                "file", "agent.zip", "application/zip", zipBytes);

        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());
        when(agentRepository.save(any(Agent.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> {
            Document savedDoc = invocation.getArgument(0);
            if (savedDoc.getId() == null) {
                savedDoc.setId(UUID.randomUUID());
            }
            return savedDoc;
        });

        // Act
        Agent result = agentService.updateAgentPackage(existingAgent, file);

        // Assert
        assertThat(result.getSystemInstructions()).isEqualTo(newMdContent);
        assertThat(result.getManifestConfig()).isEqualTo(newYamlContent);
        assertThat(result.getZipPath()).contains(existingAgent.getId().toString());
    }

    @Test
    void updateAgentPackage_withoutManifestYaml_preservesExistingManifestConfig() throws Exception {
        // Arrange (issue #303) - manifest.yaml é opcional; reenviar um pacote sem manifest
        // não deve apagar um manifestConfig previamente configurado.
        UUID tenantId = UUID.randomUUID();
        Agent existingAgent = new Agent();
        existingAgent.setId(UUID.randomUUID());
        existingAgent.setName("Agente Existente");
        existingAgent.setTenantId(tenantId);
        existingAgent.setSystemInstructions("instrucoes antigas");
        existingAgent.setManifestConfig("schema_version: 1\ntools:\n  - name: search_knowledge_base");

        String newMdContent = "# Novas instrucoes sem manifest";
        byte[] zipBytes = createMockZip(newMdContent, null);

        MockMultipartFile file = new MockMultipartFile(
                "file", "agent.zip", "application/zip", zipBytes);

        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());
        when(agentRepository.save(any(Agent.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> {
            Document savedDoc = invocation.getArgument(0);
            if (savedDoc.getId() == null) {
                savedDoc.setId(UUID.randomUUID());
            }
            return savedDoc;
        });

        // Act
        Agent result = agentService.updateAgentPackage(existingAgent, file);

        // Assert
        assertThat(result.getSystemInstructions()).isEqualTo(newMdContent);
        assertThat(result.getManifestConfig())
                .isEqualTo("schema_version: 1\ntools:\n  - name: search_knowledge_base");
    }

    @Test
    void createAgent_WithToolsFolder_PersistsCustomToolsPerScript() throws Exception {
        // Arrange (issue #129)
        String mdContent = "# Behavior Instructions";
        Map<String, String> tools = Map.of(
                "sum_values.py", "def run(values):\n    return sum(values)\n",
                "format_report.py", "import json\n\ndef run(data):\n    return json.dumps(data)\n"
        );
        byte[] zipBytes = createMockZip(mdContent, null, tools);

        MockMultipartFile file = new MockMultipartFile(
                "file", "agent.zip", "application/zip", zipBytes);

        UUID tenantId = UUID.randomUUID();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());
        when(agentRepository.save(any(Agent.class))).thenAnswer(invocation -> {
            Agent savedAgent = invocation.getArgument(0);
            if (savedAgent.getId() == null) {
                savedAgent.setId(UUID.randomUUID());
            }
            return savedAgent;
        });
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> {
            Document savedDoc = invocation.getArgument(0);
            if (savedDoc.getId() == null) {
                savedDoc.setId(UUID.randomUUID());
            }
            return savedDoc;
        });

        // Act
        Agent result = agentService.createAgent("Agente com Tools", file, tenantId);

        // Assert
        assertThat(result).isNotNull();
        org.mockito.ArgumentCaptor<AgentCustomTool> captor = org.mockito.ArgumentCaptor.forClass(AgentCustomTool.class);
        org.mockito.Mockito.verify(agentCustomToolRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        List<AgentCustomTool> saved = captor.getAllValues();
        assertThat(saved).extracting(AgentCustomTool::getToolName)
                .containsExactlyInAnyOrder("sum_values", "format_report");
        assertThat(saved).allMatch(t -> t.getAgent() == result);
    }

    @Test
    void createAgent_WithoutToolsFolder_PersistsNoCustomTools() throws Exception {
        // Arrange (retrocompatibilidade - issue #129)
        String mdContent = "# Behavior Instructions";
        byte[] zipBytes = createMockZip(mdContent, null);

        MockMultipartFile file = new MockMultipartFile(
                "file", "agent.zip", "application/zip", zipBytes);

        UUID tenantId = UUID.randomUUID();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());
        when(agentRepository.save(any(Agent.class))).thenAnswer(invocation -> {
            Agent savedAgent = invocation.getArgument(0);
            if (savedAgent.getId() == null) {
                savedAgent.setId(UUID.randomUUID());
            }
            return savedAgent;
        });
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> {
            Document savedDoc = invocation.getArgument(0);
            if (savedDoc.getId() == null) {
                savedDoc.setId(UUID.randomUUID());
            }
            return savedDoc;
        });

        // Act
        agentService.createAgent("Agente sem Tools", file, tenantId);

        // Assert
        org.mockito.Mockito.verify(agentCustomToolRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void createAgent_WithInvalidToolFileName_ThrowsIllegalArgumentException() throws Exception {
        // Arrange (issue #129) - nome derivado do arquivo deve ser um identificador seguro
        String mdContent = "# Behavior Instructions";
        Map<String, String> tools = Map.of("1 bad name!.py", "def run():\n    pass\n");
        byte[] zipBytes = createMockZip(mdContent, null, tools);

        MockMultipartFile file = new MockMultipartFile(
                "file", "agent.zip", "application/zip", zipBytes);

        UUID tenantId = UUID.randomUUID();

        // Act & Assert
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> agentService.createAgent("Agente Invalido", file, tenantId))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
