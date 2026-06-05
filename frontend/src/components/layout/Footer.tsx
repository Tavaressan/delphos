import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-3 px-6 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-mono flex-shrink-0">
      &copy; {new Date().getFullYear()} Alfabra Vector. Todos os direitos reservados.
    </footer>
  );
};
