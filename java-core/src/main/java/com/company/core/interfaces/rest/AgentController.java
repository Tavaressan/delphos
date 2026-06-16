package com.company.core.interfaces.rest;

import com.company.core.application.AgentService;
import com.company.core.domain.entities.Agent;
import com.company.core.domain.repositories.AgentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class AgentController {

    private final AgentService agentService;
    private final AgentRepository agentRepository;

    public AgentController(AgentService agentService, AgentRepository agentRepository) {
        this.agentService = agentService;
        this.agentRepository = agentRepository;
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
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", agent.getId().toString());
            response.put("name", agent.getName());
            response.put("systemInstructions", agent.getSystemInstructions());
            response.put("zipPath", agent.getZipPath());
            response.put("tenantId", agent.getTenantId().toString());
            
            return ResponseEntity.ok(response);
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
}
