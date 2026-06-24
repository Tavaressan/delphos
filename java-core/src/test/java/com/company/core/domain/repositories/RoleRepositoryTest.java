package com.company.core.domain.repositories;

import com.company.core.domain.entities.Permission;
import com.company.core.domain.entities.Role;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Tag("integration")
@Transactional
class RoleRepositoryTest {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Test
    void findByName_returnsEmptyWhenRoleDoesNotExist() {
        Optional<Role> result = roleRepository.findByName("ROLE_INEXISTENTE");
        assertThat(result).isEmpty();
    }

    @Test
    void findByName_returnsRoleWhenExists() {
        Role role = new Role();
        role.setName("ROLE_ADMIN");
        role.setDescription("Administrador");
        roleRepository.save(role);

        Optional<Role> result = roleRepository.findByName("ROLE_ADMIN");
        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("ROLE_ADMIN");
        assertThat(result.get().getDescription()).isEqualTo("Administrador");
    }

    @Test
    void save_persistsRoleWithGeneratedId() {
        Role role = new Role();
        role.setName("ROLE_USER");
        Role saved = roleRepository.save(role);

        assertThat(saved.getId()).isNotNull();
        assertThat(roleRepository.findById(saved.getId())).isPresent();
    }

    @Test
    void role_canHavePermissionsAssociated() {
        Permission permission = new Permission();
        permission.setName("READ_DOCUMENTS");
        permissionRepository.save(permission);

        Role role = new Role();
        role.setName("ROLE_READER");
        role.setPermissions(Set.of(permission));
        roleRepository.save(role);

        Optional<Role> loaded = roleRepository.findByName("ROLE_READER");
        assertThat(loaded).isPresent();
        assertThat(loaded.get().getPermissions())
                .extracting(Permission::getName)
                .containsExactly("READ_DOCUMENTS");
    }
}
