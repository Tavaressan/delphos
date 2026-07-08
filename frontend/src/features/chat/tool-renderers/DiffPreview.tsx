import React from 'react';

interface DiffPreviewProps {
  oldString: string;
  newString: string;
}

/**
 * Preview simples de diff linha-a-linha (estilo unificado, sem lib externa)
 * usado pelo EditRenderer.
 */
export const DiffPreview: React.FC<DiffPreviewProps> = ({ oldString, newString }) => {
  const oldLines = oldString.split('\n');
  const newLines = newString.split('\n');

  return (
    <div className="flex flex-col gap-0.5">
      {oldLines.map((line, i) => (
        <div key={`old-${i}`} className="bg-red-950/40 text-red-300 px-1">
          - {line}
        </div>
      ))}
      {newLines.map((line, i) => (
        <div key={`new-${i}`} className="bg-emerald-950/40 text-emerald-300 px-1">
          + {line}
        </div>
      ))}
    </div>
  );
};
