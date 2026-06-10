import fs from 'node:fs';
import path from 'node:path';

// Carregar variáveis do .env se existir
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      // Remover aspas simples/duplas se existirem
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

export const config = {
  dbUrl: process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@localhost:5432/${process.env.POSTGRES_DB || 'rag_db'}`,
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080',
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'mock',
  vertexAiApiKey: process.env.VERTEX_AI_API_KEY || '',
  vertexAiProjectId: process.env.GCP_PROJECT_ID || 'alfabra-platform',
  vertexAiRegion: process.env.GCP_LOCATION || 'us-central1'
};
