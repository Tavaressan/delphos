import React from 'react';
import { Badge } from 'enterprise-rag-frontend';

export function Variants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <Badge variant="primary">PRIMARY</Badge>
      <Badge variant="secondary">SECONDARY</Badge>
      <Badge variant="accent">ACCENT</Badge>
      <Badge variant="success">SUCCESS</Badge>
      <Badge variant="warning">WARNING</Badge>
      <Badge variant="danger">DANGER</Badge>
      <Badge variant="info">INFO</Badge>
    </div>
  );
}

export function StatusExamples() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <Badge variant="success">ONLINE</Badge>
      <Badge variant="danger">OFFLINE</Badge>
      <Badge variant="warning">PENDENTE</Badge>
      <Badge variant="primary">ROLE_ADMIN</Badge>
      <Badge variant="info">v2.4.3</Badge>
    </div>
  );
}
