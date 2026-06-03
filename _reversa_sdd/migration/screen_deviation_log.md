# Desvios de Interface (Screen Deviation Log)

Este documento registra as decisões de design e modificações estruturais feitas na interface do usuário (Next.js) em relação às telas de origem de **LibreChat** e **MaxKB4j**.

---

## Tabela de Desvios Estruturais Mapeados

| Tela / Recurso Original | Desvio na Nova Plataforma | Motivação Técnica | Status de Aprovação |
|---|---|---|---|
| **Formulário de Registro de Conta (LibreChat)** | Adicionado CAPTCHA obrigatório no formulário e delay de processamento em caso de colisão de e-mail. | Evitar varreduras e ataques de enumeração automatizada de contas em endpoints públicos de autenticação. | 🟢 CONFIRMADO |
| **Painel de Configuração Lateral (LibreChat)** | Removidas configurações de saldo local de créditos em formato de token local. | A cobrança e contabilização de tokens foram internalizadas na camada de coordenação Java (`java-core`), tornando a visualização de créditos dependente de requisições autenticadas. | 🟢 CONFIRMADO |
| **Barra Lateral de Histórico (MaxKB4j / LibreChat)** | Inclusão de aba para visualização rápida da extração dos 4 pilares da Memória de Longo Prazo do usuário. | Dar visibilidade ao usuário sobre quais preferências, contextos e metas estão ativamente influenciando as respostas dos agentes cognitivos. | 🟢 CONFIRMADO |
| **Console de Logs de Workflows (MaxKB4j)** | Tradução da interface de logs síncronos para uma timeline de eventos assíncronos baseada em eventos do RabbitMQ. | O MaxKB4j exibia logs gerados localmente em runtime síncrono. A nova arquitetura distribuída exige monitoramento de eventos distribuídos de início/fim de chamadas de ferramentas e buscas. | 🟢 CONFIRMADO |
