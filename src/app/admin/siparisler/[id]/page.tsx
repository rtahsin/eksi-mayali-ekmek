"use client";

import React, { useState, useEffect } from "react";
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
  Store,
  Navigation,
  ExternalLink,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { AdminOrder, AdminOrderStatus } from "@/types/admin";

export default function SingleOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const { allOrders, updateOrderStatus, loading } = useAdminOrders();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (orderId && allOrders.length > 0) {
      const found = allOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
      if (found) {
        setOrder(found);
      }
    }
  }, [orderId, allOrders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-400 text-xs">Sipariş verisi yükleniyor...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-stone-900 border border-stone-800 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-stone-100 font-serif">Sipariş Bulunamadı</h2>
        <p className="text-stone-400 text-xs">
          <strong>#{orderId}</strong> numaralı sipariş veritabanında bulunamadı veya silinmiş olabilir.
        </p>
        <Link
          href="/admin/siparisler"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Sipariş Listesine Dön</span>
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: AdminOrderStatus) => {
    setStatusUpdating(true);
    await updateOrderStatus(order.id, newStatus);
    setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
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
    text += `Ekmekleriniz taş fırında sevgiyle hazırlanmaktadır. Afiyetle tüketiniz! 🌾🍞`;

    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const mapQuery = encodeURIComponent(`${order.deliveryAddress}, Beylikdüzü, İstanbul`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

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
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Ara</span>
            </a>
          )}

          {order.deliveryAddress && order.deliveryMethod === "courier" && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              <span>Harita</span>
            </a>
          )}

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Detay</span>
          </button>

          <button
            onClick={() => setSlipOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Fiş / Termal Yazdır</span>
          </button>
        </div>
      </div>

      {/* Main Order Header */}
      <div className="bg-stone-900/80 border border-stone-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
            <span>Sipariş No:</span>
            <span className="font-bold text-stone-100">#{order.orderNumber || order.id}</span>
            <span>•</span>
            <span>{order.createdAt ? new Date(order.createdAt).toLocaleString("tr-TR") : order.deliveryDate}</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 font-serif mt-1">
            {order.customerName}
          </h1>
          <p className="text-stone-400 text-xs mt-0.5 font-mono">
            {order.phone} • {order.neighborhood}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Status Stepper */}
      <div className="bg-stone-900/70 border border-stone-800 p-4 rounded-2xl shadow">
        <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-3">
          Sipariş Durumunu Güncelle
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
                    ? "bg-amber-500 text-stone-950 border-amber-500 shadow-md shadow-amber-500/20 scale-[1.02]"
                    : "bg-stone-950/60 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-800/60"
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
        {/* Left Column: Items */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 shadow space-y-4">
            <h3 className="font-serif font-bold text-stone-100 text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              <span>Sipariş Edilen Ürünler ({order.items.length})</span>
            </h3>

            <div className="divide-y divide-stone-800">
              {order.items.map((it, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-stone-800 flex items-center justify-center text-amber-400 font-serif font-bold text-sm">
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
                    <div className="font-mono font-bold text-amber-400 text-sm">
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
            <div className="pt-4 border-t border-stone-800 space-y-1.5 text-xs">
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
              <div className="flex justify-between text-sm font-bold text-stone-100 pt-2 border-t border-stone-800">
                <span>Toplam Tutar:</span>
                <span className="font-mono text-base text-amber-400">{order.totalAmount} ₺</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.orderNotes && (
            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-amber-400">Müşteri / Fırın Notu:</div>
              <p className="text-xs text-stone-300 italic">{order.orderNotes}</p>
            </div>
          )}
        </div>

        {/* Right Column: Customer & Delivery Information */}
        <div className="space-y-4">
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 shadow space-y-4">
            <h3 className="font-serif font-bold text-stone-100 text-base flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" />
              <span>Teslimat Detayı</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-stone-500 block">Teslimat Yöntemi:</span>
                <span className="font-bold text-stone-200">
                  {order.deliveryMethod === "pickup" ? "Atölyeden Gel-Al" : "Beylikdüzü Kurye"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-stone-500 block">Teslimat Tarihi & Saat:</span>
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
                <p className="text-stone-300 leading-relaxed bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
                  {order.deliveryAddress || "Atölye Teslim"}
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-stone-800">
                <span className="text-stone-500 block">Ödeme Yöntemi:</span>
                <span className="font-bold text-amber-400">
                  {order.paymentMethod === "cash_on_delivery" && "Kapıda Nakit Tahsilat"}
                  {order.paymentMethod === "pos_at_door" && "Kapıda Mobil POS (Kart)"}
                  {order.paymentMethod === "online" && "Online Kart ile Ödendi"}
                  {order.paymentMethod === "transfer" && "Havale / EFT ile Ödendi"}
                  {order.paymentMethod === "cari" && "Kurumsal Cari Hesaba Yazıldı"}
                </span>
              </div>
            </div>
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
    </div>
  );
}
