'use client';

import React, { useState } from 'react';
import { PanelDock, DockPanel } from '../../../components/panel/PanelDock';

/**
 * Harness usado apenas pela suíte Playwright de responsividade (issue
 * #231). O PanelDock ainda não está conectado a nenhuma rota de produto —
 * hoje só é exercitado por teste unitário (renderToStaticMarkup). Esta
 * página monta o componente com dados de exemplo para permitir validar seu
 * comportamento responsivo real (empilhamento em mobile) em navegador.
 */
export default function PanelDockHarnessPage() {
  const [panels, setPanels] = useState<DockPanel[]>([
    { id: 'kb', title: 'Base de Conhecimento', content: <span>KB content</span> },
    { id: 'mcp', title: 'MCP & Skills', content: <span>MCP content</span> },
  ]);

  return (
    <div style={{ height: '100vh' }} className="p-4">
      <PanelDock
        panels={panels}
        onClosePanel={(id) => setPanels((prev) => prev.filter((p) => p.id !== id))}
      />
    </div>
  );
}
