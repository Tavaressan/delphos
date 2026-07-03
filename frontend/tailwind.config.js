/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // As variáveis CSS armazenam triplas RGB ("R G B"); usamos o formato
        // `rgb(var(--x) / <alpha-value>)` para que os modificadores de
        // opacidade do Tailwind (ex.: `bg-secondary/20`) funcionem
        // corretamente no modo escuro. Ver issue #109.
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          dark: 'rgb(var(--primary-dark) / <alpha-value>)',
          light: 'rgb(var(--primary-light) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          dark: 'rgb(var(--secondary-dark) / <alpha-value>)',
          light: 'rgb(var(--secondary-light) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark: 'rgb(var(--accent-dark) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          dark: 'rgb(var(--success-dark) / <alpha-value>)',
          light: 'rgb(var(--success-light) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          dark: 'rgb(var(--warning-dark) / <alpha-value>)',
          light: 'rgb(var(--warning-light) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          dark: 'rgb(var(--danger-dark) / <alpha-value>)',
          light: 'rgb(var(--danger-light) / <alpha-value>)',
        },
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'border-color': 'rgb(var(--border-color) / <alpha-value>)',
      },
      fontFamily: {
        heading: ['var(--font-inter)', 'Inter', 'sans-serif'],
        body: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      fontWeight: {
        light: '200',
        regular: '400',
        bold: '600',
      },
      boxShadow: {
        discrete: '0 2px 8px -1px rgba(0, 0, 0, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.03)',
        card: '0 4px 20px -2px rgba(34, 64, 154, 0.05)',
      },
    },
  },
  plugins: [],
};
