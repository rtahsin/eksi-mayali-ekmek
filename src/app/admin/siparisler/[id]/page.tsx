"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ExternalLink,
  History,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Printer,
  Store,
  Truck,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useCouriers } from "@/hooks/useCouriers";
import { usePayments } from "@/hooks/usePayments";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { FEATURES } from "@/lib/features";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { mapsLink } from "@/components/admin/OrderCard";
import { PaymentRecordModal } from "@/components/admin/siparisler/PaymentRecordModal";
import { CancelDialog, DeliverDialog, MessageDialog } from "@/components/admin/siparisler/OrderActionDialogs";
import { AdminOrder, AdminOrderStatus } from "@/types/admin";
import { Payment } from "@/types/payment";
import { OrderStatusHistoryEntry } from "@/types/orderStatusHistory";
import { canCancel, paymentLabel, statusLabel } from "@/lib/orders/adminFlow";
import { formatTrDate } from "@/lib/time/istanbul";

const FLOW: AdminOrderStatus[] = ["bekliyor", "hazirlaniyor", "firinda", "kuryede", "teslim_edildi"];

const PAYMENT_ROW_LABELS: Record<string, string> = {
  cash: "Nakit",
  pos: "Kart (POS)",
  transfer: "Havale / EFT",
  online_card: "Online kart",
  cari: "Cari",
};

function historyLabel(raw: string | null, method: AdminOrder["deliveryMethod"]): string {
  if (!raw) return "";
  return FLOW.includes(raw as AdminOrderStatus) || raw === "iptal" ? statusLabel(raw as AdminOrderStatus, method) : raw;
}

export default function SingleOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const { allOrders, updateOrderStatus, assignCourier, loading, loadOrder } = useAdminOrders();
  const { couriers } = useCouriers();
  const { fetchPaymentsByOrder } = usePayments();
  const { fetchStatusHistory } = useOrderHistory();
  const { settings } = useStoreSettings();

  const order: AdminOrder | null = allOrders.find((o) => o.id === orderId || o.orderNumber === orderId) ?? null;
  // Yüklü listede yoksa (eski sipariş) sunucudan bir kez getir
  const [lookup, setLookup] = useState<"idle" | "loading" | "done">("idle");
  useEffect(() => {
    if (loading || order || lookup !== "idle" || !orderId) return;
    setLookup("loading");
    void loadOrder(orderId).finally(() => setLookup("done"));
  }, [loading, order, lookup, orderId, loadOrder]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistoryEntry[]>([]);
  const [dialog, setDialog] = useState<"slip" | "payment" | "cancel" | "deliver" | "message" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrderExtraData = useCallback(
    async (id: string) => {
      const [pList, hList] = await Promise.all([fetchPaymentsByOrder(id), fetchStatusHistory(id)]);
      setPayments(pList);
      setStatusHistory(hList);
    },
    [fetchPaymentsByOrder, fetchStatusHistory]
  );

  // Durum değişince (realtime ya da bu sayfadan) ödeme ve geçmiş yeniden okunur
  useEffect(() => {
    if (order?.id) void loadOrderExtraData(order.id);
  }, [order?.id, order?.status, order?.paymentStatus, loadOrderExtraData]);

  if (loading || (!order && lookup !== "done")) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-stone-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Sipariş yükleniyor…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-[#18130F] border border-[#261E17] rounded-3xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-stone-100 font-serif">Sipariş bulunamadı</h2>
        <p className="text-stone-400 text-sm">#{orderId} numaralı sipariş bulunamadı.</p>
        <Link href="/admin/siparisler" className="inline-flex items-center gap-2 h-11 px-5 bg-[#261E17] text-stone-200 font-bold rounded-xl text-sm">
          <ArrowLeft className="w-4 h-4" /> Siparişler
        </Link>
      </div>
    );
  }

  const pickup = order.deliveryMethod === "pickup";
  const current = FLOW.indexOf(order.status);
  const timeWindow = order.deliveryTimeWindow || settings.deliveryWindow;
  const totalPaid = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);
  const assignedCourier = couriers.find((c) => c.id === order.courierId);
  const showPayment = order.status !== "iptal" && order.paymentStatus !== "paid" && order.totalAmount > 0;

  const goTo = async (status: AdminOrderStatus) => {
    if (status === "teslim_edildi") return setDialog("deliver");
    setBusy(true);
    setError(null);
    const res = await updateOrderStatus(order.id, status);
    setBusy(false);
    if (!res.success) setError(res.error || "Durum değiştirilemedi");
  };

  const handleAssignCourier = async (cId: string) => {
    if (!cId) return;
    setBusy(true);
    const res = await assignCourier(order.id, cId);
    setBusy(false);
    if (!res.success) setError(res.error || "Kurye atanamadı");
  };

  const actionBtn = "h-11 px-3 rounded-xl bg-[#201812] border border-[#2A201A] text-stone-200 text-sm font-medium flex items-center justify-center gap-1.5";

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      <Link href="/admin/siparisler" className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-200">
        <ArrowLeft className="w-4 h-4" /> Siparişler
      </Link>

      <div className="bg-[#18130F] border border-[#261E17] p-4 sm:p-5 rounded-2xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-stone-100 font-serif truncate">{order.customerName}</h1>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              #{order.orderNumber || order.id} · {new Date(order.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" })}
            </p>
          </div>
          <OrderStatusBadge status={order.status} deliveryMethod={order.deliveryMethod} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {order.phone && (
            <a href={`tel:${order.phone}`} className={actionBtn}>
              <Phone className="w-4 h-4 text-amber-400" /> Ara
            </a>
          )}
          {order.phone && (
            <button type="button" onClick={() => setDialog("message")} className={actionBtn}>
              <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp
            </button>
          )}
          {!pickup && order.deliveryAddress && (
            <a href={mapsLink(order)} target="_blank" rel="noopener noreferrer" className={actionBtn}>
              <Navigation className="w-4 h-4 text-amber-400" /> Harita
            </a>
          )}
          <button type="button" onClick={() => setDialog("slip")} className={actionBtn}>
            <Printer className="w-4 h-4 text-amber-400" /> Fiş
          </button>
        </div>
      </div>

      {/* Durum: geçilen adımlar işaretli, ileri adımlara atlanabilir (geri dönüş yok) */}
      {order.status !== "iptal" ? (
        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-3">
          <ol className="grid grid-cols-5 gap-1.5">
            {FLOW.map((s, i) => {
              const done = i <= current;
              const isNext = i === current + 1;
              return (
                <li key={s}>
                  <button
                    type="button"
                    disabled={busy || done}
                    onClick={() => void goTo(s)}
                    aria-current={i === current ? "step" : undefined}
                    className={`w-full min-h-12 px-1 py-2 rounded-xl text-xs font-bold border leading-tight flex flex-col items-center justify-center gap-0.5 ${
                      i === current
                        ? "bg-artisan-terracotta text-white border-artisan-terracotta"
                        : done
                        ? "bg-[#120E0B] border-[#261E17] text-stone-500"
                        : isNext
                        ? "bg-[#201812] border-amber-500/50 text-amber-200"
                        : "bg-[#120E0B] border-[#261E17] text-stone-400"
                    }`}
                  >
                    {done && i !== current && <Check className="w-3 h-3" />}
                    {statusLabel(s, order.deliveryMethod)}
                  </button>
                </li>
              );
            })}
          </ol>
          {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
          {canCancel(order.status) && (
            <button type="button" onClick={() => setDialog("cancel")} className="text-xs text-rose-300 hover:text-rose-200 underline underline-offset-2">
              Siparişi iptal et
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-700 text-sm text-stone-300">
          İptal edildi{order.cancelReason ? `: ${order.cancelReason}` : ""}
          {order.cancelledAt && <span className="text-stone-500"> · {new Date(order.cancelledAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</span>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-[#18130F] border border-[#261E17] rounded-2xl p-4 space-y-3">
            <h2 className="font-serif font-bold text-stone-100">Ürünler</h2>
            <ul className="divide-y divide-[#261E17]">
              {order.items.map((it, idx) => (
                <li key={idx} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-100">
                    <span className="font-mono font-bold text-amber-400 mr-2">{it.quantity}×</span>
                    {it.productName}
                  </span>
                  <span className="font-mono text-stone-300 shrink-0">{it.totalPrice.toLocaleString("tr-TR")} ₺</span>
                </li>
              ))}
            </ul>
            <dl className="pt-3 border-t border-[#261E17] space-y-1 text-sm">
              <div className="flex justify-between text-stone-400">
                <dt>Ara toplam</dt>
                <dd className="font-mono">{(order.subtotal || order.totalAmount - order.shippingFee).toLocaleString("tr-TR")} ₺</dd>
              </div>
              {!pickup && (
                <div className="flex justify-between text-stone-400">
                  <dt>Teslimat</dt>
                  <dd className="font-mono">{order.shippingFee === 0 ? "Ücretsiz" : `${order.shippingFee.toLocaleString("tr-TR")} ₺`}</dd>
                </div>
              )}
              <div className="flex justify-between font-bold text-stone-100 pt-1">
                <dt>Toplam</dt>
                <dd className="font-mono text-amber-400">{order.totalAmount.toLocaleString("tr-TR")} ₺</dd>
              </div>
            </dl>
          </div>

          <div className="bg-[#18130F] border border-[#261E17] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif font-bold text-stone-100 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" /> Ödeme
              </h2>
              <span className="text-sm font-mono">
                <span className={totalPaid >= order.totalAmount && order.totalAmount > 0 ? "text-emerald-400" : "text-stone-300"}>{totalPaid.toLocaleString("tr-TR")}</span>
                <span className="text-stone-500"> / {order.totalAmount.toLocaleString("tr-TR")} ₺</span>
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Yöntem: {order.paymentMethod === "cari" ? "Cariye yazılacak" : paymentLabel(order.paymentMethod, order.deliveryMethod)}
              {order.cariId ? " · cari sipariş: borç teslimde cariye yazılır" : ""}
            </p>
            {payments.length > 0 && (
              <ul className="divide-y divide-[#261E17] text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-stone-200">{PAYMENT_ROW_LABELS[p.method] || p.method}</div>
                      <div className="text-xs text-stone-500">
                        {new Date(p.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" })}
                        {p.status !== "completed" && ` · ${p.status === "failed" ? "geçersiz" : p.status}`}
                      </div>
                    </div>
                    <span className={`font-mono ${p.status === "completed" ? "text-emerald-400" : "text-stone-500 line-through"}`}>{p.amount.toLocaleString("tr-TR")} ₺</span>
                  </li>
                ))}
              </ul>
            )}
            {showPayment && (
              <button type="button" onClick={() => setDialog("payment")} className="w-full h-11 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm font-bold">
                {order.status === "teslim_edildi" ? "Alınan ödemeyi kaydet" : "Teslimden önce ödeme al"}
              </button>
            )}
          </div>

          {statusHistory.length > 0 && (
            <div className="bg-[#18130F] border border-[#261E17] rounded-2xl p-4 space-y-2">
              <h2 className="font-serif font-bold text-stone-100 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" /> Geçmiş
              </h2>
              <ul className="divide-y divide-[#261E17] text-sm">
                {statusHistory.map((h) => (
                  <li key={h.id} className="py-2 flex items-start justify-between gap-3">
                    <div>
                      <span className="text-stone-200">
                        {h.fromStatus ? `${historyLabel(h.fromStatus, order.deliveryMethod)} → ` : ""}
                        <span className="text-amber-300">{historyLabel(h.toStatus, order.deliveryMethod)}</span>
                      </span>
                      {h.note && <p className="text-xs text-stone-500 mt-0.5">{h.note}</p>}
                    </div>
                    <span className="font-mono text-xs text-stone-500 shrink-0">
                      {new Date(h.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-[#18130F] border border-[#261E17] rounded-2xl p-4 space-y-3 text-sm">
            <h2 className="font-serif font-bold text-stone-100 flex items-center gap-2">
              {pickup ? <Store className="w-4 h-4 text-amber-400" /> : <MapPin className="w-4 h-4 text-amber-400" />} Teslimat
            </h2>
            <div>
              <div className="text-xs text-stone-500">Gün</div>
              <div className="text-stone-200 font-medium">
                {formatTrDate(order.deliveryDate, "long")}
                {!pickup && `, ${timeWindow}`}
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Şekil</div>
              <div className="text-stone-200">{pickup ? "Fırından teslim alacak" : "Adrese teslim"}</div>
            </div>
            {order.phone && (
              <div>
                <div className="text-xs text-stone-500">Telefon</div>
                <div className="text-stone-200 font-mono">{order.phone}</div>
              </div>
            )}
            {!pickup && (
              <div>
                <div className="text-xs text-stone-500">Adres{order.neighborhood ? ` · ${order.neighborhood}` : ""}</div>
                <p className="text-stone-300 leading-relaxed select-all">{order.deliveryAddress || "—"}</p>
              </div>
            )}
            {order.orderNotes && (
              <div className="text-amber-200/90 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg text-xs">Not: {order.orderNotes}</div>
            )}
            <Link
              href={`/siparis-takip/${order.orderNumber || order.id}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200 underline underline-offset-2"
            >
              Müşterinin takip ekranı <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {FEATURES.courierManagement && (
            <div className="bg-[#18130F] border border-[#261E17] rounded-2xl p-4 space-y-3">
              <h2 className="font-serif font-bold text-stone-100 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" /> Kurye
              </h2>
              <select
                value={order.courierId || ""}
                onChange={(e) => void handleAssignCourier(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#120E0B] border border-[#261E17] text-sm text-stone-200"
              >
                <option value="">Kurye atanmadı</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.phone})
                  </option>
                ))}
              </select>
              {assignedCourier && (
                <div className="text-xs text-stone-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" /> {assignedCourier.displayName}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <OrderSlipModal order={order} isOpen={dialog === "slip"} onClose={() => setDialog(null)} />
      {dialog === "message" && <MessageDialog order={order} onClose={() => setDialog(null)} />}
      {dialog === "deliver" && (
        <DeliverDialog order={order} onClose={() => setDialog(null)} onConfirm={(payment) => updateOrderStatus(order.id, "teslim_edildi", { payment })} />
      )}
      {dialog === "cancel" && (
        <CancelDialog order={order} onClose={() => setDialog(null)} onConfirm={(reason) => updateOrderStatus(order.id, "iptal", { note: reason })} />
      )}
      {dialog === "payment" && (
        <PaymentRecordModal
          isOpen
          onClose={() => setDialog(null)}
          orderId={order.id}
          orderNumber={order.orderNumber || order.id}
          totalAmount={order.totalAmount}
          existingPaidAmount={totalPaid}
          cariId={order.cariId}
          onPaymentSuccess={() => void loadOrderExtraData(order.id)}
        />
      )}
    </div>
  );
}
