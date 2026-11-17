"use client";

import { formatMoney } from "@/lib/format/currency";
import { storefrontAction } from "@/lib/design/storefront";
import React, { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/useCartStore";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildWhatsAppSupportText, paymentLabel } from "@/lib/order/createOrder";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { formatTrDate } from "@/lib/time/istanbul";
import { trackingUrl, whatsappLink } from "@/lib/site";
import { CheckCircle2, MessageSquare, X, Copy, Check, UserPlus, PackageSearch } from "lucide-react";
import { Modal } from "@/components/common/Modal";

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
  const waHref = whatsappLink(buildWhatsAppSupportText(order, link), toWhatsAppNumber(settings.whatsappPhone));

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
    <Modal open={isOpen} onClose={hideSuccess} labelledBy="order-success-title"
      className="sf-dialog w-[calc(100%-2rem)] max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl bg-cream-surface animate-fadeIn">
      <div className="sf-dialog-body relative space-y-5">
        <button
          type="button"
          onClick={hideSuccess}
          aria-label="Kapat"
          className={storefrontAction({ variant: "secondary", size: "default", className: "absolute top-4 right-4" })}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="sf-status-icon w-14 h-14 rounded-full flex items-center justify-center mx-auto sf-success">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 id="order-success-title" className="sf-dialog-title font-serif text-2xl font-bold text-ink">
            Siparişin alındı
          </h2>
          <p className="sf-copy text-xs text-ink-muted font-sans">
            Siparişin fırına iletildi. Ödemeni teslimatta kapıda nakit veya kredi/banka kartı ile yapabilirsin.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg border border-line space-y-2.5 text-xs font-sans">
          <Row label="Sipariş No" value={<span className="font-mono font-bold text-ink text-sm">{orderNo}</span>} />
          {order.deliveryDate && (
            <Row
              label="Teslim"
              value={`${formatTrDate(order.deliveryDate, "long")}${order.deliveryTimeWindow ? `, ${order.deliveryTimeWindow}` : ""}`}
            />
          )}
          <Row label="Ödeme" value={paymentLabel(order.paymentMethod)} />
          <Row label="Toplam" value={<strong>{formatMoney(order.totalAmount)}</strong>} />
        </div>

        <div className="space-y-2.5">
          <div className="flex gap-2">
            <Link
              href={`/siparis-takip/${encodeURIComponent(orderNo)}${trackingToken ? `?t=${encodeURIComponent(trackingToken)}` : ""}`}
              onClick={hideSuccess}
              className={storefrontAction({ variant: "primary", size: "default", className: "flex-1 flex items-center justify-center gap-1.5" })}
            >
              <PackageSearch className="w-4 h-4" /> Siparişi takip et
            </Link>
            <button
              type="button"
              onClick={copyLink}
              className={storefrontAction({ variant: "secondary", size: "default", className: "flex items-center gap-1.5" })}
              aria-label="Takip linkini kopyala"
            >
              {copied ? <Check className="sf-success w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Kopyalandı" : "Linki kopyala"}
            </button>
          </div>

          <a href={waHref} target="_blank" rel="noopener noreferrer"
            className={storefrontAction({ variant: "secondary", size: "default", className: "w-full flex items-center justify-center gap-2" })}>
            <MessageSquare aria-hidden="true" className="w-4 h-4" />
            Siparişinle ilgili WhatsApp desteği
          </a>

          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                hideSuccess();
                openAuthModal();
              }}
              className={storefrontAction({ variant: "primary", size: "default", className: "w-full flex items-center justify-center gap-1.5" })}
            >
              <UserPlus className="w-4 h-4" /> Siparişini hesabına kaydet (Google ile giriş)
            </button>
          )}

          <p className="sf-copy text-xs text-center text-ink-muted font-sans">
            Bu cihazdan verdiğin siparişler <Link href="/siparislerim" onClick={hideSuccess} className="sf-link underline">Siparişlerim</Link> sayfasında da görünür.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="sf-muted text-ink-muted">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  );
}
