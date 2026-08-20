/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Múltiplos lockfiles acima de frontend/ fazem o Next 15 inferir a raiz do
  // workspace errada, resolvendo o eslint hoisted em vez do local (issue #210).
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
