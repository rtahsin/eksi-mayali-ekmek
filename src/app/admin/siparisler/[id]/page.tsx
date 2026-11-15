"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
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
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";
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
  const courierSelectId = useId();

  const { adminUser } = useAdminAuth();
  const canViewFinance = hasCapability(adminUser?.role, "dashboard.finance");
  const canManageOrders = hasCapability(adminUser?.role, "orders.ops");
  const canDispatchCourier = hasCapability(adminUser?.role, "courier.dispatch");

  const { allOrders, updateOrderStatus, assignCourier, loading, loadOrder } = useAdminOrders();
  const { couriers } = useCouriers();
  const { fetchPaymentsByOrder } = usePayments();
  const { fetchStatusHistory } = useOrderHistory();
  const { settings } = useStoreSettings();

  const order: AdminOrder | null = allOrders.find((o) => o.id === orderId || o.orderNumber === orderId) ?? null;
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
      const [pList, hList] = await Promise.all([
        canViewFinance ? fetchPaymentsByOrder(id) : Promise.resolve<Payment[]>([]),
        fetchStatusHistory(id),
      ]);
      setPayments(pList);
      setStatusHistory(hList);
    },
    [canViewFinance, fetchPaymentsByOrder, fetchStatusHistory]
  );

  useEffect(() => {
    if (order?.id) void loadOrderExtraData(order.id);
  }, [order?.id, order?.status, order?.paymentStatus, loadOrderExtraData]);

  if (loading || (!order && lookup !== "done")) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-[#6E5148] gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" /> Sipariş yükleniyor…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-[#E2D3BD] rounded-3xl text-center space-y-4 shadow-sm">
        <AlertCircle className="w-10 h-10 text-[#B4532A] mx-auto" aria-hidden="true" />
        <h2 className="text-lg font-bold text-[#3B1E1A] font-serif">Sipariş bulunamadı</h2>
        <p className="text-[#6E5148] text-sm font-mono tabular-nums">#{orderId} numaralı sipariş bulunamadı.</p>
        <Link
          href="/admin/siparisler"
          className="inline-flex items-center gap-2 h-11 px-5 bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] font-bold rounded-xl text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Siparişler
        </Link>
      </div>
    );
  }

  const pickup = order.deliveryMethod === "pickup";
  const current = FLOW.indexOf(order.status);
  const timeWindow = order.deliveryTimeWindow || settings.deliveryWindow;
  const totalPaid = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);
  const assignedCourier = couriers.find((c) => c.id === order.courierId);
  const showPayment = canViewFinance && order.status !== "iptal" && order.paymentStatus !== "paid" && order.totalAmount > 0;

  const goTo = async (status: AdminOrderStatus) => {
    if (!canManageOrders) return;
    if (status === "teslim_edildi") return setDialog("deliver");
    setBusy(true);
    setError(null);
    const res = await updateOrderStatus(order.id, status);
    setBusy(false);
    if (!res.success) setError(res.error || "Durum değiştirilemedi");
  };

  const handleAssignCourier = async (cId: string) => {
    if (!cId || !canDispatchCourier) return;
    setBusy(true);
    const res = await assignCourier(order.id, cId);
    setBusy(false);
    if (!res.success) setError(res.error || "Kurye atanamadı");
  };

  const actionBtn =
    "h-11 px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors";

  return (
    <>
      <div className="space-y-4 max-w-4xl mx-auto pb-16 print:hidden">
        <Link
          href="/admin/siparisler"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6E5148] hover:text-[#3B1E1A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Siparişler
        </Link>

        <div className="bg-white border border-[#E2D3BD] p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[#3B1E1A] font-serif truncate">{order.customerName}</h1>
              <p className="text-xs text-[#6E5148] font-mono tabular-nums mt-0.5">
                #{order.orderNumber || order.id} ·{" "}
                {new Date(order.createdAt).toLocaleString("tr-TR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Istanbul",
                })}
              </p>
            </div>
            <OrderStatusBadge status={order.status} deliveryMethod={order.deliveryMethod} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {order.phone && (
              <a href={`tel:${order.phone}`} className={actionBtn}>
                <Phone className="w-4 h-4 text-[#B4532A]" aria-hidden="true" /> Ara
              </a>
            )}
            {order.phone && (
              <button type="button" onClick={() => setDialog("message")} className={actionBtn}>
                <MessageCircle className="w-4 h-4 text-[#1D5130]" aria-hidden="true" /> WhatsApp
              </button>
            )}
            {!pickup && order.deliveryAddress && (
              <a href={mapsLink(order)} target="_blank" rel="noopener noreferrer" className={actionBtn}>
                <Navigation className="w-4 h-4 text-[#B4532A]" aria-hidden="true" /> Harita
              </a>
            )}
            {canViewFinance && (
              <button type="button" onClick={() => setDialog("slip")} className={actionBtn}>
                <Printer className="w-4 h-4 text-[#B4532A]" aria-hidden="true" /> Fiş
              </button>
            )}
          </div>
        </div>

        {/* Durum: geçilen adımlar işaretli, ileri adımlara atlanabilir (geri dönüş yok) */}
        {order.status !== "iptal" ? (
          <div className="bg-white border border-[#E2D3BD] p-4 rounded-2xl shadow-sm space-y-3">
            <ol className="grid grid-cols-5 gap-1.5">
              {FLOW.map((s, i) => {
                const done = i <= current;
                const isNext = i === current + 1;
                return (
                  <li key={s}>
                    <button
                      type="button"
                      disabled={!canManageOrders || busy || done}
                      onClick={() => void goTo(s)}
                      aria-current={i === current ? "step" : undefined}
                      className={`w-full min-h-12 px-1 py-2 rounded-xl text-xs font-bold border leading-tight flex flex-col items-center justify-center gap-0.5 transition-colors ${
                        i === current
                          ? "bg-[#B4532A] text-white border-[#B4532A] shadow-sm"
                          : done
                            ? "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148]"
                            : isNext
                              ? "bg-[#F3E2D4] border-[#B4532A]/60 text-[#8E3D1B] hover:bg-[#EBD3C0]"
                              : "bg-white border-[#E2D3BD] text-[#6E5148] hover:border-[#B4532A]/40"
                      }`}
                    >
                      {done && i !== current && <Check className="w-3 h-3 text-[#1D5130]" aria-hidden="true" />}
                      {statusLabel(s, order.deliveryMethod)}
                    </button>
                  </li>
                );
              })}
            </ol>
            {error && (
              <p className="text-sm font-medium text-[#7D2114] bg-[#FCECE9] border border-[#E7B7AF] rounded-xl px-3 py-2" role="alert">
                {error}
              </p>
            )}
            {canManageOrders && canCancel(order.status) && (
              <button
                type="button"
                onClick={() => setDialog("cancel")}
                className="text-xs font-semibold text-[#7D2114] hover:text-[#3B1E1A] underline underline-offset-2"
              >
                Siparişi iptal et
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#FCECE9] border border-[#E7B7AF] text-sm text-[#7D2114]">
            <span className="font-semibold">İptal edildi</span>
            {order.cancelReason ? `: ${order.cancelReason}` : ""}
            {order.cancelledAt && (
              <span className="text-[#6E5148] font-mono tabular-nums">
                {" "}
                · {new Date(order.cancelledAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-[#E2D3BD] rounded-2xl p-4 shadow-sm space-y-3">
              <h2 className="font-serif font-bold text-[#3B1E1A]">Ürünler</h2>
              <ul className="divide-y divide-[#E2D3BD]">
                {order.items.map((it, idx) => (
                  <li key={idx} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#3B1E1A] font-medium">
                      <span className="font-mono tabular-nums font-bold text-[#8E3D1B] mr-2">{it.quantity}×</span>
                      {it.productName}
                    </span>
                    {canViewFinance && (
                      <span className="font-mono tabular-nums text-[#3B1E1A] font-semibold shrink-0">
                        {it.totalPrice.toLocaleString("tr-TR")} ₺
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {canViewFinance && (
                <dl className="pt-3 border-t border-[#E2D3BD] space-y-1 text-sm">
                  <div className="flex justify-between text-[#6E5148]">
                    <dt>Ara toplam</dt>
                    <dd className="font-mono tabular-nums">
                      {(order.subtotal || order.totalAmount - order.shippingFee).toLocaleString("tr-TR")} ₺
                    </dd>
                  </div>
                  {!pickup && (
                    <div className="flex justify-between text-[#6E5148]">
                      <dt>Teslimat</dt>
                      <dd className="font-mono tabular-nums">
                        {order.shippingFee === 0 ? "Ücretsiz" : `${order.shippingFee.toLocaleString("tr-TR")} ₺`}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#3B1E1A] pt-1">
                    <dt>Toplam</dt>
                    <dd className="font-mono tabular-nums text-[#8E3D1B]">{order.totalAmount.toLocaleString("tr-TR")} ₺</dd>
                  </div>
                </dl>
              )}
            </div>

            {canViewFinance && (
              <div className="bg-white border border-[#E2D3BD] rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-serif font-bold text-[#3B1E1A] flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#1D5130]" aria-hidden="true" /> Ödeme
                  </h2>
                  <span className="text-sm font-mono tabular-nums">
                    <span className={totalPaid >= order.totalAmount && order.totalAmount > 0 ? "text-[#1D5130] font-bold" : "text-[#3B1E1A] font-semibold"}>
                      {totalPaid.toLocaleString("tr-TR")}
                    </span>
                    <span className="text-[#6E5148]"> / {order.totalAmount.toLocaleString("tr-TR")} ₺</span>
                  </span>
                </div>
                <p className="text-xs text-[#6E5148]">
                  Yöntem: {order.paymentMethod === "cari" ? "Cariye yazılacak" : paymentLabel(order.paymentMethod, order.deliveryMethod)}
                  {order.cariId ? " · cari sipariş: borç teslimde cariye yazılır" : ""}
                </p>
                {payments.length > 0 && (
                  <ul className="divide-y divide-[#E2D3BD] text-sm">
                    {payments.map((p) => (
                      <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[#3B1E1A] font-medium">{PAYMENT_ROW_LABELS[p.method] || p.method}</div>
                          <div className="text-xs text-[#6E5148] font-mono tabular-nums">
                            {new Date(p.createdAt).toLocaleString("tr-TR", {
                              dateStyle: "short",
                              timeStyle: "short",
                              timeZone: "Europe/Istanbul",
                            })}
                            {p.status !== "completed" && ` · ${p.status === "failed" ? "geçersiz" : p.status}`}
                          </div>
                        </div>
                        <span
                          className={`font-mono tabular-nums font-semibold ${
                            p.status === "completed" ? "text-[#1D5130]" : "text-[#6E5148] line-through"
                          }`}
                        >
                          {p.amount.toLocaleString("tr-TR")} ₺
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {showPayment && (
                  <button
                    type="button"
                    onClick={() => setDialog("payment")}
                    className="w-full h-11 rounded-xl bg-[#E5EFE7] hover:bg-[#D5E6D9] border border-[#B4D3BC] text-[#1D5130] text-sm font-bold transition-colors"
                  >
                    {order.status === "teslim_edildi" ? "Alınan ödemeyi kaydet" : "Teslimden önce ödeme al"}
                  </button>
                )}
              </div>
            )}

            {statusHistory.length > 0 && (
              <div className="bg-white border border-[#E2D3BD] rounded-2xl p-4 shadow-sm space-y-2">
                <h2 className="font-serif font-bold text-[#3B1E1A] flex items-center gap-2">
                  <History className="w-4 h-4 text-[#B4532A]" aria-hidden="true" /> Geçmiş
                </h2>
                <ul className="divide-y divide-[#E2D3BD] text-sm">
                  {statusHistory.map((h) => (
                    <li key={h.id} className="py-2 flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[#6E5148]">
                          {h.fromStatus ? `${historyLabel(h.fromStatus, order.deliveryMethod)} → ` : ""}
                          <span className="text-[#8E3D1B] font-semibold">{historyLabel(h.toStatus, order.deliveryMethod)}</span>
                        </span>
                        {h.note && <p className="text-xs text-[#6E5148] mt-0.5">{h.note}</p>}
                      </div>
                      <span className="font-mono tabular-nums text-xs text-[#6E5148] shrink-0">
                        {new Date(h.createdAt).toLocaleString("tr-TR", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "Europe/Istanbul",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-[#E2D3BD] rounded-2xl p-4 shadow-sm space-y-3 text-sm">
              <h2 className="font-serif font-bold text-[#3B1E1A] flex items-center gap-2">
                {pickup ? (
                  <Store className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
                ) : (
                  <MapPin className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
                )}{" "}
                Teslimat
              </h2>
              <div>
                <div className="text-xs text-[#6E5148]">Gün</div>
                <div className="text-[#3B1E1A] font-medium font-mono tabular-nums">
                  {formatTrDate(order.deliveryDate, "long")}
                  {!pickup && `, ${timeWindow}`}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#6E5148]">Şekil</div>
                <div className="text-[#3B1E1A]">{pickup ? "Fırından teslim alacak" : "Adrese teslim"}</div>
              </div>
              {order.phone && (
                <div>
                  <div className="text-xs text-[#6E5148]">Telefon</div>
                  <div className="text-[#3B1E1A] font-mono tabular-nums">{order.phone}</div>
                </div>
              )}
              {!pickup && (
                <div>
                  <div className="text-xs text-[#6E5148]">Adres{order.neighborhood ? ` · ${order.neighborhood}` : ""}</div>
                  <p className="text-[#3B1E1A] leading-relaxed select-all">{order.deliveryAddress || "—"}</p>
                </div>
              )}
              {order.orderNotes && (
                <div className="text-[#7A4A0B] bg-[#FEF3D6] border border-[#E8C587] p-2.5 rounded-lg text-xs">
                  <strong>Not:</strong> {order.orderNotes}
                </div>
              )}
              <Link
                href={`/siparis-takip/${order.orderNumber || order.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8E3D1B] hover:text-[#3B1E1A] underline underline-offset-2"
              >
                Müşterinin takip ekranı <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>

            {FEATURES.courierManagement && canDispatchCourier && (
              <div className="bg-white border border-[#E2D3BD] rounded-2xl p-4 shadow-sm space-y-3">
                <label htmlFor={courierSelectId} className="font-serif font-bold text-[#3B1E1A] text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#24476B]" aria-hidden="true" /> Kurye
                </label>
                <select
                  id={courierSelectId}
                  value={order.courierId || ""}
                  onChange={(e) => void handleAssignCourier(e.target.value)}
                  disabled={busy}
                  className="w-full h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm text-[#3B1E1A] focus:outline-none focus:border-[#B4532A]"
                >
                  <option value="">Kurye atanmadı</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} ({c.phone})
                    </option>
                  ))}
                </select>
                {assignedCourier && (
                  <div className="text-xs font-medium text-[#24476B] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" aria-hidden="true" /> {assignedCourier.displayName}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {canViewFinance && <OrderSlipModal order={order} isOpen={dialog === "slip"} onClose={() => setDialog(null)} />}
      {dialog === "message" && <MessageDialog order={order} onClose={() => setDialog(null)} />}
      {dialog === "deliver" && (
        <DeliverDialog
          order={order}
          onClose={() => setDialog(null)}
          onConfirm={(payment) => updateOrderStatus(order.id, "teslim_edildi", { payment })}
        />
      )}
      {dialog === "cancel" && (
        <CancelDialog
          order={order}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => updateOrderStatus(order.id, "iptal", { note: reason })}
        />
      )}
      {canViewFinance && dialog === "payment" && (
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
    </>
  );
}
