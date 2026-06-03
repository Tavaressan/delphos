# Fluxograma de Controle: java-core 🟢 **CONFIRMADO**

Este fluxograma ilustra o ciclo de inicialização do Spring Boot e o processo automático de migração/validação do esquema do banco de dados (Flyway & Hibernate).

```mermaid
flowchart TD
    Start([Execução do java-core Application.java]) --> MainCall[Chamar Application.mainArgs]
    MainCall --> SpringRun[SpringApplication.run]
    
    SpringRun --> LoadProperties[Carregar application.yml]
    LoadProperties --> ConnectDB[Inicializar Datasource PostgreSQL]
    
    ConnectDB --> FlywayCheck{spring.flyway.enabled == true?}
    FlywayCheck -->|Sim| RunFlyway[Executar Flyway Migrations db/migration/*]
    FlywayCheck -->|Não| HibernateCheck
    
    RunFlyway --> DatabaseMutations[Aplicar Tabelas, Índices e Seeds SQL]
    DatabaseMutations --> HibernateCheck
    
    HibernateCheck --> JPALoad[Carregar Hibernate JPA Context]
    JPALoad --> HibernateDDL{spring.jpa.hibernate.ddl-auto == validate?}
    
    HibernateDDL -->|Sim| ValidateSchema[Validar conformidade das Entidades com Banco]
    HibernateDDL -->|Não| AppReady
    
    ValidateSchema --> SchemaMatch{Schema coincide?}
    SchemaMatch -->|Sim| AppReady[Servidor Spring Boot Pronto - Porta 8080]
    SchemaMatch -->|Não| SchemaError[Lançar SchemaValidationException] --> Fail([Falha na Inicialização])
    
    AppReady --> End([Aguardando conexões HTTP REST])
```
