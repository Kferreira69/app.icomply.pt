/**
 * Next.js Middleware — Nonce-based Content Security Policy
 *
 * Generates a fresh cryptographic nonce on every request.
 * The nonce is:
 *   1. Added to the CSP response header   → browser only executes scripts with this nonce
 *   2. Forwarded on the request as x-nonce → Next.js runtime adds it to hydration <script> tags
 *
 * This replaces 'unsafe-inline' in script-src, which is required for A+ on securityheaders.com.
 *
 * Uses Web Crypto API (available in Edge runtime — no Node.js imports).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  // btoa produces valid base64 — safe for CSP nonce values
  return btoa(String.fromCharCode(...array));
}

export function middleware(request: NextRequest) {
  // ── admin.icomply.pt → auto-redirect to backoffice ────────────────────────
  const host = request.headers.get('host') ?? '';
  if (host.startsWith('admin.')) {
    // Always redirect admin.icomply.pt → app.icomply.pt/backoffice/licensing
    // Replace the admin. prefix with app. so the host is correct
    const mainHost = host.replace(/^admin\./, 'app.');
    const proto = request.nextUrl.protocol; // https: in production
    return NextResponse.redirect(
      new URL(`${proto}//${mainHost}/backoffice/licensing`),
      308,
    );
  }

  const nonce = generateNonce();
  const isProd = process.env.NODE_ENV === 'production';

  // Strip path suffix — CSP connect-src needs the origin, not a specific path
  // e.g. https://api.icomply.pt/api/v1  →  https://api.icomply.pt
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiOrigin = rawApiUrl.replace(/\/api\/v\d+.*$/, '');
  // WebSocket origin (wss:// instead of https://)
  const wsOrigin = isProd ? apiOrigin.replace(/^https:/, 'wss:') : '';

  const csp = [
    "default-src 'self'",
    // nonce replaces 'unsafe-inline'; 'unsafe-eval' only in dev (Next.js HMR)
    `script-src 'self' 'nonce-${nonce}'${isProd ? '' : " 'unsafe-eval'"}`,
    // Inline styles needed by Next.js (critical CSS injected at runtime)
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // API origin + WebSocket; in dev also allow localhost HMR
    `connect-src 'self' ${apiOrigin}${wsOrigin ? ` ${wsOrigin}` : ''}${isProd ? '' : ' ws://localhost:3000 ws://localhost:3001 http://localhost:3001'}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join('; ');

  // Forward nonce to the app so Next.js adds it to hydration scripts automatically
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set CSP on the response — browser enforces this
  response.headers.set('content-security-policy', csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Static image files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
