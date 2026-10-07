"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Order } from "@/types";
import {
  Calendar,
  ChevronRight,
  MapPin,
  RefreshCw,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { getOrderProgress, buildReorderItems, extractPostponedNotice } from "@/lib/order/progression";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatTrDate } from "@/lib/time/istanbul";

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

  const { fetchStatusHistory } = useOrderHistory();
  const { allProducts } = useProducts("all");
  const addItem = useCartStore((state) => state.addItem);

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

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || "Müşteri hesap panelinden iptal etti",
        }),
      });

      const data = await res.json();
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
    const plan = buildReorderItems(order.items, allProducts);
    if (plan.availableItems.length === 0) {
      setReorderNotice("Bu siparişteki ürünler şu anda satışta bulunmuyor.");
      setTimeout(() => setReorderNotice(null), 3500);
      return;
    }

    for (const item of plan.availableItems) {
      addItem(item.product, null, item.quantity);
    }

    if (plan.unavailableItems.length > 0) {
      setReorderNotice(
        `${plan.availableItems.length} ürün sepete eklendi (${plan.unavailableItems.length} ürün tükendi).`
      );
    } else {
      setReorderNotice("Tüm ürünler güncel fiyatlarıyla sepete eklendi!");
    }
    setTimeout(() => setReorderNotice(null), 3500);
  };

  const formattedDate = order.deliveryDate
    ? formatTrDate(order.deliveryDate, "long")
    : new Date(order.createdAt).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <div className="bg-cream-surface border border-line rounded-2xl p-4 sm:p-6 hover:border-accent/40 transition-all space-y-4 shadow-xs text-ink">
      {/* Header: Order Number, Date and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">
              #{order.orderNumber || order.id.replace("ORD-", "")}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                progression.isCancelled
                  ? "bg-bad/10 text-bad border-bad/30"
                  : progression.isDelivered
                  ? "bg-good/10 text-good border-good/30"
                  : "bg-accent/10 text-accent border-accent/30"
              }`}
            >
              <span>{progression.statusLabel}</span>
            </span>
          </div>
          <div className="text-xs text-ink-muted flex items-center gap-1.5 font-sans">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span>Teslimat: {formattedDate}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-ink-muted block font-sans">Toplam Tutar</span>
          <span className="text-base sm:text-lg font-serif font-bold text-accent">
            {order.totalAmount.toLocaleString("tr-TR")} ₺
          </span>
        </div>
      </div>

      {/* ─── DURUM ÇUBUĞU (bekliyor → hazırlanıyor → fırında → yolda → teslim) ─── */}
      <div className="py-1">
        {progression.isCancelled ? (
          <div className="p-3 rounded-xl bg-bad/10 border border-bad/20 flex items-center justify-between text-xs text-bad">
            <span className="font-semibold">Bu sipariş iptal edilmiştir.</span>
            {order.cancelReason && (
              <span className="text-ink-muted italic">({order.cancelReason})</span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {progression.steps.map((s) => (
                <div key={s.key} className="flex flex-col items-center gap-1 text-center">
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                      s.isCompleted || s.isCurrent ? "bg-accent" : "bg-line"
                    }`}
                  />
                  <span
                    className={`text-[11px] sm:text-xs font-sans truncate ${
                      s.isCurrent
                        ? "font-bold text-accent"
                        : s.isCompleted
                        ? "font-medium text-ink"
                        : "text-ink-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── EŞİK NEDENİYLE KAYDIRILAN SİPARİŞTE AÇIK NOT ─── */}
      {postponedNotice && !progression.isCancelled && !progression.isDelivered && (
        <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-ink">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-accent block">Özel Ekmek Eşik Bildirimi</strong>
              <p className="text-ink-muted leading-relaxed mt-0.5">{postponedNotice}</p>
            </div>
          </div>
          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="touch-target-44 px-3 py-1.5 rounded-xl bg-bad text-white font-semibold text-xs hover:bg-bad/90 transition-colors shrink-0"
            >
              İptal Et
            </button>
          )}
        </div>
      )}

      {/* Items Summary */}
      <div className="bg-bg/60 border border-line rounded-xl p-3 space-y-1.5">
        <div className="text-xs text-ink divide-y divide-line/60">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent">
                  {item.quantity}×
                </span>
                <span className="font-sans font-medium">{item.productName}</span>
              </span>
              <span className="font-mono text-xs text-ink-muted">
                {item.totalPrice.toLocaleString("tr-TR")} ₺
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Address */}
      {order.deliveryAddress && (
        <div className="bg-bg/40 border border-line/60 rounded-xl p-2.5 text-xs text-ink-muted flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed">{order.deliveryAddress}</span>
        </div>
      )}

      {/* Reorder Notification Toast */}
      {reorderNotice && (
        <div className="p-2.5 rounded-xl bg-good/15 border border-good/30 text-xs text-ink font-sans flex items-center gap-2">
          <Check className="w-4 h-4 text-good shrink-0" />
          <span>{reorderNotice}</span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
        <div className="flex items-center gap-2">
          {/* Tekrar Sipariş Ver Butonu */}
          <button
            type="button"
            onClick={handleReorder}
            className="touch-target-44 px-3.5 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tekrar Sipariş Ver</span>
          </button>

          {canCancel && !postponedNotice && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="touch-target-44 px-3 py-2 text-xs text-bad hover:text-bad/80 font-medium transition-colors"
            >
              İptal Et
            </button>
          )}
        </div>

        <Link
          href={`/siparis-takip/${order.id}`}
          className="touch-target-44 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cream-surface border border-line hover:border-accent text-ink text-xs font-medium transition-colors ml-auto shadow-xs"
        >
          <span>Canlı Takip</span>
          <ChevronRight className="w-3.5 h-3.5 text-accent" />
        </Link>
      </div>

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-cream-surface border border-line rounded-2xl p-6 text-ink space-y-4 shadow-xl">
            <h3 className="font-serif font-bold text-base text-ink">Siparişi İptal Et</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              #{order.orderNumber || order.id} numaralı siparişinizi iptal etmek istediğinize emin misiniz?
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="İptal sebebiniz (isteğe bağlı)..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-bg border border-line text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
            />

            {error && (
              <div className="text-xs text-bad bg-bad/10 p-2.5 rounded-xl border border-bad/20">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                className="touch-target-44 px-4 py-2 rounded-xl bg-bg border border-line hover:bg-cream-surface text-xs font-medium transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="touch-target-44 px-4 py-2 rounded-xl bg-bad hover:bg-bad/90 text-white font-medium text-xs transition-colors disabled:opacity-50"
              >
                {cancelling ? "İptal Ediliyor..." : "İptal Et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
