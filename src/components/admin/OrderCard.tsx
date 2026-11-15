"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Check, ChevronRight, Loader2, MapPin, MessageCircle, Navigation, Phone, Printer, Store, X } from "lucide-react";
import { AdminOrder, AdminOrderStatus } from "@/types/admin";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderSlipModal } from "./OrderSlipModal";
import { CancelDialog, DeliverDialog, MessageDialog } from "./siparisler/OrderActionDialogs";
import { canCancel, nextStep, paymentLabel } from "@/lib/orders/adminFlow";
import type { DeliveryPayment } from "@/lib/orders/delivery";
import { relativeTrDate } from "@/lib/time/istanbul";
import { CONTACT } from "@/lib/site";
import { useStoreSettings } from "@/hooks/useStoreSettings";

type Result = { success: boolean; error?: string };

interface OrderCardProps {
  order: AdminOrder;
  onUpdateStatus: (orderId: string, status: AdminOrderStatus, opts?: { note?: string; payment?: DeliveryPayment }) => Promise<Result>;
}

/** Adres metnindeki GPS işaretinden ya da adresten harita bağlantısı. */
export function mapsLink(order: Pick<AdminOrder, "deliveryAddress" | "customerLat" | "customerLng">): string {
  if (order.customerLat && order.customerLng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${order.customerLat},${order.customerLng}`;
  }
  const gps = order.deliveryAddress?.match(/(?:GPS|Konum):\s*([0-9.]+),\s*([0-9.]+)/i);
  if (gps) return `https://www.google.com/maps/dir/?api=1&destination=${gps[1]},${gps[2]}`;
  const clean = (order.deliveryAddress || "").replace(/\[📍\s*(?:GPS|Konum):[^\]]+\]/g, "").trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clean}, ${CONTACT.area}`)}`;
}

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const { adminUser } = useAdminAuth();
  const canViewFinance = hasCapability(adminUser?.role, "dashboard.finance");
  const canManageOrders = hasCapability(adminUser?.role, "orders.ops");
  const canReadCari = hasCapability(adminUser?.role, "cari.read");

  const { settings } = useStoreSettings();
  const [dialog, setDialog] = useState<"deliver" | "cancel" | "slip" | "message" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = nextStep(order);
  const pickup = order.deliveryMethod === "pickup";
  const timeWindow = order.deliveryTimeWindow || settings.deliveryWindow;

  const advance = async () => {
    if (!step) return;
    if (step.status === "teslim_edildi") return setDialog("deliver");
    setBusy(true);
    setError(null);
    const res = await onUpdateStatus(order.id, step.status);
    setBusy(false);
    if (!res.success) setError(res.error || "Durum değiştirilemedi");
  };

  const iconBtn =
    "flex-1 h-11 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center shrink-0 transition-colors";

  return (
    <div className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/siparisler/${order.id}`}
            className="font-serif text-base font-bold text-[#3B1E1A] hover:text-[#8E3D1B] hover:underline flex items-center gap-1"
          >
            <span className="truncate">{order.customerName}</span>
            <ChevronRight className="w-4 h-4 text-[#6E5148] shrink-0" aria-hidden="true" />
          </Link>
          <div className="text-xs text-[#6E5148] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono tabular-nums">#{order.orderNumber || order.id.slice(0, 6).toUpperCase()}</span>
            <span>
              {relativeTrDate(order.deliveryDate)} · {pickup ? "fırından alacak" : timeWindow}
            </span>
          </div>
        </div>
        {canViewFinance && (
          <div className="text-right shrink-0">
            <div className="font-mono tabular-nums text-base font-bold text-[#3B1E1A]">
              {order.totalAmount.toLocaleString("tr-TR")} ₺
            </div>
            <div className={`text-xs ${order.paymentStatus === "paid" ? "text-[#1D5130] font-semibold" : "text-[#6E5148]"}`}>
              {order.paymentStatus === "paid" ? "Ödendi" : paymentLabel(order.paymentMethod, order.deliveryMethod)}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <OrderStatusBadge status={order.status} deliveryMethod={order.deliveryMethod} />
        {canReadCari && order.cariId && (
          <span className="px-2 py-1 rounded-lg bg-[#F3E2D4] border border-[#DFB99F] text-[#8E3D1B] text-xs font-semibold flex items-center gap-1">
            <Building2 className="w-3 h-3" aria-hidden="true" /> Cari
          </span>
        )}
        {order.neighborhood && !pickup && (
          <span className="px-2 py-1 rounded-lg bg-[#FBF6EC] border border-[#E2D3BD] text-[#6E5148] text-xs font-medium">
            {order.neighborhood}
          </span>
        )}
      </div>

      <ul className="text-sm text-[#3B1E1A] space-y-0.5">
        {order.items.map((it, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="font-mono tabular-nums font-bold text-[#8E3D1B] w-8 shrink-0 text-right">{it.quantity}×</span>
            <span>{it.productName}</span>
          </li>
        ))}
      </ul>

      {pickup ? (
        <div className="text-xs text-[#6E5148] flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5" aria-hidden="true" /> Fırından teslim alacak
        </div>
      ) : (
        order.deliveryAddress && (
          <div className="text-xs text-[#6E5148] flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="line-clamp-2">{order.deliveryAddress}</span>
          </div>
        )
      )}

      {order.orderNotes && (
        <div className="text-xs text-[#7A4A0B] bg-[#FEF3D6] border border-[#E8C587] px-2.5 py-1.5 rounded-lg">
          Not: {order.orderNotes}
        </div>
      )}

      {order.status === "iptal" && order.cancelReason && (
        <div className="text-xs text-[#7D2114]">İptal sebebi: {order.cancelReason}</div>
      )}

      {error && (
        <p className="text-xs text-[#7D2114] bg-[#FCECE9] border border-[#E7B7AF] px-2.5 py-1.5 rounded-lg" role="alert">
          {error}
        </p>
      )}

      {canManageOrders && step && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void advance()}
          className={`w-full h-12 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 ${
            step.status === "teslim_edildi"
              ? "bg-[#1D5130] hover:bg-[#163F25] text-white"
              : "bg-[#B4532A] hover:bg-[#9C4421] text-white"
          }`}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
          <span>{step.label}</span>
        </button>
      )}

      <div className="flex items-center gap-2">
        {order.phone && (
          <a href={`tel:${order.phone}`} className={iconBtn} aria-label={`${order.customerName} ara`}>
            <Phone className="w-4 h-4" aria-hidden="true" />
          </a>
        )}
        {order.phone && (
          <button type="button" onClick={() => setDialog("message")} className={`${iconBtn} text-[#1D5130]`} aria-label="WhatsApp mesajı">
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        {!pickup && order.deliveryAddress && order.status !== "iptal" && (
          <a href={mapsLink(order)} target="_blank" rel="noopener noreferrer" className={iconBtn} aria-label="Haritada aç">
            <Navigation className="w-4 h-4" aria-hidden="true" />
          </a>
        )}
        {canViewFinance && (
          <button type="button" onClick={() => setDialog("slip")} className={iconBtn} aria-label="Fiş / etiket yazdır">
            <Printer className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        {canManageOrders && canCancel(order.status) && (
          <button
            type="button"
            onClick={() => setDialog("cancel")}
            className={`${iconBtn} hover:text-[#7D2114] hover:border-[#E7B7AF] hover:bg-[#FCECE9]`}
            aria-label="Siparişi iptal et"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {dialog === "message" && <MessageDialog order={order} onClose={() => setDialog(null)} />}
      {dialog === "deliver" && (
        <DeliverDialog order={order} onClose={() => setDialog(null)} onConfirm={(payment) => onUpdateStatus(order.id, "teslim_edildi", { payment })} />
      )}
      {dialog === "cancel" && (
        <CancelDialog order={order} onClose={() => setDialog(null)} onConfirm={(reason) => onUpdateStatus(order.id, "iptal", { note: reason })} />
      )}
      {canViewFinance && <OrderSlipModal order={order} isOpen={dialog === "slip"} onClose={() => setDialog(null)} />}
    </div>
  );
}
