package com.company.core.interfaces.rest;

import com.company.core.application.AuditService;
import com.company.core.domain.entities.Role;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final AuditService auditService;

    public AdminUserController(UserRepository userRepository, AuditService auditService) {
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> patchUserStatus(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        
        Optional<User> adminOpt = resolveUser(userIdHeader);
        if (adminOpt == null) {
            return badRequest("Header X-User-Id é obrigatório.");
        }
        if (adminOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User admin = adminOpt.get();
        boolean hasPermission = admin.getRoles().stream()
            .flatMap(role -> role.getPermissions().stream())
            .anyMatch(p -> p.getName().equals("MANAGE_USERS"));

        if (!hasPermission) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Access Denied");
            return ResponseEntity.status(403).body(error);
        }

        Optional<User> targetOpt = userRepository.findById(id);
        if (targetOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User target = targetOpt.get();
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
             return badRequest("status é obrigatório.");
        }
        if (!newStatus.equals("ACTIVE") && !newStatus.equals("INACTIVE")) {
             return badRequest("status inválido.");
        }

        target.setStatus(newStatus);
        target.setUpdatedAt(Instant.now());
        userRepository.save(target);

        auditService.logAction("CHANGE_USER_STATUS", "User: " + target.getUsername(), "{\"userId\":\"" + target.getId() + "\", \"status\":\"" + newStatus + "\"}", target.getTenantId());

        return ResponseEntity.ok(toResponse(target));
    }

    private Optional<User> resolveUser(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return null;
        }
        UUID userId;
        try {
            userId = UUID.fromString(userIdHeader);
        } catch (IllegalArgumentException e) {
            return null;
        }
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent() && "INACTIVE".equals(userOpt.get().getStatus())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Usuário inativo.");
        }
        return userOpt;
    }

    private ResponseEntity<?> badRequest(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", message);
        return ResponseEntity.badRequest().body(error);
    }

    private Map<String, Object> toResponse(User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId().toString());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("firstName", user.getFirstName());
        response.put("lastName", user.getLastName());
        response.put("status", user.getStatus());
        response.put("tenantId", user.getTenantId() != null ? user.getTenantId().toString() : null);
        response.put("createdAt", user.getCreatedAt());
        response.put("roles", user.getRoles().stream().map(Role::getName).collect(Collectors.toList()));
        return response;
    }
}
