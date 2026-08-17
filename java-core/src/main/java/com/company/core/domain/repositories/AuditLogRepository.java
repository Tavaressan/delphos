package com.company.core.domain.repositories;

import com.company.core.domain.entities.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByTenantId(UUID tenantId);
    Page<AuditLog> findByTenantId(UUID tenantId, Pageable pageable);
}
