-- init.sql - Minimal DB initialization for PostgreSQL
-- Pre-loads extensions required for corporate RAG and UUID generation

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
