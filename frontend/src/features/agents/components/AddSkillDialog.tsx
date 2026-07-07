import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { SkillInput, validateSkillInput } from '../skills';

export interface AddSkillDialogProps {
  onAdd: (input: SkillInput) => void;
  onClose: () => void;
}

export const AddSkillDialog: React.FC<AddSkillDialogProps> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: SkillInput = { name, description };
    const validationError = validateSkillInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    onAdd(input);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="add-skill-dialog">
      <div className="card-alfabra w-full max-w-sm relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-text-primary text-sm heading-font uppercase mb-4">Adicionar skill customizada</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="label-alfabra" htmlFor="skill-name">Nome</label>
            <Input id="skill-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Resumo Executivo" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-alfabra" htmlFor="skill-description">Descrição</label>
            <textarea
              id="skill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que essa skill faz?"
              className="input-alfabra min-h-20 resize-y"
            />
          </div>
          {error && <span className="text-xs text-danger">{error}</span>}
          <Button type="submit" className="mt-2">Adicionar</Button>
        </form>
      </div>
    </div>
  );
};
