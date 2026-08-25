package com.company.core.interfaces.rest;

import com.company.core.application.AuditService;
import com.company.core.application.UserService;
import com.company.core.domain.entities.Role;
import com.company.core.domain.entities.User;
import com.company.core.domain.entities.UserSession;
import com.company.core.domain.repositories.UserRepository;
import com.company.core.domain.repositories.UserSessionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final int MIN_PASSWORD_LENGTH = 8;

    private final UserRepository userRepository;
    private final UserService userService;
    private final AuditService auditService;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, UserService userService, AuditService auditService,
                           UserSessionRepository userSessionRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.auditService = auditService;
        this.userSessionRepository = userSessionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        Optional<User> userOpt = resolveUser(userIdHeader);
        if (userOpt == null) {
            return badRequest("Header X-User-Id é obrigatório.");
        }
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toResponse(userOpt.get()));
    }

    @PatchMapping("/me")
    public ResponseEntity<?> patchMe(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestBody Map<String, String> body) {
        Optional<User> userOpt = resolveUser(userIdHeader);
        if (userOpt == null) {
            return badRequest("Header X-User-Id é obrigatório.");
        }
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        if (body.containsKey("firstName")) {
            user.setFirstName(body.get("firstName"));
        }
        if (body.containsKey("lastName")) {
            user.setLastName(body.get("lastName"));
        }
        if (body.containsKey("jobTitle")) {
            user.setJobTitle(body.get("jobTitle"));
        }
        if (body.containsKey("email") && body.get("email") != null && !body.get("email").isBlank()) {
            user.setEmail(body.get("email").trim());
        }
        user.setUpdatedAt(Instant.now());
        user = userRepository.save(user);
        auditService.logAction("UPDATE_PROFILE", "User: " + user.getUsername(), "{\"userId\":\"" + user.getId() + "\"}", user.getTenantId());

        return ResponseEntity.ok(toResponse(user));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam("file") MultipartFile file) {
        Optional<User> userOpt = resolveUser(userIdHeader);
        if (userOpt == null) {
            return badRequest("Header X-User-Id é obrigatório.");
        }
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        try {
            String avatarUrl = userService.uploadAvatar(user.getId(), file);
            user.setAvatarUrl(avatarUrl);
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
            auditService.logAction("UPDATE_AVATAR", "User: " + user.getUsername(), "{\"userId\":\"" + user.getId() + "\"}", user.getTenantId());

            Map<String, Object> response = new HashMap<>();
            response.put("avatarUrl", avatarUrl);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erro ao enviar avatar: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @PatchMapping("/me/password")
    public ResponseEntity<?> patchPassword(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestBody Map<String, String> body) {
        Optional<User> userOpt = resolveUser(userIdHeader);
        if (userOpt == null) {
            return badRequest("Header X-User-Id é obrigatório.");
        }
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || currentPassword.isBlank()) {
            return badRequest("Senha atual é obrigatória.");
        }
        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) {
            return badRequest("A nova senha deve ter ao menos " + MIN_PASSWORD_LENGTH + " caracteres.");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return badRequest("Senha atual incorreta.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        auditService.logAction("CHANGE_PASSWORD", "User: " + user.getUsername(), "{\"userId\":\"" + user.getId() + "\"}", user.getTenantId());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Senha alterada com sucesso.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me/sessions")
    public ResponseEntity<?> getSessions(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        Optional<User> userOpt = resolveUser(userIdHeader);
        if (userOpt == null) {
            return badRequest("Header X-User-Id é obrigatório.");
        }
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<Map<String, Object>> sessions = userSessionRepository.findByUserId(userOpt.get().getId())
                .stream()
                .map(this::toSessionResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(sessions);
    }

    @DeleteMapping("/me/sessions")
    public ResponseEntity<?> deleteSessions(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam(value = "keepSessionId", required = false) String keepSessionIdStr) {
        Optional<User> userOpt = resolveUser(userIdHeader);
        if (userOpt == null) {
            return badRequest("Header X-User-Id é obrigatório.");
        }
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UUID userId = userOpt.get().getId();
        if (keepSessionIdStr != null && !keepSessionIdStr.isBlank()) {
            UUID keepSessionId;
            try {
                keepSessionId = UUID.fromString(keepSessionIdStr);
            } catch (IllegalArgumentException e) {
                return badRequest("keepSessionId inválido.");
            }
            userSessionRepository.deleteByUserIdAndIdNot(userId, keepSessionId);
        } else {
            userSessionRepository.deleteByUserId(userId);
        }

        auditService.logAction("REVOKE_SESSIONS", "User: " + userOpt.get().getUsername(), "{\"userId\":\"" + userId + "\"}", userOpt.get().getTenantId());
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toSessionResponse(UserSession session) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", session.getId().toString());
        response.put("userAgent", session.getUserAgent());
        response.put("ipAddress", session.getIpAddress());
        response.put("createdAt", session.getCreatedAt());
        response.put("lastActiveAt", session.getLastActiveAt());
        return response;
    }

    /**
     * Resolve o usuário a partir do header X-User-Id.
     * Retorna null se o header estiver ausente/inválido (400),
     * Optional.empty() se o usuário não existir (404).
     */
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
        response.put("jobTitle", user.getJobTitle());
        response.put("avatarUrl", user.getAvatarUrl());
        response.put("status", user.getStatus());
        response.put("tenantId", user.getTenantId() != null ? user.getTenantId().toString() : null);
        response.put("createdAt", user.getCreatedAt());
        response.put("lastLogin", user.getLastLogin());
        response.put("roles", user.getRoles().stream().map(Role::getName).collect(Collectors.toList()));
        return response;
    }
}
