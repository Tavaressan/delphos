package com.company.core.application;

import com.company.core.domain.entities.AuditLog;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.AuditLogRepository;
import com.company.core.domain.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void logAction(String action, String target, String detailsJson) {
        log.info("Audit Log: action={}, target={}, details={}", action, target, detailsJson);
        try {
            User adminUser = userRepository.findByUsername("admin").orElse(null);

            AuditLog auditLog = new AuditLog();
            auditLog.setUser(adminUser);
            auditLog.setAction(action);
            auditLog.setTarget(target);
            auditLog.setIpAddress("127.0.0.1");
            auditLog.setUserAgent("System/Core");
            auditLog.setDetails(detailsJson);

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to persist audit log", e);
        }
    }
}
