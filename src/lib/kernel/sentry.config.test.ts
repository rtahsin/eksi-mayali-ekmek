import { describe, it, expect } from "vitest";
import {
  sentryClientOptions,
  sanitizeUrl,
  sanitizeBreadcrumb,
  sanitizeEvent,
} from "../../instrumentation-client";

describe("Sentry Client Configuration & Privacy Protection (P1-11)", () => {
  it("has tracesSampleRate set to 0.1", () => {
    expect(sentryClientOptions.tracesSampleRate).toBe(0.1);
  });

  it("does NOT include Session Replay integrations or replay sample rates", () => {
    const opts = sentryClientOptions as Record<string, unknown>;
    expect(opts.replaysSessionSampleRate).toBeUndefined();
    expect(opts.replaysOnErrorSampleRate).toBeUndefined();
  });

  describe("URL Query String Sanitization (sanitizeUrl)", () => {
    it("strips ?t= link token and all query parameters from URL", () => {
      const sensitiveUrl = "https://ekmeklab.tr/fis/SIP-1234?t=jwt_secret_token_abc";
      expect(sanitizeUrl(sensitiveUrl)).toBe("https://ekmeklab.tr/fis/SIP-1234");
    });

    it("strips complex query strings and customer tokens", () => {
      const url = "https://ekmeklab.tr/ekstre/cari-99?token=xyz&page=2&ref=qr1";
      expect(sanitizeUrl(url)).toBe("https://ekmeklab.tr/ekstre/cari-99");
    });

    it("leaves clean URLs unchanged", () => {
      const cleanUrl = "https://ekmeklab.tr/kutuphane/karakilcik-bugdayi";
      expect(sanitizeUrl(cleanUrl)).toBe(cleanUrl);
    });

    it("handles null and undefined gracefully", () => {
      expect(sanitizeUrl(null)).toBeNull();
      expect(sanitizeUrl(undefined)).toBeUndefined();
    });
  });

  describe("Breadcrumb & Event Sanitization", () => {
    it("cleans query strings inside breadcrumbs", () => {
      const breadcrumb = {
        category: "navigation",
        data: { url: "https://ekmeklab.tr/fis/123?t=token123" },
        message: "Navigated to https://ekmeklab.tr/fis/123?t=token123",
      };
      const sanitized = sanitizeBreadcrumb(breadcrumb);
      expect(sanitized?.data?.url).toBe("https://ekmeklab.tr/fis/123");
      expect(sanitized?.message).toBe("Navigated to https://ekmeklab.tr/fis/123");
    });

    it("cleans query strings inside error events", () => {
      const event = {
        request: { url: "https://ekmeklab.tr/api/slip/123?t=secret" },
        transaction: "GET /api/slip/123?t=secret",
      };
      const sanitized = sanitizeEvent(event);
      expect(sanitized?.request?.url).toBe("https://ekmeklab.tr/api/slip/123");
      expect(sanitized?.transaction).toBe("GET /api/slip/123");
    });
  });
});
