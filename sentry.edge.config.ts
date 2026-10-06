import * as Sentry from "@sentry/nextjs";
import { sanitizeEvent, sanitizeBreadcrumb } from "./src/instrumentation-client";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  tracesSampleRate: 0.1,
  debug: false,
  beforeSend(event) {
    return sanitizeEvent(event);
  },
  beforeBreadcrumb(breadcrumb) {
    return sanitizeBreadcrumb(breadcrumb);
  },
});
