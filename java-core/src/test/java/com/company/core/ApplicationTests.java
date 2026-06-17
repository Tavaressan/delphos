package com.company.core;

import com.company.core.domain.entities.Role;
import com.company.core.domain.entities.Permission;
import com.company.core.domain.repositories.RoleRepository;
import com.company.core.domain.repositories.PermissionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class ApplicationTests {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Test
    void contextLoads() {
        // Verification that Spring Context loads successfully and flyway migrations ran
    }

    @Test
    @SuppressWarnings("unchecked")
    void testActuatorHealth() {
        String url = "http://localhost:" + port + "/actuator/health";
        ResponseEntity<Map<String, Object>> response = (ResponseEntity<Map<String, Object>>)(ResponseEntity<?>)restTemplate.getForEntity(url, Map.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("status")).isEqualTo("UP");
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
