import * as Sentry from "@sentry/nextjs";

export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

/**
 * URL'deki sorgu dizesini (token, ?t=, arama parametreleri vb.) temizler (PII & token sızıntısı koruması).
 */
export function sanitizeUrl(url?: string | null): string | null | undefined {
  if (!url || typeof url !== "string") return url;
  const qIndex = url.indexOf("?");
  return qIndex === -1 ? url : url.slice(0, qIndex);
}

export function sanitizeBreadcrumb(
  breadcrumb: Sentry.Breadcrumb
): Sentry.Breadcrumb | null {
  if (breadcrumb.data && typeof breadcrumb.data.url === "string") {
    breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url) || "";
  }
  if (breadcrumb.message && typeof breadcrumb.message === "string") {
    // Mesaj içinde link varsa query string'i buda
    breadcrumb.message = breadcrumb.message.replace(/(\bhttps?:\/\/[^\s?]+)\?[^\s]*/gi, "$1");
  }
  return breadcrumb;
}

export function sanitizeEvent<T extends { request?: { url?: string }; transaction?: string }>(
  event: T
): T {
  if (event.request && typeof event.request.url === "string") {
    event.request.url = sanitizeUrl(event.request.url) || "";
  }
  if (event.transaction && typeof event.transaction === "string") {
    event.transaction = sanitizeUrl(event.transaction) || "";
  }
  return event;
}

export const sentryClientOptions: Sentry.BrowserOptions = {
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  // Örnekleme: 0.1 (P1-11)
  tracesSampleRate: 0.1,
  // Replay entegrasyonu yok (replaysSessionSampleRate veya Replay tanımlanmaz)
  debug: false,
  beforeSend(event) {
    return sanitizeEvent(event);
  },
  beforeBreadcrumb(breadcrumb) {
    return sanitizeBreadcrumb(breadcrumb);
  },
};

// Sentry istemci başlatma
Sentry.init(sentryClientOptions);
