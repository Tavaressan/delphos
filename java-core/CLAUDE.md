# java-core — Claude Code Context

## Migrações de Banco de Dados
Após adicionar ou editar uma migração do Flyway (por exemplo, V7), sempre verifique se a migração foi incluída no JAR gerado e se é realmente executada (confirme se o esquema/tabela existe) antes de declarar o serviço como saudável. Limpe o cache de build caso a migração esteja ausente.
