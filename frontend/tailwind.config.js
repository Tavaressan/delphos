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
        primary: {
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
          light: 'var(--primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          dark: 'var(--secondary-dark)',
          light: 'var(--secondary-light)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dark: 'var(--accent-dark)',
          light: 'var(--accent-light)',
        },
        success: {
          DEFAULT: 'var(--success)',
          dark: 'var(--success-dark)',
          light: 'var(--success-light)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          dark: 'var(--warning-dark)',
          light: 'var(--warning-light)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          dark: 'var(--danger-dark)',
          light: 'var(--danger-light)',
        },
        background: 'var(--background)',
        surface: 'var(--surface)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'border-color': 'var(--border-color)',
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
