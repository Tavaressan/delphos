import nextConfig from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts'],
  },
  ...nextConfig,
  {
    // eslint-config-next@16 trouxe eslint-plugin-react-hooks@7, que introduziu regras novas
    // voltadas ao React Compiler. Elas capturam padrões reais e pré-existentes em ~6 arquivos
    // (issue de follow-up #210) que exigem refactor de lógica de app, fora do escopo desta
    // migração de config — rebaixadas para warn até serem corrigidas. O plugin precisa ser
    // reexposto neste objeto porque o flat config resolve regras só dentro do próprio objeto.
    plugins: {
      'react-hooks': nextConfig.find((c) => c.plugins?.['react-hooks'])?.plugins['react-hooks'],
    },
    rules: {
      'react-hooks/static-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
