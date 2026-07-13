import nextPlugin from '@next/eslint-plugin-next';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
    },
  },
];
