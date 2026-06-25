package com.company.core.interfaces.rest;

import com.company.core.application.AgentService;
import com.company.core.application.AuditService;
import com.company.core.domain.entities.Agent;
import com.company.core.domain.repositories.AgentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class AgentController {

    private final AgentService agentService;
    private final AgentRepository agentRepository;
    private final AuditService auditService;

    public AgentController(AgentService agentService, AgentRepository agentRepository, AuditService auditService) {
        this.agentService = agentService;
        this.agentRepository = agentRepository;
        this.auditService = auditService;
    }

    @PostMapping("/admin/agents")
    public ResponseEntity<?> createAgent(
            @RequestParam("name") String name,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "tenantId", required = false) String tenantIdStr) {
        try {
            UUID tenantId = (tenantIdStr != null && !tenantIdStr.isEmpty())
                    ? UUID.fromString(tenantIdStr)
                    : UUID.fromString("00000000-0000-0000-0000-000000000000");

            Agent agent = agentService.createAgent(name, file, tenantId);
            return ResponseEntity.ok(toResponse(agent));
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erro interno ao processar o agente: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/agents")
    public ResponseEntity<List<Agent>> listAgents(@RequestParam(value = "tenantId", required = false) String tenantIdStr) {
        UUID tenantId = (tenantIdStr != null && !tenantIdStr.isEmpty())
                ? UUID.fromString(tenantIdStr)
                : UUID.fromString("00000000-0000-0000-0000-000000000000");
        List<Agent> agents = agentRepository.findByTenantId(tenantId);
        return ResponseEntity.ok(agents);
    }

    @PutMapping("/admin/agents/{id}")
    public ResponseEntity<?> updateAgent(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        Agent agent = agentRepository.findById(id).orElse(null);
        if (agent == null) {
            return ResponseEntity.notFound().build();
        }

        if (body.containsKey("name") && body.get("name") != null && !body.get("name").isBlank()) {
            agent.setName(body.get("name").trim());
        }
        if (body.containsKey("description")) {
            agent.setDescription(body.get("description"));
        }
        if (body.containsKey("tag")) {
            agent.setTag(body.get("tag"));
        }
        if (body.containsKey("version")) {
            agent.setVersion(body.get("version"));
        }
        if (body.containsKey("systemInstructions")) {
            agent.setSystemInstructions(body.get("systemInstructions"));
        }

        agent.setUpdatedAt(Instant.now());
        agent = agentRepository.save(agent);
        auditService.logAction("UPDATE_AGENT", "Agent: " + agent.getName(), "{\"agentId\":\"" + agent.getId() + "\"}");

        return ResponseEntity.ok(toResponse(agent));
    }

    @PatchMapping("/admin/agents/{id}/publish")
    public ResponseEntity<?> publishAgent(@PathVariable UUID id) {
        return changeStatus(id, "PUBLISHED", "PUBLISH_AGENT");
    }

    @PatchMapping("/admin/agents/{id}/deactivate")
    public ResponseEntity<?> deactivateAgent(@PathVariable UUID id) {
        return changeStatus(id, "INACTIVE", "DEACTIVATE_AGENT");
    }

    private ResponseEntity<?> changeStatus(UUID id, String newStatus, String auditAction) {
        Agent agent = agentRepository.findById(id).orElse(null);
        if (agent == null) {
            return ResponseEntity.notFound().build();
        }
        agent.setStatus(newStatus);
        agent.setUpdatedAt(Instant.now());
        agent = agentRepository.save(agent);
        auditService.logAction(auditAction, "Agent: " + agent.getName(), "{\"agentId\":\"" + agent.getId() + "\"}");
        return ResponseEntity.ok(toResponse(agent));
    }

    private Map<String, Object> toResponse(Agent agent) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", agent.getId().toString());
        response.put("name", agent.getName());
        response.put("systemInstructions", agent.getSystemInstructions());
        response.put("zipPath", agent.getZipPath());
        response.put("tenantId", agent.getTenantId().toString());
        response.put("status", agent.getStatus());
        response.put("version", agent.getVersion());
        response.put("tag", agent.getTag());
        response.put("description", agent.getDescription());
        return response;
    }
}
