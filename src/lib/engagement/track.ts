import { appEnv } from "@/lib/kernel/env";
import type { FunnelEvent, LearningSessionProps, TrackExtra } from "./types";
import { isSessionEligible, shouldSampleSession } from "./events";

export * from "./types";
export * from "./events";

const REF_KEY = "ekmeklab_ref";
const REF_RE = /^[a-z0-9_-]{1,40}$/;

/** URL'deki ?ref= / ?n= değerini oturum boyunca saklar (QR → şarküteri kodu). */
export function captureRef(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get("ref") || "").toLowerCase();
    if (REF_RE.test(ref)) sessionStorage.setItem(REF_KEY, ref);
  } catch {
    // depolama yoksa ölçüm eksik kalır, sorun değil
  }
}

export function currentRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ref = sessionStorage.getItem(REF_KEY);
    return ref && REF_RE.test(ref) ? ref : null;
  } catch {
    return null;
  }
}

const sentOnce = new Set<string>();

/**
 * Genel huni olayı gönderici.
 */
export function trackEvent(
  event: FunnelEvent,
  extra: TrackExtra = {}
): void {
  if (typeof window === "undefined") return;
  if (extra.once) {
    if (sentOnce.has(event)) return;
    sentOnce.add(event);
  }
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        ref: currentRef(),
        code: extra.code,
        orderId: extra.orderId,
        props: extra.props,
        env: extra.env || appEnv(),
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ölçüm asla akışı bozmaz
  }
}

let learningSessionSent = false;

/**
 * Öğrenme oturumu ölçümü:
 * - Yalnızca ≥30 sn ya da ≥1 kart incelenmişse
 * - %20 rastgele örnekleme
 * - Sayfa kapatılırken (pagehide) 1 kez
 */
export function trackLearningSession(data: LearningSessionProps): void {
  if (typeof window === "undefined" || learningSessionSent) return;

  // Eşik kontrolü (≥30 sn ya da ≥1 kart)
  if (!isSessionEligible(data)) return;

  // %20 örnekleme
  if (!shouldSampleSession()) return;

  learningSessionSent = true;

  trackEvent("learning_session", {
    props: data,
    once: true,
  });
}
