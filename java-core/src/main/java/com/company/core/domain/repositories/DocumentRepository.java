package com.company.core.domain.repositories;

import com.company.core.domain.entities.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByTenantId(UUID tenantId);
    Page<Document> findByTenantId(UUID tenantId, Pageable pageable);
    long countByLegacyUnknownTenantTrue();
}
