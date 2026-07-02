package com.company.core.interfaces.rest;

import com.company.core.domain.entities.AuditLog;
import com.company.core.domain.repositories.AuditLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Issue #84: endpoint de auditoria filtra obrigatoriamente por tenantId do
 * usuário autenticado, para que um admin de um tenant não consiga recuperar
 * logs de outro tenant. Não há hoje mecanismo de autenticação real
 * (SecurityConfig permite todas as requisições), então o tenantId é
 * derivado do parâmetro obrigatório da requisição -- seguindo o mesmo
 * padrão usado nos demais controllers deste módulo (AgentController,
 * DocumentController) até que a autenticação JWT seja implementada.
 */
@RestController
@RequestMapping("/api/admin/audit-logs")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<?> listAuditLogs(@RequestParam(value = "tenantId", required = false) String tenantIdStr) {
        if (tenantIdStr == null || tenantIdStr.isBlank()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "tenantId é obrigatório para listar logs de auditoria.");
            return ResponseEntity.badRequest().body(error);
        }

        UUID tenantId;
        try {
            tenantId = UUID.fromString(tenantIdStr);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "tenantId inválido.");
            return ResponseEntity.badRequest().body(error);
        }

        List<AuditLog> logs = auditLogRepository.findByTenantId(tenantId);
        List<Map<String, Object>> response = logs.stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> toResponse(AuditLog log) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", log.getId().toString());
        response.put("tenantId", log.getTenantId().toString());
        response.put("action", log.getAction());
        response.put("target", log.getTarget());
        response.put("createdAt", log.getCreatedAt());
        return response;
    }
}
