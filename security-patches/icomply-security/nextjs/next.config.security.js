// next.config.js — Security headers completos para Next.js
// Substitui o teu next.config.js existente

/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.icomply.pt';

// Content Security Policy
// IMPORTANTE: Em produção, substituir 'unsafe-inline' nos scripts por nonces
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' ${isProd ? '' : "'unsafe-eval'"};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https:;
  media-src 'self';
  connect-src 'self' ${API_URL} ${isProd ? '' : 'http://localhost:3001 ws://localhost:3001'};
  frame-src 'none';
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  worker-src 'self' blob:;
  manifest-src 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  // Previne MIME sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Previne clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // HSTS — forçar HTTPS durante 2 anos
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Referrer mínimo
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Desativar APIs de hardware desnecessárias
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=()',
  },
  // CORP/COEP para isolamento de processos
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  // XSS (legacy browsers)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

const nextConfig = {
  // Headers de segurança em todas as rotas
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // API routes com headers adicionais
      {
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },

  // Não expor informações do servidor
  poweredByHeader: false,

  // Compression
  compress: true,

  // Variáveis de ambiente — APENAS as que devem ser públicas
  // NUNCA colocar secrets aqui com NEXT_PUBLIC_
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    // NÃO adicionar: DATABASE_URL, JWT_SECRET, API_KEYS, etc.
  },

  // Em produção: não gerar source maps (evita expor código)
  productionBrowserSourceMaps: false,

  // Experimental: strict mode React
  reactStrictMode: true,

  // Rewrites para proxy da API (opcional — evita CORS em prod)
  async rewrites() {
    if (!isProd) {
      return [
        {
          source: '/api/:path*',
          destination: `${API_URL}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
