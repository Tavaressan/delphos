package com.company.core.interfaces.rest;

import com.company.core.application.AuditService;
import com.company.core.domain.entities.Permission;
import com.company.core.domain.entities.Role;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;
import java.util.HashSet;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminUserControllerTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditService auditService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setup() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders.standaloneSetup(
                new AdminUserController(userRepository, auditService)).build();
    }

    private User buildAdminUser(UUID id, boolean hasPermission) {
        User user = new User();
        user.setId(id);
        user.setUsername("admin");
        
        if (hasPermission) {
            Role role = new Role();
            Permission perm = new Permission();
            perm.setName("MANAGE_USERS");
            role.setPermissions(new HashSet<>(Set.of(perm)));
            user.setRoles(new HashSet<>(Set.of(role)));
        }
        
        return user;
    }

    @Test
    void patchUserStatus_withPermission_updatesStatus() throws Exception {
        UUID adminId = UUID.randomUUID();
        User admin = buildAdminUser(adminId, true);
        
        UUID targetId = UUID.randomUUID();
        User targetUser = new User();
        targetUser.setId(targetId);
        targetUser.setStatus("ACTIVE");
        targetUser.setUsername("target");
        targetUser.setTenantId(UUID.randomUUID());

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> body = new HashMap<>();
        body.put("status", "INACTIVE");

        mockMvc.perform(patch("/api/admin/users/" + targetId + "/status")
                        .header("X-User-Id", adminId.toString())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));

        verify(auditService).logAction(any(), any(), any(), any());
    }

    @Test
    void patchUserStatus_withoutPermission_returns403() throws Exception {
        UUID adminId = UUID.randomUUID();
        User admin = buildAdminUser(adminId, false); // no permission
        
        UUID targetId = UUID.randomUUID();

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        Map<String, String> body = new HashMap<>();
        body.put("status", "INACTIVE");

        mockMvc.perform(patch("/api/admin/users/" + targetId + "/status")
                        .header("X-User-Id", adminId.toString())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());

        verify(userRepository, never()).save(any());
    }
}
