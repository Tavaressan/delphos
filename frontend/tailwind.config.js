/** @type {import('tailwindcss').Config} */
module.exports = {
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
          DEFAULT: '#22409A',
          dark: '#183072',
          light: '#3b5cb8',
        },
        secondary: {
          DEFAULT: '#E5E4E2',
          dark: '#CCCCCC',
          light: '#F5F4F2',
        },
        accent: {
          DEFAULT: '#00ACC1',
          dark: '#00838F',
          light: '#4DD0E1',
        },
        success: {
          DEFAULT: '#2E7D32',
          dark: '#1B5E20',
          light: '#4CAF50',
        },
        warning: {
          DEFAULT: '#F9A825',
          dark: '#F57F17',
          light: '#FBC02D',
        },
        danger: {
          DEFAULT: '#C62828',
          dark: '#B71C1C',
          light: '#E53935',
        },
        background: '#FBFBFE',
        surface: '#FFFFFF',
      },
      fontFamily: {
        heading: ['Orbitron', 'sans-serif'],
        body: ['Overpass', 'sans-serif'],
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
