import React from 'react';
import { Input } from 'enterprise-rag-frontend';

export function Default() {
  return <Input placeholder="Buscar documentos…" />;
}

export function WithLabel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
      <div>
        <label className="label-alfabra">Nome da base de conhecimento</label>
        <Input placeholder="Ex.: Manuais de manutenção" defaultValue="Contratos 2025" />
      </div>
      <div>
        <label className="label-alfabra">E-mail corporativo</label>
        <Input type="email" placeholder="usuario@alfabra.com" />
      </div>
    </div>
  );
}

export function States() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
      <Input placeholder="Campo vazio" />
      <Input defaultValue="Valor preenchido" />
      <Input placeholder="Desabilitado" disabled />
    </div>
  );
}
