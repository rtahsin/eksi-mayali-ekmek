import "server-only";

import * as Sentry from "@sentry/nextjs";
import { SITE_URL } from "@/lib/site";
import { formatTrDate } from "@/lib/time/istanbul";
import { appEnv } from "@/lib/kernel/env";

export interface NewOrderNotice {
  orderNumber: string;
  orderId: string;
  deliveryDate: string;
  neighborhood: string;
  items: { name: string; quantity: number }[];
  totalAmount: number;
  paymentMethod: string;
  /** Bu telefondan daha önce (iptal dışı) sipariş yok: Tahsin teyit etsin. Kişisel veri içermez. */
  isFirstOrder?: boolean;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash_on_delivery: "Kapıda nakit",
  pos_at_door: "Kapıda POS",
  whatsapp: "WhatsApp'ta anlaşma",
};

/**
 * Yeni sipariş bildirimini Telegram'a gönderir. KVKK: ad, telefon ve adres GÖNDERİLMEZ.
 * Hiçbir koşulda hata fırlatmaz (sipariş akışını bozmaz); 3 sn zaman aşımı; hatalar Sentry'ye.
 * `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` yoksa sessizce atlar.
 */
export async function notifyNewOrder(order: NewOrderNotice): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const isPreviewOrDev = appEnv() !== "production";
  const lines = [
    `${isPreviewOrDev ? "[TEST] " : ""}🍞 Yeni sipariş ${order.orderNumber}`,
    ...(order.isFirstOrder ? ["🆕 İlk sipariş: adresi/telefonu teyit et"] : []),
    `📅 ${formatTrDate(order.deliveryDate, "long")}`,
    `📍 ${order.neighborhood || "-"}`,
    ...order.items.map((it) => `• ${it.quantity} × ${it.name}`),
    `💰 ${order.totalAmount.toLocaleString("tr-TR")} ₺ — ${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}`,
    `${SITE_URL}/admin/siparisler/${encodeURIComponent(order.orderId)}`,
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), disable_web_page_preview: true }),
      signal: controller.signal,
    });
    if (!res.ok) {
      Sentry.captureMessage(`Telegram notify failed: HTTP ${res.status}`, "warning");
    }
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { area: "telegram_notify" } });
  } finally {
    clearTimeout(timer);
  }
}

export interface ThresholdDecisionItem {
  product_id: string;
  product_name: string;
  sale_date: string;
  decision: "kesinlesti" | "kaydirildi";
  ordered_quantity: number;
  threshold: number;
  next_date?: string;
  shifted_orders_count?: number;
}

/**
 * Eşikli ekmeklerin karar özetini Telegram'a gönderir (KVKK: kişisel veri içermez).
 * Hiçbir koşulda hata fırlatmaz, zaman aşımı 3 sn.
 */
export async function sendThresholdSummary(decisions: ThresholdDecisionItem[]): Promise<void> {
  if (!decisions || decisions.length === 0) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const isPreviewOrDev = appEnv() !== "production";
  const lines = [
    `${isPreviewOrDev ? "[TEST] " : ""}📊 Eşik Karar Özeti`,
    ...decisions.map((d) => {
      if (d.decision === "kesinlesti") {
        return `✅ ${d.product_name} · ${formatTrDate(d.sale_date, "long")}: ${d.ordered_quantity}/${d.threshold} kesinleşti`;
      }
      return `⏳ ${d.product_name} · ${d.ordered_quantity}/${d.threshold} → ${d.next_date ? formatTrDate(d.next_date, "long") : "gelecek haftaya"} kaydı · ${d.shifted_orders_count ?? 0} sipariş`;
    }),
    `${SITE_URL}/admin/siparisler`,
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), disable_web_page_preview: true }),
      signal: controller.signal,
    });
    if (!res.ok) {
      Sentry.captureMessage(`Telegram threshold notify failed: HTTP ${res.status}`, "warning");
    }
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { area: "telegram_threshold_notify" } });
  } finally {
    clearTimeout(timer);
  }
}

