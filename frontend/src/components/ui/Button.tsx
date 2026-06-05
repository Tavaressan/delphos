import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary';
      case 'secondary': return 'bg-slate-200 text-slate-700 hover:bg-slate-300';
      case 'accent': return 'bg-accent text-white hover:bg-cyan-600';
      case 'danger': return 'bg-red-600 text-white hover:bg-red-700';
      case 'ghost': return 'bg-transparent hover:bg-slate-100 text-slate-600';
      default: return 'btn-primary';
    }
  };

  return (
    <button
      className={`px-4 py-2 rounded text-xs font-semibold font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none ${getVariantClass()} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
