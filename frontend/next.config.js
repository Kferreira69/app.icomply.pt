/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent browsers from MIME-sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block framing (clickjacking protection)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Disable legacy XSS auditor (deprecated, use CSP instead)
  { key: 'X-XSS-Protection', value: '0' },
  // Strict HTTPS (1 year, subdomains)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Only send origin in Referer, not full URL
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Limit browser feature access
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed by Next.js dev; tighten in prod
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.icomply.pt wss://api.icomply.pt",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  output: 'standalone',

  images: {
    domains: [
      'localhost',
      'api.icomply.pt',
      'storage.icomply.pt',
      'files.icomply.pt',
      'api.staging.icomply.pt',
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
