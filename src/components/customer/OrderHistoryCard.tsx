"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Order } from "@/types";
import {
  Package,
  Calendar,
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock,
  Flame,
  XCircle,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface OrderHistoryCardProps {
  order: Order;
  onOrderCancelled?: (orderId: string) => void;
}

export function OrderHistoryCard({ order, onOrderCancelled }: OrderHistoryCardProps) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canCancel = order.status === "bekliyor" || order.status === "onay_bekliyor";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "teslim_edildi":
        return {
          label: "Teslim Edildi",
          icon: CheckCircle2,
          className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "kuryede":
        return {
          label: "Kuryede (Yolda)",
          icon: Truck,
          className: "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse",
        };
      case "firinda":
        return {
          label: "Fırında Pişiyor",
          icon: Flame,
          className: "bg-orange-500/10 text-orange-400 border-orange-500/30",
        };
      case "hazirlaniyor":
        return {
          label: "Hazırlanıyor",
          icon: Package,
          className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "iptal":
        return {
          label: "İptal Edildi",
          icon: XCircle,
          className: "bg-stone-800 text-stone-400 border-stone-700",
        };
      default:
        return {
          label: "Sipariş Alındı",
          icon: Clock,
          className: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
        };
    }
  };

  const badge = getStatusBadge(order.status);
  const StatusIcon = badge.icon;

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || "Müşteri geçmiş siparişler sayfasından iptal etti",
          cancelledBy: "customer",
          userId: order.userId || undefined,
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

  const formattedDate = new Date(order.createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-[#18130F] border border-[#261E17] rounded-2xl p-5 hover:border-[#F59E0B]/30 transition-all space-y-4 shadow-lg group">
      {/* Header: Order Number, Date and Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#261E17] pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-stone-100">
              #{order.orderNumber || order.id.replace("ORD-", "")}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.className}`}
            >
              <StatusIcon className="w-3 h-3" />
              <span>{badge.label}</span>
            </span>
          </div>
          <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-stone-500" />
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-stone-400 block font-mono">Toplam</span>
          <span className="text-base font-serif font-bold text-[#F59E0B]">
            {order.totalAmount} ₺
          </span>
        </div>
      </div>

      {/* Items Summary */}
      <div className="space-y-2">
        <div className="text-xs text-stone-300 divide-y divide-[#261E17]">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#F59E0B]">
                  {item.quantity}x
                </span>
                <span className="text-stone-200">{item.productName}</span>
              </span>
              <span className="font-mono text-xs text-stone-400">{item.totalPrice} ₺</span>
            </div>
          ))}
        </div>
      </div>

      {/* Address & Delivery */}
      <div className="bg-[#120E0B] border border-[#261E17] rounded-xl p-3 text-xs text-stone-400 flex items-start gap-2">
        <MapPin className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
        <span className="line-clamp-2 leading-relaxed">{order.deliveryAddress}</span>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-1 gap-2">
        {canCancel ? (
          <button
            onClick={() => setCancelModalOpen(true)}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
          >
            İptal Et
          </button>
        ) : (
          <div className="text-[11px] text-stone-500 italic">
            {order.status === "iptal" ? "İptal edilmiş sipariş" : "Hazırlık/Teslimat aşamasında"}
          </div>
        )}

        <Link
          href={`/siparis-takip/${order.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#261E17] hover:bg-[#342920] text-[#F7EBD3] text-xs font-medium transition-colors ml-auto"
        >
          <span>Canlı Takip</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#F59E0B]" />
        </Link>
      </div>

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#18130F] border border-[#261E17] rounded-2xl p-6 text-stone-100 space-y-4">
            <h3 className="font-serif font-bold text-base text-[#F7EBD3]">Siparişi İptal Et</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              #{order.orderNumber || order.id} numaralı siparişinizi iptal etmek istediğinize emin misiniz?
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="İptal sebebiniz (isteğe bağlı)..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-[#120E0B] border border-[#261E17] text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-[#F59E0B]"
            />

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-[#261E17] hover:bg-[#342920] text-xs font-medium transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
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
