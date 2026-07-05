/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

/**
 * Static security headers — applied to every route via next.config.js.
 * Content-Security-Policy is intentionally NOT here; it is set per-request
 * by src/middleware.ts with a unique nonce (required for A+ on securityheaders.com).
 */
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Block framing (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },

  // Disable legacy XSS auditor — CSP is the modern approach
  { key: 'X-XSS-Protection', value: '0' },

  // HSTS — 2 years, aligns with Traefik config (63072000s)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },

  // Minimal referrer leakage
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Restrict browser feature access
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=()',
  },

  // Cross-origin isolation headers
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig = {
  output: 'standalone',

  // ── Security ────────────────────────────────────────────────────
  // Remove "x-powered-by: Next.js" response header
  poweredByHeader: false,

  // No source maps in production — never expose source code to clients
  productionBrowserSourceMaps: false,

  // React strict mode — catches double-render issues early
  reactStrictMode: true,

  // Gzip compression
  compress: true,

  // ── Images ──────────────────────────────────────────────────────
  images: {
    domains: [
      'localhost',
      'api.icomply.pt',
      'storage.icomply.pt',
      'files.icomply.pt',
      'api.staging.icomply.pt',
    ],
  },

  // ── Headers ─────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // ── API proxy ───────────────────────────────────────────────────
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
