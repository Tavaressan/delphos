package com.company.core.interfaces.rest;

import com.company.core.application.AuditService;
import com.company.core.application.UserService;
import com.company.core.domain.entities.User;
import com.company.core.domain.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserService userService;
    @Mock
    private AuditService auditService;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        ObjectMapper objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders.standaloneSetup(
                new UserController(userRepository, userService, auditService)).build();
    }

    private User buildUser(UUID id) {
        User user = new User();
        user.setId(id);
        user.setUsername("vtavares");
        user.setEmail("vtavares@alfabra.com");
        user.setFirstName("Vitor");
        user.setLastName("Tavares");
        user.setStatus("ACTIVE");
        user.setTenantId(UUID.fromString("00000000-0000-0000-0000-000000000000"));
        user.setCreatedAt(Instant.parse("2026-01-01T10:00:00Z"));
        user.setLastLogin(Instant.parse("2026-07-01T09:00:00Z"));
        return user;
    }

    @Test
    void getMe_withKnownUser_returnsProfileWithCreatedAtAndLastLogin() throws Exception {
        UUID id = UUID.randomUUID();
        User user = buildUser(id);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/users/me").header("X-User-Id", id.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.lastLogin").exists());
    }

    @Test
    void getMe_withoutHeader_returns400() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getMe_withUnknownUser_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/users/me").header("X-User-Id", id.toString()))
                .andExpect(status().isNotFound());
    }

    @Test
    void patchMe_updatesFirstAndLastName() throws Exception {
        UUID id = UUID.randomUUID();
        User user = buildUser(id);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> body = new HashMap<>();
        body.put("firstName", "Novo");
        body.put("lastName", "Nome");
        body.put("jobTitle", "Engenheiro");

        mockMvc.perform(patch("/api/users/me")
                        .header("X-User-Id", id.toString())
                        .contentType("application/json")
                        .content(new ObjectMapper().writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Novo"))
                .andExpect(jsonPath("$.lastName").value("Nome"))
                .andExpect(jsonPath("$.jobTitle").value("Engenheiro"));
    }

    @Test
    void uploadAvatar_savesAndReturnsAvatarUrl() throws Exception {
        UUID id = UUID.randomUUID();
        User user = buildUser(id);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userService.uploadAvatar(any(), any())).thenReturn("http://minio/avatars/" + id + ".png");

        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", "fake-image-bytes".getBytes());

        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(file)
                        .header("X-User-Id", id.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value("http://minio/avatars/" + id + ".png"));
    }
}
