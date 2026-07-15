# Infrastructure, Tarefas de Implementação

> Template do arquivo `tasks.md`. Foca em uma sequência de tarefas executáveis para reimplementar a unit a partir do legado, com rastreabilidade ao código original.

## Tarefas

- [ ] T-01, Docker Compose Central
  - Origem no legado: `docker-compose.yml`
  - Critério de pronto: Todos os serviços mapeados com as networks corretas.
  - Confiança: 🟢

- [ ] T-02, Inicialização Banco com Vetores
  - Origem no legado: `infrastructure/postgres/`
  - Critério de pronto: Banco provisionado já cria as extensões na DB.
  - Confiança: 🟢

## Ordem Sugerida
1. Banco e Redes (T-02).
2. Orquestração Compose (T-01).
