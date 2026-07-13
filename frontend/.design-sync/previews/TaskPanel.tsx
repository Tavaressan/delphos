import React from 'react';
import { TaskPanel } from 'enterprise-rag-frontend';

export function Execution() {
  return (
    <div style={{ maxWidth: 380 }}>
      <TaskPanel
        tasks={[
          { id: 1, name: 'Analisar documento', status: 'completed', detail: '12 páginas processadas' },
          { id: 2, name: 'Gerar embeddings', status: 'completed' },
          { id: 3, name: 'Buscar contexto relevante', status: 'in_progress', detail: 'pgvector · top-k 8' },
          { id: 4, name: 'Compor resposta', status: 'pending' },
          { id: 5, name: 'Validar citações', status: 'failed', detail: 'fonte indisponível' },
        ]}
      />
    </div>
  );
}

export function Empty() {
  return (
    <div style={{ maxWidth: 380 }}>
      <TaskPanel tasks={[]} />
    </div>
  );
}
