# Plano de Cutover e Transição de Produção

Este documento detalha o checklist de implantação final, a estratégia de transição segura de tráfego dos sistemas legados e os passos detalhados de validação e rollback caso ocorram falhas na implantação da **Enterprise Agent Operating Platform**.

---

## 1. Etapas Prévias ao Cutover (D - 3 a D - 1)
1. **Implantação de Infraestrutura Base (K8s / RabbitMQ / MinIO):** Configurar o ambiente Kubernetes produtivo e validar a resiliência do cluster de RabbitMQ.
2. **Execução de Migrações de Estrutura de Dados (Flyway):** Executar os scripts de migração estrutural no PostgreSQL de destino para criar as tabelas e índices vetoriais HNSW.
3. **Carga Inicial de Dados (Data Pre-Migration):** Executar o pipeline de migração de dados históricos do banco de dados MongoDB (MaxKB4j) e banco relacional legado (LibreChat) para o PostgreSQL unificado.
4. **Verificação de Sanitização de Dados:** Auditar se todos os usuários possuem senhas criptografadas sob o padrão BCrypt (senhas vazias ou no formato antigo MD5 devem ser invalidadas e forçadas a um fluxo de redefinição).

---

## 2. Janela de Execução do Cutover (Dia D)

### Passo 1: Bloqueio de Escrita nos Legados (Modo Read-Only)
- **Ação:** Colocar as APIs do LibreChat e MaxKB4j legadas em modo de manutenção/leitura-apenas (desabilitar endpoints de criação de chats, envio de mensagens e upload de documentos).
- **Tempo Previsto:** 10 minutos.

### Passo 2: Sincronização Final de Dados
- **Ação:** Executar a carga incremental final dos dados gerados entre a pré-migração e o bloqueio de escrita.
- **Tempo Previsto:** 15 minutos.

### Passo 3: Deploy do Spring Coordination e Workers no Kubernetes
- **Ação:** Ativar as réplicas do backend Java (`java-core`), microsserviços Rust de processamento e os Pods efêmeros dos workers Python (`crew-worker`) integrados ao RabbitMQ e KEDA.
- **Tempo Previsto:** 5 minutos.

### Passo 4: Validação de Conectividade Interna (Health Check)
- **Ação:** Disparar requisições para o endpoint `/healthz` de todos os microsserviços e validar se o status retornado é "OK". Verificar a conexão do gateway Caddy com os certificados TLS integrados ao DNS.
- **Tempo Previsto:** 5 minutos.

### Passo 5: Testes de Sanidade (Smoke Tests)
- **Ação:** Executar o script de testes de sanidade integrado validando os fluxos críticos de:
  - Criação de conta e login (com MFA e BCrypt).
  - Execução assíncrona de um agente especializado (validação de fluxo completo via RabbitMQ e CrewAI).
  - Consulta ao banco PostgreSQL vetorial via busca híbrida.
  - Gravação bem-sucedida de registros no `Audit Store` e `Memory Store`.
- **Tempo Previsto:** 10 minutos.

### Passo 6: Roteamento de Tráfego
- **Ação:** Atualizar as rotas do proxy reverso Caddy / Ingress Controller para direcionar o tráfego de produção do Next.js antigo para o Next.js moderno da nova plataforma.
- **Tempo Previsto:** 5 minutos.

---

## 3. Critérios de Go / No-Go
A transição será imediatamente interrompida e o plano de rollback será disparado se qualquer uma das seguintes situações ocorrer:
- **No-Go 1:** Falha de integridade na sincronização final de dados históricos (dados corrompidos ou chaves vetoriais duplicadas).
- **No-Go 2:** Falha em smoke tests críticos (ex: erro sistemático ao enviar tarefas cognitivas via RabbitMQ ou falha ao descriptografar tokens JWT no Spring Coordination Layer).
- **No-Go 3:** Tempo de resposta médio das consultas de busca vetorial HNSW no Postgres superior a 1500ms durante testes de carga de sanidade.

---

## 4. Plano de Rollback (Reversão Rápida)
Caso os critérios de No-Go sejam atingidos após a alteração de tráfego:
1. **Reverter DNS / Caddy:** Apontar as rotas de tráfego do proxy reverso Caddy de volta para as instâncias dos sistemas legados (LibreChat e MaxKB4j).
2. **Remover Bloqueio de Escrita:** Retirar o modo Read-Only dos sistemas legados para restabelecer a operação normal dos usuários na versão anterior.
3. **Isolar Novo Ambiente:** Colocar as filas do RabbitMQ e workers no Kubernetes em modo suspenso/inativo para investigação de causa raiz (logs coletados em `.logs/`).
