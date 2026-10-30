"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/useCartStore";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildWhatsAppConfirmText, paymentLabel } from "@/lib/order/createOrder";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { formatTrDate } from "@/lib/time/istanbul";
import { trackingUrl, whatsappLink } from "@/lib/site";
import { CheckCircle2, MessageSquare, X, Copy, Check, UserPlus, PackageSearch } from "lucide-react";

export function OrderSuccessModal() {
  const isOpen = useCartStore((s) => s.isSuccessModalOpen);
  const completed = useCartStore((s) => s.lastCompleted);
  const hideSuccess = useCartStore((s) => s.hideSuccess);
  const { settings } = useStoreSettings();
  const { isLoggedIn, openAuthModal } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !completed) return null;

  const { order, trackingToken } = completed;
  const orderNo = order.orderNumber || order.id;
  const link = trackingUrl(orderNo, trackingToken);
  const waHref = whatsappLink(buildWhatsAppConfirmText(order, link), toWhatsAppNumber(settings.whatsappPhone));
  const isWhatsApp = order.paymentMethod === "whatsapp";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // pano izni yoksa link zaten görünür
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-cream-surface border border-line p-6 sm:p-8 shadow-2xl space-y-5">
        <button
          onClick={hideSuccess}
          aria-label="Kapat"
          className="absolute top-4 right-4 text-ink/60 hover:text-ink p-1 rounded-lg hover:bg-line/40 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-good">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 id="order-success-title" className="font-serif text-2xl font-bold text-ink">
            Siparişiniz alındı
          </h2>
          <p className="text-xs text-ink/60 font-sans">
            {isWhatsApp
              ? "Siparişiniz kaydedildi. Ödemeyi konuşmak için aşağıdan WhatsApp'ta onaylayın."
              : "Siparişiniz fırına iletildi. Teslim günü kapınızda olacak."}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg border border-line space-y-2.5 text-xs font-sans">
          <Row label="Sipariş No" value={<span className="font-mono font-bold text-accent text-sm">{orderNo}</span>} />
          {order.deliveryDate && (
            <Row
              label="Teslim"
              value={`${formatTrDate(order.deliveryDate, "long")}${order.deliveryTimeWindow ? `, ${order.deliveryTimeWindow}` : ""}`}
            />
          )}
          <Row label="Ödeme" value={paymentLabel(order.paymentMethod)} />
          <Row label="Toplam" value={<strong>{order.totalAmount.toLocaleString("tr-TR")} ₺</strong>} />
        </div>

        <div className="space-y-2.5">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-3 rounded-xl font-sans text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              isWhatsApp
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-good border border-emerald-500/30"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {isWhatsApp ? "Siparişi WhatsApp'tan Onayla" : "WhatsApp'tan Yazın"}
          </a>

          <div className="flex gap-2">
            <Link
              href={`/siparis-takip/${encodeURIComponent(orderNo)}${trackingToken ? `?t=${encodeURIComponent(trackingToken)}` : ""}`}
              onClick={hideSuccess}
              className="flex-1 py-2.5 rounded-xl bg-bg hover:bg-line/40 border border-line text-ink font-sans text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <PackageSearch className="w-4 h-4" /> Siparişi Takip Et
            </Link>
            <button
              type="button"
              onClick={copyLink}
              className="px-3 py-2.5 rounded-xl bg-bg hover:bg-line/40 border border-line text-ink/80 font-sans text-xs flex items-center gap-1.5"
              aria-label="Takip linkini kopyala"
            >
              {copied ? <Check className="w-4 h-4 text-good" /> : <Copy className="w-4 h-4" />}
              {copied ? "Kopyalandı" : "Linki kopyala"}
            </button>
          </div>

          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                hideSuccess();
                openAuthModal();
              }}
              className="w-full py-2.5 rounded-xl border border-accent/30 text-accent hover:bg-accent/10 font-sans text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" /> Siparişini hesabına kaydet (Google ile giriş)
            </button>
          )}

          <p className="text-xs text-center text-ink/50 font-sans">
            Bu cihazdan verdiğiniz siparişler <Link href="/siparislerim" onClick={hideSuccess} className="underline">Siparişlerim</Link> sayfasında da görünür.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink/50">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  );
}
