import React from 'react';
import { Button } from 'enterprise-rag-frontend';
import { Terminal, Trash2, Download } from 'lucide-react';

export function Variants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button variant="primary">Executar Agente</Button>
      <Button variant="secondary">Cancelar</Button>
      <Button variant="accent">Conectar</Button>
      <Button variant="danger">Excluir</Button>
      <Button variant="ghost">Ver detalhes</Button>
    </div>
  );
}

export function WithIcons() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button variant="primary"><Terminal className="w-4 h-4" /> Novo Console</Button>
      <Button variant="secondary"><Download className="w-4 h-4" /> Exportar</Button>
      <Button variant="danger"><Trash2 className="w-4 h-4" /> Remover base</Button>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Button variant="primary" disabled>Processando…</Button>
      <Button variant="secondary" disabled>Indisponível</Button>
    </div>
  );
}
