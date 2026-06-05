import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className = '' }) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'secondary': return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'accent': return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      case 'success': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'warning': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'danger': return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'info': return 'bg-slate-50 text-slate-600 border border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${getVariantClass()} ${className}`}>
      {children}
    </span>
  );
};
