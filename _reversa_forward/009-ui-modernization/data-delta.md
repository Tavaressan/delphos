# Data Delta: Modernização da UI/UX da Plataforma Corporativa Alfabra

> Identificador: `009-ui-modernization`
> Data: `2026-06-11`
> Documento principal: `_reversa_forward/009-ui-modernization/roadmap.md`

## 1. Persistência de Dados no Backend

Esta feature **não altera** o banco de dados relacional PostgreSQL do backend (tabelas, esquemas ou triggers). Nenhum novo serviço de banco de dados ou migração via Flyway/Liquibase é requerido.

---

## 2. Persistência de Dados no Cliente (Browser Storage)

Para suportar o tema persistente de modo a carregar as preferências do usuário automaticamente entre sessões e recarregamentos de página, a plataforma utilizará a API de armazenamento local do navegador (`localStorage`).

### Especificação da Chave de Armazenamento

* **Chave:** `theme`
* **Local de Gravação:** `localStorage` do navegador do cliente.
* **Valores Aceitos:**
  * `"dark"`: Ativa o modo escuro (paleta de cores escura industrial).
  * `"light"`: Ativa o modo claro (paleta de cores clara técnica padrão).
* **Ciclo de Vida:** Persistente por tempo indefinido até que o usuário clique no botão para alternar o tema ou limpe os dados do navegador manualmente.

### Comportamento Padrão (Fallback)

Caso a chave `theme` não esteja definida no `localStorage` do usuário (primeira visita ao sistema), o sistema deve:
1. Detectar a preferência de esquema de cores do sistema operacional do usuário através da Media Query `window.matchMedia('(prefers-color-scheme: dark)')`.
2. Se a preferência do sistema operacional for escura, aplicar o tema `"dark"`.
3. Caso contrário, aplicar o tema `"light"` por padrão.
