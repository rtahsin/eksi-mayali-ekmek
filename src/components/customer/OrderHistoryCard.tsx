"use client";

import React, { useState, useEffect, useId } from "react";
import Link from "next/link";
import { Order } from "@/types";
import {
  Calendar,
  ChevronRight,
  MapPin,
  Check,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  XCircle,
  Clock,
} from "lucide-react";
import { getOrderProgress, extractPostponedNotice } from "@/lib/order/progression";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatTrDate, toIstanbulDate } from "@/lib/time/istanbul";

interface OrderHistoryCardProps {
  order: Order;
  onOrderCancelled?: (orderId: string) => void;
}

export function OrderHistoryCard({ order, onOrderCancelled }: OrderHistoryCardProps) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [postponedNotice, setPostponedNotice] = useState<string | null>(null);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  const cancelFieldId = useId();
  const cancelTitleId = useId();

  const { fetchStatusHistory } = useOrderHistory();
  const { allProducts, loading: catalogLoading } = useProducts("all");
  const applyReorder = useCartStore((state) => state.applyReorder);

  const progression = getOrderProgress(order.status);
  const canCancel = order.status === "bekliyor";

  useEffect(() => {
    let mounted = true;
    fetchStatusHistory(order.id).then((history) => {
      if (!mounted) return;
      const notice = extractPostponedNotice(history);
      setPostponedNotice(notice);
    });
    return () => {
      mounted = false;
    };
  }, [order.id, fetchStatusHistory]);

  useEffect(() => {
    if (!cancelModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !cancelling) {
        setCancelModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelModalOpen, cancelling]);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason.trim() || "Müşteri hesap panelinden iptal etti",
        }),
      });

      const data: { success?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "İptal işlemi gerçekleştirilemedi");
      }

      setCancelModalOpen(false);
      if (onOrderCancelled) {
        onOrderCancelled(order.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = () => {
    const result = applyReorder(
      allProducts,
      order.items.map((it) => ({
        productId: it.productId,
        name: it.productName,
        quantity: it.quantity,
      }))
    );

    if (result.addedCount === 0) {
      setReorderNotice("Bu siparişteki ürünler şu anda satışta bulunmuyor.");
      setTimeout(() => setReorderNotice(null), 3500);
      return;
    }

    if (result.unavailableNames.length > 0) {
      setReorderNotice(
        `${result.addedCount} ürün sepete eklendi (${result.unavailableNames.join(", ")} şu an satışta değil).`
      );
    } else {
      setReorderNotice("Ürünler güncel fiyatlarıyla sepete eklendi!");
    }
    setTimeout(() => setReorderNotice(null), 3500);
  };

  const formattedDate = formatTrDate(
    order.deliveryDate || toIstanbulDate(order.createdAt),
    "long"
  );

  const trackingTarget = order.orderNumber || order.id;

  return (
    <article className="bg-cream-surface border border-line rounded-3xl p-4 sm:p-6 hover:border-accent/40 transition-all space-y-4 shadow-2xs text-ink">
      {/* Header: Order Number, Date and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">
              #{order.orderNumber || order.id.replace("ORD-", "")}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                progression.isCancelled
                  ? "bg-bad/10 text-bad border-bad/30"
                  : progression.isDelivered
                  ? "bg-good/15 text-good border-good/30"
                  : "bg-accent/10 text-accent border-accent/30"
              }`}
            >
              {progression.isCancelled ? (
                <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : progression.isDelivered ? (
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{progression.statusLabel}</span>
            </span>
          </div>
          <div className="text-xs text-ink-muted flex items-center gap-1.5 font-sans">
            <Calendar className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
            <span>Teslimat: {formattedDate}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-ink-muted block font-sans">Toplam Tutar</span>
          <span className="text-base sm:text-lg font-serif font-bold text-ink">
            {order.totalAmount.toLocaleString("tr-TR")} ₺
          </span>
        </div>
      </div>

      {/* Durum Çubuğu (ikon + metin ile WCAG 1.4.1 uyumlu) */}
      <div className="py-1">
        {progression.isCancelled ? (
          <div className="p-3 rounded-xl bg-bad/10 border border-bad/25 flex flex-wrap items-center justify-between gap-2 text-xs text-bad">
            <span className="font-semibold inline-flex items-center gap-1.5">
              <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Bu sipariş iptal edilmiştir.</span>
            </span>
            {order.cancelReason && (
              <span className="text-ink-muted italic">({order.cancelReason})</span>
            )}
          </div>
        ) : (
          <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Sipariş ilerleme adımları">
            {progression.steps.map((s) => {
              const activeOrDone = s.isCompleted || s.isCurrent;
              return (
                <li
                  key={s.key}
                  aria-current={s.isCurrent ? "step" : undefined}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                      activeOrDone ? "bg-accent" : "bg-line"
                    }`}
                  />
                  <span
                    className={`text-[11px] sm:text-xs font-sans inline-flex items-center gap-0.5 truncate max-w-full ${
                      s.isCurrent
                        ? "font-bold text-accent"
                        : s.isCompleted
                        ? "font-medium text-ink"
                        : "text-ink-muted"
                    }`}
                  >
                    {s.isCompleted && (
                      <Check className="w-3 h-3 text-good shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{s.label}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Eşik Nedeniyle Kaydırılan Siparişte Açık Not */}
      {postponedNotice && !progression.isCancelled && !progression.isDelivered && (
        <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-ink">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="font-semibold text-accent block">Özel Ekmek Eşik Bildirimi</strong>
              <p className="text-ink-muted leading-relaxed mt-0.5">{postponedNotice}</p>
            </div>
          </div>
          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="touch-target-44 min-h-[44px] px-3.5 py-2 rounded-xl bg-bad text-white font-semibold text-xs hover:bg-bad/90 transition-colors shrink-0"
            >
              İptal Et
            </button>
          )}
        </div>
      )}

      {/* Items Summary */}
      <div className="bg-bg/70 border border-line rounded-2xl p-3.5 space-y-1.5">
        <div className="text-xs text-ink divide-y divide-line/70">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-accent shrink-0">
                  {item.quantity}×
                </span>
                <span className="font-sans font-medium truncate">{item.productName}</span>
              </span>
              <span className="font-mono text-xs text-ink-muted shrink-0">
                {item.totalPrice.toLocaleString("tr-TR")} ₺
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Address */}
      {order.deliveryAddress && (
        <div className="bg-bg/45 border border-line/70 rounded-xl p-3 text-xs text-ink-muted flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <span className="line-clamp-2 leading-relaxed font-sans">{order.deliveryAddress}</span>
        </div>
      )}

      {/* Reorder Notification Toast */}
      {reorderNotice && (
        <div
          role="status"
          className="p-3 rounded-xl bg-good/15 border border-good/30 text-xs text-ink font-sans flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-good shrink-0" aria-hidden="true" />
          <span>{reorderNotice}</span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReorder}
            disabled={catalogLoading && allProducts.length === 0}
            className="touch-target-44 min-h-[44px] px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-50 text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Tekrar Sipariş Ver</span>
          </button>

          {canCancel && !postponedNotice && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="touch-target-44 min-h-[44px] px-3.5 py-2 rounded-xl text-xs text-bad hover:bg-bad/10 font-semibold transition-colors"
            >
              İptal Et
            </button>
          )}
        </div>

        <Link
          href={`/siparis-takip/${encodeURIComponent(trackingTarget)}`}
          className="touch-target-44 min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bg border border-line hover:border-accent text-ink text-xs font-semibold transition-colors ml-auto shadow-2xs"
        >
          <span>Teslimat Fişi</span>
          <ChevronRight className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
        </Link>
      </div>

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={cancelTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/55 backdrop-blur-xs animate-fadeIn"
        >
          <div className="w-full max-w-sm bg-cream-surface border border-line rounded-3xl p-6 text-ink space-y-4 shadow-2xl">
            <h3 id={cancelTitleId} className="font-serif font-bold text-base text-ink">
              Siparişi İptal Et
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed font-sans">
              #{order.orderNumber || order.id} numaralı siparişinizi iptal etmek istediğinize emin misiniz?
            </p>

            <div className="space-y-1">
              <label htmlFor={cancelFieldId} className="block text-xs font-semibold text-ink">
                İptal nedeni (isteğe bağlı)
              </label>
              <textarea
                id={cancelFieldId}
                name="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="İptal sebebiniz..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-accent font-sans"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="text-xs text-bad bg-bad/10 p-3 rounded-xl border border-bad/25 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                className="touch-target-44 min-h-[44px] px-4 py-2 rounded-xl bg-bg border border-line hover:bg-cream-surface text-xs font-semibold transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelling}
                className="touch-target-44 min-h-[44px] px-4 py-2 rounded-xl bg-bad hover:bg-bad/90 text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {cancelling ? "İptal Ediliyor..." : "Evet, İptal Et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
