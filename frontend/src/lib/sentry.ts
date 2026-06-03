/**
 * Sentry client-side initialisation.
 * Only runs when NEXT_PUBLIC_SENTRY_DSN is set — safe to import everywhere.
 */
export function initSentry(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof window === 'undefined') return;

  import('@sentry/nextjs').then(Sentry => {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.05,
      release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      // Only capture real errors — ignore browser extension noise
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],
    });
  }).catch(() => {
    // Sentry not available — proceed without it
  });
}

/** Capture an exception with optional extra context */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  import('@sentry/nextjs').then(Sentry => {
    if (context) Sentry.setContext('extra', context);
    Sentry.captureException(err);
  }).catch(() => {});
}
