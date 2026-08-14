-- V18__agent_executions_version.sql - Suporte a bloqueio otimista via @Version em AgentExecution (issue #267)

ALTER TABLE agent_executions ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
