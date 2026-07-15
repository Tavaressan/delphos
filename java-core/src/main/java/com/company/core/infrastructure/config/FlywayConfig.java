package com.company.core.infrastructure.config;

import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {
    
    @Bean
    public FlywayMigrationStrategy repairOnMigrateStrategy() {
        return flyway -> {
            // Executa o repair para ajustar checksums no banco local
            flyway.repair();
             // Executa a migração normalmente
            flyway.migrate();
        };
    }
}
