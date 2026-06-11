import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-3 px-6 bg-surface border-t border-border-color text-center text-xs text-text-secondary font-mono flex-shrink-0 transition-colors duration-200">
      &copy; {new Date().getFullYear()} Alfabra Vector. Todos os direitos reservados.
    </footer>
  );
};
