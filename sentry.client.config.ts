import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  // Only enable when DSN is present
  enabled: Boolean(SENTRY_DSN),
  tracesSampleRate: 1.0,
  // Set sample rate to 10% for session replays in production if needed
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  debug: false,
});
