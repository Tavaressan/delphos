package com.company.core.domain.repositories;

import com.company.core.domain.entities.Document;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Tag("integration")
@Transactional
class DocumentRepositoryTest {

    @Autowired
    private DocumentRepository documentRepository;

    private Document buildDocument(UUID tenantId, boolean legacyUnknownTenant) {
        Document document = new Document();
        document.setName("doc.txt");
        document.setFilePath("documents/" + UUID.randomUUID() + "/doc.txt");
        document.setFileSize(10L);
        document.setFileType("txt");
        document.setStatus("PROCESSING");
        document.setTenantId(tenantId);
        document.setLegacyUnknownTenant(legacyUnknownTenant);
        return document;
    }

    @Test
    void findByTenantId_neverReturnsLegacyUnknownTenantDocuments() {
        UUID realTenant = UUID.randomUUID();
        UUID zeroTenant = UUID.fromString("00000000-0000-0000-0000-000000000000");

        documentRepository.save(buildDocument(realTenant, false));
        documentRepository.save(buildDocument(zeroTenant, true));

        List<Document> result = documentRepository.findByTenantId(realTenant);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).isLegacyUnknownTenant()).isFalse();
    }

    @Test
    void countByLegacyUnknownTenantTrue_countsOnlyFlaggedDocuments() {
        UUID realTenant = UUID.randomUUID();
        UUID zeroTenant = UUID.fromString("00000000-0000-0000-0000-000000000000");

        documentRepository.save(buildDocument(realTenant, false));
        documentRepository.save(buildDocument(zeroTenant, true));
        documentRepository.save(buildDocument(zeroTenant, true));

        long count = documentRepository.countByLegacyUnknownTenantTrue();

        assertThat(count).isEqualTo(2);
    }
}
