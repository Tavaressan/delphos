package com.company.core.interfaces.rest;

import com.company.core.domain.entities.Agent;
import com.company.core.domain.entities.Conversation;
import com.company.core.domain.entities.Message;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.AgentRepository;
import com.company.core.domain.repositories.ConversationRepository;
import com.company.core.domain.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chats")
public class ChatController {

    private final ConversationRepository conversationRepository;
    private final AgentRepository agentRepository;
    private final UserRepository userRepository;

    public ChatController(ConversationRepository conversationRepository,
                          AgentRepository agentRepository,
                          UserRepository userRepository) {
        this.conversationRepository = conversationRepository;
        this.agentRepository = agentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Conversation>> listConversations(
            @RequestParam(value = "tenantId", required = false) String tenantIdStr) {
        UUID tenantId = (tenantIdStr != null && !tenantIdStr.isEmpty()) 
                ? UUID.fromString(tenantIdStr) 
                : UUID.fromString("00000000-0000-0000-0000-000000000000");
        List<Conversation> conversations = conversationRepository.findByTenantId(tenantId);
        return ResponseEntity.ok(conversations);
    }

    @PostMapping
    public ResponseEntity<?> createConversation(@RequestBody Map<String, String> request) {
        try {
            String title = request.getOrDefault("title", "Nova Conversa");
            String tenantStr = request.get("tenantId");
            UUID tenantId = (tenantStr != null) ? UUID.fromString(tenantStr) : UUID.fromString("00000000-0000-0000-0000-000000000000");
            
            String agentIdStr = request.get("agentId");
            Agent agent = null;
            if (agentIdStr != null && !agentIdStr.isEmpty()) {
                agent = agentRepository.findById(UUID.fromString(agentIdStr)).orElse(null);
            }

            User user = userRepository.findByUsername("admin").orElseGet(() -> {
                User defaultUser = new User();
                defaultUser.setUsername("admin");
                defaultUser.setEmail("admin@company.com");
                defaultUser.setPasswordHash("no-pass-hash");
                defaultUser.setFirstName("Admin");
                defaultUser.setLastName("User");
                return userRepository.save(defaultUser);
            });

            Conversation conversation = new Conversation();
            conversation.setUser(user);
            conversation.setTenantId(tenantId);
            conversation.setTitle(title);
            conversation.setAgent(agent);
            
            conversation = conversationRepository.save(conversation);
            return ResponseEntity.ok(conversation);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<Message>> getMessages(@PathVariable UUID id) {
        Conversation conversation = conversationRepository.findById(id).orElse(null);
        if (conversation == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(conversation.getMessages());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable UUID id) {
        if (!conversationRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        conversationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
