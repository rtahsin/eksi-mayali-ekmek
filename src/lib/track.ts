/** Sipariş hunisi ölçümü: istemci tarafı. Kişisel veri göndermez; hata hiçbir şeyi bozmaz. */

export type FunnelEvent = "scan" | "cart_open" | "checkout_start" | "order_ok" | "order_error";

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

function currentRef(): string | null {
  try {
    const ref = sessionStorage.getItem(REF_KEY);
    return ref && REF_RE.test(ref) ? ref : null;
  } catch {
    return null;
  }
}

const sentOnce = new Set<string>();

export function trackEvent(event: FunnelEvent, extra: { code?: string; orderId?: string; once?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  if (extra.once) {
    if (sentOnce.has(event)) return;
    sentOnce.add(event);
  }
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ref: currentRef(), code: extra.code, orderId: extra.orderId }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ölçüm asla akışı bozmaz
  }
}
