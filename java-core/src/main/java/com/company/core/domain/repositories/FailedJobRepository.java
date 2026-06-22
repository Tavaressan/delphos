package com.company.core.domain.repositories;

import com.company.core.domain.entities.FailedJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FailedJobRepository extends JpaRepository<FailedJob, UUID> {
    Page<FailedJob> findByTenantId(UUID tenantId, Pageable pageable);
    List<FailedJob> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);
}