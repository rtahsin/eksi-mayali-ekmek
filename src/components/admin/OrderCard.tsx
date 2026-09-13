"use client";

import React, { useState } from "react";
import { AdminOrder, AdminOrderStatus } from "@/types/admin";
import { OrderStatusBadge } from "./OrderStatusBadge";
import {
  Phone,
  MapPin,
  MessageSquare,
  Navigation,
  Check,
  Flame,
  Truck,
  ChefHat,
  ChevronDown,
  Clock,
  Building2,
  Globe,
  Smartphone,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { OrderSlipModal } from "./OrderSlipModal";

interface OrderCardProps {
  order: AdminOrder;
  onUpdateStatus: (orderId: string, newStatus: AdminOrderStatus) => Promise<any>;
}

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const cleanPhone = order.phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("90")
    ? cleanPhone
    : cleanPhone.startsWith("0")
    ? `9${cleanPhone}`
    : `90${cleanPhone}`;

  // WhatsApp Notification Message Generator
  const sendWhatsAppNotification = (type: "received" | "baking" | "on_delivery" | "delivered") => {
    let msg = "";
    const itemsSummary = order.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ");

    switch (type) {
      case "received":
        msg = `Merhaba ${order.customerName}, EkmekLab taş fırınından siparişiniz alındı: ${itemsSummary}. Teslimat günü: ${order.deliveryDate} (${order.deliveryTimeWindow || "14:00 - 18:00"}). Toplam: ${order.totalAmount} TL. Afiyetle kalın! 🍞`;
        break;
      case "baking":
        msg = `Merhaba ${order.customerName}, ekşi mayalı ekmekleriniz taş fırında pişti ve paketleniyor. Kısa süre içinde Beylikdüzü kuryemize teslim edilecek. EkmekLab 🥖`;
        break;
      case "on_delivery":
        msg = `Merhaba ${order.customerName}, EkmekLab fırın kuryemiz siparişinizi teslim etmek üzere yola çıktı. Tahmini teslimat bugün 14:00 - 18:00 arasındadır. Adres: ${order.deliveryAddress}. 🛵`;
        break;
      case "delivered":
        msg = `Merhaba ${order.customerName}, siparişiniz teslim edilmiştir. EkmekLab'ı tercih ettiğiniz için teşekkür ederiz. Ekşi mayalı lezzetlerimiz afiyet olsun! 🌾`;
        break;
    }

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setShowWhatsAppMenu(false);
  };

  const handleNextStatus = async () => {
    setIsUpdating(true);
    let next: AdminOrderStatus = "hazirlaniyor";
    if (order.status === "bekliyor") next = "hazirlaniyor";
    else if (order.status === "hazirlaniyor") next = "firinda";
    else if (order.status === "firinda") next = "kuryede";
    else if (order.status === "kuryede") next = "teslim_edildi";

    await onUpdateStatus(order.id, next);
    setIsUpdating(false);
  };

  return (
    <div className="bg-[#18130F] border border-[#2A201A] hover:border-artisan-gold/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-lg transition-all">
      {/* Top Meta Bar */}
      <div>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#261D17]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/siparisler/${order.id}`}
                className="font-mono text-xs font-bold text-artisan-gold hover:underline"
                title="Sipariş Detayına Git"
              >
                #{order.orderNumber || order.id.substring(0, 6).toUpperCase()}
              </Link>
              <OrderStatusBadge status={order.status} />
              {order.source === "whatsapp" && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-sans flex items-center gap-1">
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>WhatsApp</span>
                </span>
              )}
              {order.source === "web" && (
                <span className="px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-500/30 text-blue-400 text-[10px] font-sans flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  <span>Web</span>
                </span>
              )}
              {order.paymentMethod === "cari" && (
                <span className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-sans flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" />
                  <span>Cari</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-foreground/60 font-sans">
              <Clock className="w-3 h-3 text-artisan-gold/70" />
              <span>Teslimat: {order.deliveryDate} · {order.deliveryTimeWindow || "14:00 - 18:00"}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-serif text-base font-bold text-foreground">
              {order.totalAmount} ₺
            </div>
            <div className="text-[10px] text-foreground/50 font-sans">
              {order.paymentMethod === "cash_on_delivery"
                ? "Kapıda Nakit"
                : order.paymentMethod === "pos_at_door"
                ? "Kapıda POS"
                : order.paymentMethod === "online"
                ? "Online Ödendi"
                : order.paymentMethod === "cari"
                ? "Cari Borç"
                : "Havale"}
            </div>
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className="py-3 space-y-2 text-xs font-sans">
          <div className="flex items-center justify-between">
            <div className="font-bold text-foreground text-sm flex items-center gap-2">
              <span>{order.customerName}</span>
              {order.neighborhood && (
                <span className="px-2 py-0.5 rounded-full bg-[#241A13] border border-artisan-gold/30 text-artisan-gold text-[10px] font-mono">
                  {order.neighborhood}
                </span>
              )}
            </div>

            {order.phone && (
              <a
                href={`tel:${order.phone}`}
                className="text-artisan-gold hover:underline flex items-center gap-1 text-xs font-mono"
              >
                <Phone className="w-3 h-3 text-artisan-gold" />
                <span>{order.phone}</span>
              </a>
            )}
          </div>

          <div className="flex items-start gap-1.5 text-foreground/75 leading-relaxed bg-[#14100D] p-2.5 rounded-xl border border-[#241B15]">
            <MapPin className="w-3.5 h-3.5 text-artisan-gold shrink-0 mt-0.5" />
            <span className="flex-1 select-all">{order.deliveryAddress}</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${order.deliveryAddress}, Beylikdüzü, İstanbul`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg bg-[#201812] hover:bg-[#2B2018] text-artisan-gold transition-colors shrink-0"
              title="Google Haritalar'da Aç"
            >
              <Navigation className="w-3.5 h-3.5" />
            </a>
          </div>

          {order.orderNotes && (
            <div className="text-[11px] text-amber-300/80 bg-amber-950/20 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
              <strong>Not:</strong> {order.orderNotes}
            </div>
          )}
        </div>

        {/* Items Ordered */}
        <div className="py-2 border-t border-[#261D17] space-y-1.5 text-xs font-sans">
          <div className="text-[10px] font-serif font-bold text-artisan-gold/80 uppercase tracking-wider">
            Sipariş İçeriği
          </div>
          <div className="space-y-1">
            {order.items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between text-foreground/85">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#241A13] text-artisan-gold font-mono font-bold flex items-center justify-center text-[10px]">
                    {it.quantity}
                  </span>
                  <span>{it.productName}</span>
                </div>
                <span className="text-foreground/50 font-mono text-[11px]">{it.totalPrice} ₺</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-3 border-t border-[#261D17] flex flex-wrap items-center justify-between gap-2">
        {/* Next Stage Button */}
        {order.status !== "teslim_edildi" && order.status !== "iptal" ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleNextStatus}
            className="flex-1 py-2 px-3 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-serif font-bold text-xs shadow-md shadow-artisan-terracotta/20 flex items-center justify-center gap-1.5 transition-all"
          >
            {order.status === "bekliyor" && (
              <>
                <ChefHat className="w-3.5 h-3.5" />
                <span>Hazırlamaya Al</span>
              </>
            )}
            {order.status === "hazirlaniyor" && (
              <>
                <Flame className="w-3.5 h-3.5" />
                <span>Fırına Ver</span>
              </>
            )}
            {order.status === "firinda" && (
              <>
                <Truck className="w-3.5 h-3.5" />
                <span>Kuryeye Teslim Et</span>
              </>
            )}
            {order.status === "kuryede" && (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Teslim Edildi Olarak İşaretle</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-[11px] text-foreground/40 font-mono">İşlem Tamamlandı</div>
        )}

        {/* Print Thermal Slip / Sticker */}
        <button
          type="button"
          onClick={() => setShowSlipModal(true)}
          className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 text-xs transition-colors"
          title="Paketleme Fişi / Koli Etiketi Yazdır"
        >
          <Printer className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* WhatsApp Notification Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
            className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-sans flex items-center gap-1 transition-colors"
            title="Müşteriye WhatsApp Mesajı Gönder"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <ChevronDown className="w-3 h-3" />
          </button>

          {showWhatsAppMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-52 bg-[#1A1410] border border-[#2F241D] rounded-2xl p-1.5 shadow-2xl z-30 space-y-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-serif font-bold text-artisan-gold uppercase">
                WhatsApp Şablonu Seç
              </div>
              <button
                onClick={() => sendWhatsAppNotification("received")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#251D16] text-foreground/80 hover:text-foreground text-xs transition-colors"
              >
                1. Siparişiniz Alındı
              </button>
              <button
                onClick={() => sendWhatsAppNotification("baking")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#251D16] text-foreground/80 hover:text-foreground text-xs transition-colors"
              >
                2. Fırında Pişiyor
              </button>
              <button
                onClick={() => sendWhatsAppNotification("on_delivery")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#251D16] text-foreground/80 hover:text-foreground text-xs transition-colors"
              >
                3. Kuryemiz Yola Çıktı
              </button>
              <button
                onClick={() => sendWhatsAppNotification("delivered")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#251D16] text-foreground/80 hover:text-foreground text-xs transition-colors"
              >
                4. Teslim Edildi & Afiyet Olsun
              </button>
            </div>
          )}
        </div>

        {/* Cancel Action */}
        {order.status !== "iptal" && order.status !== "teslim_edildi" && (
          <button
            type="button"
            onClick={() => onUpdateStatus(order.id, "iptal")}
            className="px-2.5 py-2 rounded-xl text-stone-500 hover:text-red-400 hover:bg-red-950/20 text-xs font-sans transition-colors"
            title="Siparişi İptal Et"
          >
            İptal
          </button>
        )}
      </div>

      {/* Printable Thermal Slip Modal */}
      <OrderSlipModal
        order={order}
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
      />
    </div>
  );
}
