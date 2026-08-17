package com.company.core.interfaces.rest;

import com.company.core.domain.entities.AuditLog;
import com.company.core.domain.repositories.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Issue #243: AuditController.listAuditLogs deve aceitar Pageable e delegar
 * para AuditLogRepository.findByTenantId(tenantId, pageable), seguindo o
 * mesmo padrão de FailedJobController. AuditControllerIT (tag "integration")
 * cobre o comportamento de isolamento por tenant contra um banco real; esta
 * classe cobre a paginação em isolamento (repositório mockado).
 */
class AuditControllerTest {

    private AuditLogRepository auditLogRepository;
    private AuditController auditController;

    @BeforeEach
    void setUp() {
        auditLogRepository = Mockito.mock(AuditLogRepository.class);
        auditController = new AuditController(auditLogRepository);
    }

    @Test
    void listAuditLogs_WithoutTenantId_ShouldReturnBadRequestAndNeverQueryRepository() {
        ResponseEntity<?> response = auditController.listAuditLogs(null, Pageable.unpaged());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void listAuditLogs_withMoreRecordsThanPageSize_returnsPaginatedResponse() {
        UUID tenantId = UUID.randomUUID();
        int pageSize = 20;
        int totalElements = 25;

        List<AuditLog> pageContent = new ArrayList<>();
        for (int i = 0; i < pageSize; i++) {
            AuditLog log = new AuditLog();
            log.setId(UUID.randomUUID());
            log.setTenantId(tenantId);
            log.setAction("CREATE_AGENT");
            log.setTarget("Agent " + i);
            pageContent.add(log);
        }

        Pageable defaultPageable = PageRequest.of(0, pageSize);
        when(auditLogRepository.findByTenantId(eq(tenantId), eq(defaultPageable)))
                .thenReturn(new PageImpl<>(pageContent, defaultPageable, totalElements));

        ResponseEntity<?> response = auditController.listAuditLogs(tenantId.toString(), defaultPageable);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Page<Map<String, Object>> body = (Page<Map<String, Object>>) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getContent()).hasSize(pageSize);
        assertThat(body.getTotalElements()).isEqualTo(totalElements);
        assertThat(body.getSize()).isEqualTo(pageSize);
        assertThat(body.getNumber()).isEqualTo(0);
        assertThat(body.getContent().get(0).get("action")).isEqualTo("CREATE_AGENT");
    }
}
