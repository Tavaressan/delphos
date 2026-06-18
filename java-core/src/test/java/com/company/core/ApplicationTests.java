package com.company.core;

import com.company.core.domain.entities.Role;
import com.company.core.domain.entities.Permission;
import com.company.core.domain.repositories.RoleRepository;
import com.company.core.domain.repositories.PermissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
public class ApplicationTests {

    @Autowired
    private WebApplicationContext wac;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).build();
    }

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Test
    void contextLoads() {
        // Verification that Spring Context loads successfully and flyway migrations ran
    }

    @Test
    void testActuatorHealth() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void testSeedRolesAndPermissions() {
        // Validate ROLE_ADMIN and ROLE_USER are present
        Optional<Role> adminRoleOpt = roleRepository.findByName("ROLE_ADMIN");
        Optional<Role> userRoleOpt = roleRepository.findByName("ROLE_USER");

        assertThat(adminRoleOpt).isPresent();
        assertThat(userRoleOpt).isPresent();

        Role userRole = userRoleOpt.get();

        // Validate essential permissions exist
        Optional<Permission> writeDocsOpt = permissionRepository.findByName("WRITE_DOCUMENTS");
        Optional<Permission> readDocsOpt = permissionRepository.findByName("READ_DOCUMENTS");

        assertThat(writeDocsOpt).isPresent();
        assertThat(readDocsOpt).isPresent();

        // Verify standard role-permission mapping
        boolean hasReadDocs = userRole.getPermissions().stream()
                .anyMatch(p -> p.getName().equals("READ_DOCUMENTS"));
        assertThat(hasReadDocs).isTrue();
    }
}
