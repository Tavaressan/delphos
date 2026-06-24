package com.company.core;

import io.cucumber.spring.CucumberContextConfiguration;
import org.flywaydb.core.Flyway;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.Map;

@CucumberContextConfiguration
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class CucumberSpringConfiguration {

    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("pgvector/pgvector:pg16")
                    .withDatabaseName("alfabra_test")
                    .withUsername("test")
                    .withPassword("test");

    static {
        postgres.start();
        // Flyway auto-configuration não roda neste contexto de teste (Spring Boot 4 + Flyway 12);
        // aplicamos as migrações manualmente antes de o ApplicationContext subir.
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .placeholders(Map.of("embedding.dimension", "768"))
                .baselineOnMigrate(true)
                .load()
                .migrate();
    }

    @DynamicPropertySource
    static void overrideDataSourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        // Desabilita o Flyway do Spring Boot para não rodar novamente
        registry.add("spring.flyway.enabled", () -> "false");
    }

    @MockitoBean
    RabbitTemplate rabbitTemplate;
}
