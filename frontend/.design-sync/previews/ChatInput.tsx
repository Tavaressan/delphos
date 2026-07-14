import React from 'react';
import { ChatInput } from 'enterprise-rag-frontend';

const noop = () => {};
const stop = (e: React.FormEvent) => e.preventDefault();

export function Empty() {
  return <ChatInput value="" onChange={noop} onSubmit={stop} />;
}

export function WithText() {
  return (
    <ChatInput
      value="Resuma os relatórios de manutenção do último trimestre"
      onChange={noop}
      onSubmit={stop}
    />
  );
}

export function Disabled() {
  return (
    <ChatInput
      value=""
      onChange={noop}
      onSubmit={stop}
      placeholder="Aguardando resposta do agente…"
      disabled
    />
  );
}
