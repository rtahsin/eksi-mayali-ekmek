"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Calendar,
  Truck,
  CheckCircle2,
  AlertCircle,
  Package,
  Navigation,
  ExternalLink,
  Compass,
  DollarSign,
  History,
  XCircle,
  UserCheck,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useCouriers } from "@/hooks/useCouriers";
import { usePayments } from "@/hooks/usePayments";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { PaymentRecordModal } from "@/components/admin/siparisler/PaymentRecordModal";
import { AdminOrder, AdminOrderStatus } from "@/types/admin";
import { Payment } from "@/types/payment";
import { OrderStatusHistoryEntry } from "@/types/orderStatusHistory";

export default function SingleOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const { allOrders, updateOrderStatus, assignCourier, cancelOrder, loading } = useAdminOrders();
  const { couriers } = useCouriers();
  const { fetchPaymentsByOrder } = usePayments();
  const { fetchStatusHistory } = useOrderHistory();

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistoryEntry[]>([]);

  const [slipOpen, setSlipOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Sync order data
  useEffect(() => {
    if (orderId && allOrders.length > 0) {
      const found = allOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
      if (found) {
        setOrder(found);
        setSelectedCourierId(found.courierId || "");
      }
    }
  }, [orderId, allOrders]);

  // Load payments and history
  const loadOrderExtraData = useCallback(async (id: string) => {
    const [pList, hList] = await Promise.all([
      fetchPaymentsByOrder(id),
      fetchStatusHistory(id),
    ]);
    setPayments(pList);
    setStatusHistory(hList);
  }, [fetchPaymentsByOrder, fetchStatusHistory]);

  useEffect(() => {
    if (order?.id) {
      loadOrderExtraData(order.id);
    }
  }, [order?.id, loadOrderExtraData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-400 text-xs font-serif">Sipariş verisi yükleniyor...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#18130F] border border-[#261E17] rounded-3xl text-center space-y-4 shadow-2xl">
        <AlertCircle className="w-12 h-12 text-[#F59E0B] mx-auto" />
        <h2 className="text-lg font-bold text-stone-100 font-serif">Sipariş Bulunamadı</h2>
        <p className="text-stone-400 text-xs">
          <strong>#{orderId}</strong> referansına ait sipariş kaydı veritabanında bulunamadı.
        </p>
        <Link
          href="/admin/siparisler"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#261E17] hover:bg-[#342920] text-stone-200 font-bold rounded-xl text-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Sipariş Listesine Dön</span>
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: AdminOrderStatus) => {
    setStatusUpdating(true);
    await updateOrderStatus(order.id, newStatus, undefined, "admin", undefined, "Admin panelinden güncellendi");
    setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    await loadOrderExtraData(order.id);
    setStatusUpdating(false);
  };

  const handleAssignCourier = async (cId: string) => {
    if (!cId) return;
    setStatusUpdating(true);
    await assignCourier(order.id, cId);
    setSelectedCourierId(cId);
    setOrder((prev) => (prev ? { ...prev, courierId: cId, status: "kuryede" } : null));
    await loadOrderExtraData(order.id);
    setStatusUpdating(false);
  };

  const handleCancel = async () => {
    setStatusUpdating(true);
    await cancelOrder(order.id, cancelReason || "Admin panelinden iptal edildi", "admin");
    setOrder((prev) => (prev ? { ...prev, status: "iptal", cancelReason } : null));
    setCancelModalOpen(false);
    await loadOrderExtraData(order.id);
    setStatusUpdating(false);
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("90")
      ? cleanPhone
      : cleanPhone.startsWith("0")
      ? `9${cleanPhone}`
      : `90${cleanPhone}`;

    let text = `Merhaba ${order.customerName} Hanım/Bey,\n`;
    text += `EkmekLab taş fırınından #${order.orderNumber || order.id.slice(-6)} numaralı siparişiniz hakkında:\n\n`;
    text += `📦 *Sipariş İçeriği:*\n`;
    order.items.forEach((it) => {
      text += `• ${it.quantity}x ${it.productName} (${it.totalPrice} ₺)\n`;
    });
    if (order.shippingFee > 0) {
      text += `• Kurye Teslimatı: ${order.shippingFee} ₺\n`;
    }
    text += `\n💰 *Toplam Tutar:* ${order.totalAmount} ₺\n`;
    text += `📅 *Teslimat Tarihi:* ${order.deliveryDate} (${order.deliveryTimeWindow || "14:00 - 18:00"})\n`;
    text += `📍 *Adres:* ${order.deliveryAddress}\n\n`;
    const trackingUrl = `https://ekmeklab.tr/siparis-takip/${order.orderNumber || order.id}`;
    text += `🔗 *Siparişinizi Canlı Takip Edin:*\n${trackingUrl}\n\n`;
    text += `Ekmekleriniz taş fırında sevgiyle hazırlanmaktadır. Afiyetle tüketiniz! 🌾🍞`;

    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const gpsMatch = order.deliveryAddress?.match(/(?:GPS|Konum):\s*([0-9.]+),\s*([0-9.]+)/i);
  const cleanAddress = order.deliveryAddress?.replace(/\[📍\s*(?:GPS|Konum):[^\]]+\]/g, "").trim();
  const mapQuery = encodeURIComponent(`${cleanAddress}, Beylikdüzü, İstanbul`);

  const mapsUrl = order.customerLat && order.customerLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${order.customerLat},${order.customerLng}`
    : gpsMatch
    ? `https://www.google.com/maps/dir/?api=1&destination=${gpsMatch[1]},${gpsMatch[2]}`
    : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const assignedCourier = couriers.find((c) => c.id === order.courierId);
  const totalPaid = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);

  const statusSteps: { key: AdminOrderStatus; label: string; icon: string }[] = [
    { key: "bekliyor", label: "Bekliyor", icon: "🟡" },
    { key: "hazirlaniyor", label: "Hazırlanıyor", icon: "🟠" },
    { key: "firinda", label: "Fırında", icon: "🔥" },
    { key: "kuryede", label: "Kuryede", icon: "🛵" },
    { key: "teslim_edildi", label: "Teslim Edildi", icon: "🟢" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/siparisler"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sipariş Listesine Geri Dön</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {order.phone && (
            <a
              href={`tel:${order.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#201812] hover:bg-[#2B2018] text-stone-200 rounded-xl text-xs font-semibold border border-[#261E17] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Ara</span>
            </a>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#201812] hover:bg-[#2B2018] text-stone-200 rounded-xl text-xs font-semibold border border-[#261E17] transition-colors"
            title="Haritada Yol Tarifi Al"
          >
            <Navigation className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Harita</span>
          </a>

          <Link
            href={`/siparis-takip/${order.orderNumber || order.id}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all"
            title="Müşteri Canlı Takip Ekranını Aç"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Müşteri Ekranı</span>
          </Link>

          <button
            onClick={() => setPaymentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Tahsilat Kaydet</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Detay</span>
          </button>

          <button
            onClick={() => setSlipOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black font-bold rounded-xl text-xs transition-all shadow-lg active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Fiş Yazdır</span>
          </button>
        </div>
      </div>

      {/* Main Order Header */}
      <div className="bg-[#18130F] border border-[#261E17] p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
            <span>Sipariş No:</span>
            <span className="font-bold text-[#F59E0B]">#{order.orderNumber || order.id}</span>
            <span>•</span>
            <span>{order.createdAt ? new Date(order.createdAt).toLocaleString("tr-TR") : order.deliveryDate}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F7EBD3] font-serif mt-1">
            {order.customerName}
          </h1>
          <p className="text-stone-400 text-xs mt-0.5 font-mono">
            {order.phone} • {order.neighborhood}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          {order.status !== "iptal" && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="text-xs text-rose-400 hover:text-rose-300 border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 rounded-xl transition-colors"
            >
              Siparişi İptal Et
            </button>
          )}
        </div>
      </div>

      {/* Status Stepper */}
      <div className="bg-[#18130F] border border-[#261E17] p-5 rounded-3xl shadow space-y-3">
        <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
          Sipariş Durumunu Değiştir
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {statusSteps.map((s) => {
            const isCurrent = order.status === s.key;
            return (
              <button
                key={s.key}
                disabled={statusUpdating}
                onClick={() => handleStatusChange(s.key)}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition-all ${
                  isCurrent
                    ? "bg-[#F59E0B] text-black border-[#F59E0B] shadow-md shadow-amber-500/20 scale-[1.02]"
                    : "bg-[#120E0B] border-[#261E17] text-stone-300 hover:border-stone-700 hover:bg-[#201812]"
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Items & Payments */}
        <div className="md:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 shadow space-y-4">
            <h3 className="font-serif font-bold text-stone-100 text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-[#F59E0B]" />
              <span>Sipariş Edilen Ürünler ({order.items.length})</span>
            </h3>

            <div className="divide-y divide-[#261E17]">
              {order.items.map((it, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#120E0B] border border-[#261E17] flex items-center justify-center text-[#F59E0B] font-serif font-bold text-sm">
                      {it.quantity}x
                    </div>
                    <div>
                      <div className="font-bold text-stone-100 text-sm">{it.productName}</div>
                      {it.weight && (
                        <div className="text-[11px] text-stone-400 font-mono">{it.weight}g Taş Fırın</div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-[#F59E0B] text-sm">
                      {it.totalPrice} ₺
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      Birim: {it.unitPrice} ₺
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="pt-4 border-t border-[#261E17] space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Ara Toplam:</span>
                <span className="font-mono">{order.subtotal || order.totalAmount - order.shippingFee} ₺</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Kurye Teslimat Bedeli:</span>
                <span className="font-mono">
                  {order.shippingFee === 0 ? (
                    <strong className="text-emerald-400">ÜCRETSİZ</strong>
                  ) : (
                    `${order.shippingFee} ₺`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-100 pt-2 border-t border-[#261E17]">
                <span>Toplam Tutar:</span>
                <span className="font-mono text-base text-[#F59E0B]">{order.totalAmount} ₺</span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 shadow space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-stone-100 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Tahsilat Kayıtları</span>
              </h3>
              <div className="text-xs font-mono">
                <span className="text-stone-400">Tahsil Edilen: </span>
                <span className="text-emerald-400 font-bold">{totalPaid} ₺</span>
                <span className="text-stone-500"> / {order.totalAmount} ₺</span>
              </div>
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">
                Henüz kayıtlı bir tahsilat bulunmuyor. "Tahsilat Kaydet" butonu ile ödeme girebilirsiniz.
              </p>
            ) : (
              <div className="divide-y divide-[#261E17] text-xs">
                {payments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-stone-200">
                        {p.method === "cash"
                          ? "💵 Nakit"
                          : p.method === "pos"
                          ? "💳 POS Kart"
                          : p.method === "transfer"
                          ? "🏦 Havale / EFT"
                          : p.method === "online_card"
                          ? "🌐 Online Kart"
                          : "🏢 Cari Hesap"}
                        {p.transactionRef && (
                          <span className="text-stone-500 text-[11px] ml-1.5 font-mono">
                            ({p.transactionRef})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {new Date(p.createdAt).toLocaleString("tr-TR")} • {p.collectedBy || "admin"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400 block">{p.amount} ₺</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status History (Audit Log) */}
          {statusHistory.length > 0 && (
            <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 shadow space-y-3">
              <h3 className="font-serif font-bold text-stone-100 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-[#F59E0B]" />
                <span>Denetim İzi & Durum Geçmişi</span>
              </h3>
              <div className="divide-y divide-[#261E17] text-xs">
                {statusHistory.map((h) => (
                  <div key={h.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-stone-300">
                        {h.fromStatus ? `${h.fromStatus} → ` : "Başlangıç: "}
                        <span className="text-[#F59E0B]">{h.toStatus}</span>
                      </span>
                      {h.note && <p className="text-[11px] text-stone-500 mt-0.5">{h.note}</p>}
                    </div>
                    <div className="text-right font-mono text-[11px] text-stone-500">
                      <div>{new Date(h.createdAt).toLocaleTimeString("tr-TR")}</div>
                      <div className="text-[10px] uppercase text-stone-600">{h.changedByRole}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Courier, Customer & Delivery Details */}
        <div className="space-y-6">
          {/* Courier Assignment Card */}
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 shadow space-y-3">
            <h3 className="font-serif font-bold text-stone-100 text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" />
              <span>Kurye Ataması</span>
            </h3>

            <div>
              <label className="text-[11px] text-stone-400 block mb-1.5 font-medium">
                Sorumlu Kuryeyi Seç:
              </label>
              <select
                value={selectedCourierId}
                onChange={(e) => handleAssignCourier(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#120E0B] border border-[#261E17] text-xs text-stone-200 focus:outline-none focus:border-[#F59E0B]"
              >
                <option value="">-- Kurye Atanmadı --</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.phone}) - {c.isOnShift ? "Vardiyada" : "Pasif"}
                  </option>
                ))}
              </select>
            </div>

            {assignedCourier && (
              <div className="p-3 rounded-xl bg-[#120E0B] border border-[#261E17] text-xs space-y-1">
                <div className="font-bold text-stone-200 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>{assignedCourier.displayName}</span>
                </div>
                <div className="text-stone-400">{assignedCourier.phone}</div>
                <div className="text-[10px] font-mono text-stone-500 uppercase">
                  Araç: {assignedCourier.vehicleType}
                </div>
              </div>
            )}
          </div>

          {/* Delivery & Address Card */}
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 shadow space-y-3 text-xs">
            <h3 className="font-serif font-bold text-stone-100 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#F59E0B]" />
              <span>Teslimat Bilgileri</span>
            </h3>

            <div className="space-y-1">
              <span className="text-stone-500 block">Teslimat Yöntemi:</span>
              <span className="font-bold text-stone-200">
                Beylikdüzü Kurye
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-stone-500 block">Teslimat Tarihi:</span>
              <span className="font-bold text-stone-200">
                {order.deliveryDate} ({order.deliveryTimeWindow || "14:00 - 18:00"})
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-stone-500 block">Mahalle:</span>
              <span className="font-bold text-stone-200">{order.neighborhood}</span>
            </div>

            <div className="space-y-1">
              <span className="text-stone-500 block">Açık Adres:</span>
              <p className="text-stone-300 leading-relaxed bg-[#120E0B] p-2.5 rounded-xl border border-[#261E17]">
                {order.deliveryAddress || "Atölye Teslim"}
              </p>
            </div>

            {/* Live Customer GPS Pin */}
            {(order.customerLat && order.customerLng) && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Müşteri Canlı Konumu Paylaştı</span>
                </div>
                <div className="text-[11px] font-mono text-stone-400">
                  {order.customerLat.toFixed(5)}, {order.customerLng.toFixed(5)}
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${order.customerLat},${order.customerLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#F59E0B] hover:underline font-medium"
                >
                  <span>Google Haritalarda Canlı Noktayı Aç</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slip Modal */}
      {slipOpen && (
        <OrderSlipModal
          order={order}
          isOpen={slipOpen}
          onClose={() => setSlipOpen(false)}
        />
      )}

      {/* Payment Record Modal */}
      {paymentModalOpen && (
        <PaymentRecordModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          orderId={order.id}
          orderNumber={order.orderNumber || order.id}
          totalAmount={order.totalAmount}
          existingPaidAmount={totalPaid}
          cariId={order.cariId}
          onPaymentSuccess={() => loadOrderExtraData(order.id)}
        />
      )}

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#18130F] border border-[#261E17] rounded-2xl p-6 text-stone-100 space-y-4">
            <h3 className="font-serif font-bold text-base text-rose-400 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <span>Siparişi İptal Et</span>
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              #{order.orderNumber || order.id} numaralı siparişi iptal etmek üzeresiniz. Bu işlem audit trail'e işlenecektir.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="İptal sebebi (örn: Müşteri arayıp vazgeçti, un tükendi vb.)..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-[#120E0B] border border-[#261E17] text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-[#F59E0B]"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                disabled={statusUpdating}
                className="px-4 py-2 rounded-xl bg-[#261E17] hover:bg-[#342920] text-xs font-medium transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleCancel}
                disabled={statusUpdating}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
              >
                {statusUpdating ? "İptal Ediliyor..." : "Siparişi İptal Et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
