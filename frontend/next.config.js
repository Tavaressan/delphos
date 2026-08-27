/** @type {import('next').NextConfig} */

// Backend acessado pelo browser (Caddy termina TLS; ver infrastructure/caddy/Caddyfile).
// Fallback replica o default de src/infrastructure/api/apiClient.ts.
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rag-corporativo.duckdns.org';
const isDev = process.env.NODE_ENV !== 'production';

// Política alvo (enforce futuro, ver docs/security/csp-enforce-plan.md).
// Em dev o Next injeta scripts inline/eval (HMR, react-refresh) e por isso
// script-src fica mais permissivo apenas nesse ambiente; em produção o
// header roda em Report-Only sem 'unsafe-inline'/'unsafe-eval' para
// coletarmos violações reais (inclusive as do próprio Next) antes do enforce.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${backendUrl}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy-Report-Only',
    value: cspDirectives,
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig = {
  reactStrictMode: true,
  // Múltiplos lockfiles acima de frontend/ fazem o Next 15 inferir a raiz do
  // workspace errada, resolvendo o eslint hoisted em vez do local (issue #210).
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
