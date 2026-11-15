import * as Sentry from "@sentry/nextjs";
import { sanitizeEvent, sanitizeBreadcrumb } from "./src/instrumentation-client";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  environment:
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development",
  release:
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    undefined,
  tracesSampleRate: 0.1,
  debug: false,
  beforeSend(event) {
    return sanitizeEvent(event);
  },
  beforeBreadcrumb(breadcrumb) {
    return sanitizeBreadcrumb(breadcrumb);
  },
});
