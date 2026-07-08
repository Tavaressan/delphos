import React, { useState } from 'react';
import { Sparkles, Trash2, Plus } from 'lucide-react';
import { AgentSkill } from '../../../domain/entities';
import { SkillInput, addSkill, removeSkill } from '../skills';
import { AddSkillDialog } from './AddSkillDialog';

export interface SkillPanelProps {
  skills: AgentSkill[];
  onChange: (skills: AgentSkill[]) => void;
}

export const SkillPanel: React.FC<SkillPanelProps> = ({ skills, onChange }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (input: SkillInput) => {
    try {
      onChange(addSkill(skills, input));
      setError(null);
      setShowDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar skill.');
    }
  };

  const handleRemove = (id: string) => {
    onChange(removeSkill(skills, id));
  };

  return (
    <div className="flex flex-col gap-3" data-testid="skill-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-text-primary text-xs heading-font uppercase">Skills customizadas</h4>
        </div>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </button>
      </div>

      {error && <span className="text-xs text-danger">{error}</span>}

      {skills.length === 0 ? (
        <p className="text-xs text-text-secondary" data-testid="skill-empty-state">Nenhuma skill customizada atribuída a este agente.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {skills.map((skill) => (
            <li
              key={skill.id}
              data-testid={`skill-item-${skill.id}`}
              className="flex items-center justify-between bg-secondary/10 border border-border-color rounded px-3 py-2"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-semibold text-text-primary truncate">{skill.name}</span>
                {skill.description && (
                  <span className="text-[10px] text-text-secondary truncate">{skill.description}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(skill.id)}
                aria-label={`Remover ${skill.name}`}
                className="text-text-secondary hover:text-danger flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showDialog && <AddSkillDialog onAdd={handleAdd} onClose={() => setShowDialog(false)} />}
    </div>
  );
};
