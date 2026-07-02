package com.company.core.interfaces.rest;

import com.company.core.application.AuditService;
import com.company.core.application.UserService;
import com.company.core.domain.entities.Role;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
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

    private final UserRepository userRepository;
    private final UserService userService;
    private final AuditService auditService;

    public UserController(UserRepository userRepository, UserService userService, AuditService auditService) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.auditService = auditService;
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
        return userRepository.findById(userId);
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
