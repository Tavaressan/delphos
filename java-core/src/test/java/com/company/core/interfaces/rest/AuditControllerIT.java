package com.company.core.interfaces.rest;

import com.company.core.domain.entities.AuditLog;
import com.company.core.domain.repositories.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Issue #84: um admin do tenant A não pode recuperar logs de auditoria do
 * tenant B via /api/admin/audit-logs.
 */
@SpringBootTest
@Tag("integration")
@Transactional
public class AuditControllerIT {

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).build();
    }

    @Test
    void listAuditLogs_returnsOnlyLogsBelongingToRequestedTenant() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();

        AuditLog logTenantA = new AuditLog();
        logTenantA.setTenantId(tenantA);
        logTenantA.setAction("CREATE_AGENT");
        logTenantA.setTarget("Agent: Tenant A Agent");
        auditLogRepository.save(logTenantA);

        AuditLog logTenantB = new AuditLog();
        logTenantB.setTenantId(tenantB);
        logTenantB.setAction("CREATE_AGENT");
        logTenantB.setTarget("Agent: Tenant B Agent");
        auditLogRepository.save(logTenantB);

        mockMvc.perform(get("/api/admin/audit-logs").param("tenantId", tenantA.toString()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Tenant A Agent")))
                .andExpect(content().string(not(containsString("Tenant B Agent"))));
    }

    @Test
    void listAuditLogs_withoutTenantId_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isBadRequest());
    }
}
