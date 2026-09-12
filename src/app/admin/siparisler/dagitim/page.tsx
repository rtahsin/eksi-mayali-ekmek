"use client";

import React, { useState, useMemo } from "react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import {
  Truck,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Printer,
  Calendar,
  DollarSign,
  MessageCircle,
  Package,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";
import { AdminOrder } from "@/types/admin";

export default function DeliveryRoutePage() {
  const { allOrders, updateOrderStatus, loading } = useAdminOrders();
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<AdminOrder | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );

  // Filter orders for the selected date that require delivery
  const deliveryOrders = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.deliveryDate === selectedDate &&
        o.deliveryMethod === "courier" &&
        o.status !== "iptal"
    );
  }, [allOrders, selectedDate]);

  // Group orders by neighborhood
  const groupedOrders = useMemo(() => {
    const map = new Map<string, typeof deliveryOrders>();
    deliveryOrders.forEach((o) => {
      const n = o.neighborhood || "Beylikdüzü Diğer";
      if (!map.has(n)) map.set(n, []);
      map.get(n)!.push(o);
    });
    return Array.from(map.entries());
  }, [deliveryOrders]);

  // Financial and package summaries
  const totalPackages = deliveryOrders.length;
  const deliveredCount = deliveryOrders.filter((o) => o.status === "teslim_edildi").length;
  const pendingDeliveryCount = totalPackages - deliveredCount;
  const totalCashToCollect = deliveryOrders
    .filter((o) => o.paymentMethod === "cash_on_delivery" && o.status !== "teslim_edildi")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShareWhatsApp = () => {
    if (deliveryOrders.length === 0) {
      alert("Bu tarihte dağıtım bulunmuyor.");
      return;
    }

    let text = `📅 *EkmekLab Dağıtım Rotası (${selectedDate})*\n`;
    text += `📦 Toplam Paket: ${totalPackages}\n`;
    text += `💰 Tahsil Edilecek Nakit: ${totalCashToCollect.toLocaleString("tr-TR")} ₺\n\n`;

    groupedOrders.forEach(([neighborhood, orders]) => {
      text += `📍 *${neighborhood} Mahallesi (${orders.length} Paket)*\n`;
      orders.forEach((o, idx) => {
        text += `${idx + 1}) ${o.customerName} - ${o.phone || ""}\n`;
        text += `Adres: ${o.deliveryAddress}\n`;
        text += `Paket: ${o.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}\n`;
        if (o.orderNotes) {
          text += `Not: ${o.orderNotes}\n`;
        }
        
        let payLabel = "Ödendi / Cari";
        if (o.paymentMethod === "cash_on_delivery") payLabel = "Kapıda Nakit";
        else if (o.paymentMethod === "pos_at_door") payLabel = "Kapıda POS";
        
        text += `Tutar: ${o.totalAmount} ₺ (${payLabel})\n\n`;
      });
      text += `━━━━━━━━━━━━━━━\n`;
    });

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/siparisler"
            className="p-2 rounded-xl bg-[#1A1410] border border-[#2F241D] text-foreground/70 hover:text-artisan-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Kurye Dağıtım & Rota Listesi
            </h1>
            <p className="text-xs text-foreground/60 font-sans mt-0.5">
              Beylikdüzü mahalle bazlı sıralı teslimat rotası ve fiş dökümü
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#1A1410] border border-[#2A201A] text-xs text-foreground font-mono focus:outline-none focus:border-artisan-gold"
          />

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 text-xs font-sans font-medium transition-all print:hidden"
            title="Rotayı WhatsApp'ta Paylaş"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp'a Gönder</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#221A14] hover:bg-[#2C211A] border border-artisan-gold/30 text-artisan-gold text-xs font-sans font-medium transition-all"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Yazdır</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
        <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
            <Package className="w-3.5 h-3.5 text-artisan-gold" />
            <span>Toplam Paket</span>
          </div>
          <div className="font-serif text-xl font-bold text-foreground mt-0.5">{totalPackages}</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>Kalan Teslimat</span>
          </div>
          <div className="font-serif text-xl font-bold text-blue-400 mt-0.5">
            {pendingDeliveryCount}
          </div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Teslim Edilen</span>
          </div>
          <div className="font-serif text-xl font-bold text-emerald-400 mt-0.5">
            {deliveredCount}
          </div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Kapıda Tahsilat (Nakit)</span>
          </div>
          <div className="font-serif text-xl font-bold text-amber-400 mt-0.5 font-mono">
            {totalCashToCollect.toLocaleString("tr-TR")} ₺
          </div>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block border-b pb-4 mb-4 text-black">
        <h2 className="text-xl font-bold">EKMEKLAB FIRIN KURYESİ DAĞITIM MANİFESTOSU</h2>
        <p className="text-xs">
          Tarih: {selectedDate} · Toplam Paket: {totalPackages} · Tahsil Edilecek Nakit: {totalCashToCollect} ₺
        </p>
      </div>

      {/* Grouped Deliveries by Neighborhood */}
      {loading ? (
        <div className="p-16 text-center text-xs text-foreground/60">Yükleniyor...</div>
      ) : groupedOrders.length === 0 ? (
        <div className="p-16 text-center space-y-2 bg-[#18130F] rounded-3xl border border-[#261E17]">
          <Truck className="w-8 h-8 text-foreground/30 mx-auto" />
          <h3 className="font-serif text-base font-bold text-foreground">
            {selectedDate} Tarihinde Kurye Dağıtımı Bulunmuyor
          </h3>
          <p className="text-xs text-foreground/60">
            Tarihi değiştirebilir veya siparişler sayfasından teslimat atayabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedOrders.map(([neighborhoodName, ordersInGroup]) => (
            <div
              key={neighborhoodName}
              className="bg-[#16120E] border border-[#261E17] rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg print:bg-white print:text-black print:border-black print:rounded-none"
            >
              {/* Neighborhood Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#261E17] print:border-black">
                <div className="flex items-center gap-2 font-serif text-base font-bold text-artisan-gold print:text-black">
                  <MapPin className="w-4 h-4 text-artisan-gold print:text-black" />
                  <span>{neighborhoodName} Mahallesi</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#201812] border border-[#2F241D] text-xs font-mono text-foreground/80 print:border-black print:text-black">
                  {ordersInGroup.length} Paket
                </span>
              </div>

              {/* Order Cards within Neighborhood */}
              <div className="space-y-3">
                {ordersInGroup.map((order, idx) => {
                  const isDelivered = order.status === "teslim_edildi";
                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all print:border-black print:bg-white ${
                        isDelivered
                          ? "bg-[#120E0B]/60 border-emerald-500/20 opacity-75"
                          : "bg-[#1A1410] border-[#2A201A] hover:border-artisan-gold/40"
                      }`}
                    >
                      {/* Left: Stop Index & Address */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#251D16] border border-[#35281F] text-artisan-gold font-mono font-bold flex items-center justify-center text-xs print:border-black print:text-black">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-foreground print:text-black">
                            {order.customerName}
                          </span>
                          {order.phone && (
                            <a
                              href={`tel:${order.phone}`}
                              className="text-artisan-gold hover:underline text-xs font-mono flex items-center gap-1 print:text-black"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{order.phone}</span>
                            </a>
                          )}
                        </div>

                        <div className="text-xs text-foreground/80 font-sans pl-8 leading-relaxed print:text-black">
                          {order.deliveryAddress}
                        </div>

                        {/* Items Summary */}
                        <div className="text-xs text-foreground/60 pl-8 font-sans print:text-black">
                          <strong className="text-foreground/80 print:text-black">Paket:</strong>{" "}
                          {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}
                        </div>

                        {order.orderNotes && (
                          <div className="text-[11px] text-amber-300/90 pl-8 italic print:text-black">
                            Not: {order.orderNotes}
                          </div>
                        )}
                      </div>

                      {/* Right: Amount & Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#261E17]">
                        <div className="text-right">
                          <div className="font-serif text-base font-bold text-foreground print:text-black">
                            {order.totalAmount} ₺
                          </div>
                          <div className="text-[11px] font-sans">
                            {order.paymentMethod === "cash_on_delivery" ? (
                              <span className="text-amber-400 font-bold print:text-black">Kapıda Nakit</span>
                            ) : order.paymentMethod === "pos_at_door" ? (
                              <span className="text-blue-400 print:text-black">Kapıda POS</span>
                            ) : (
                              <span className="text-emerald-400 print:text-black">Ödendi / Cari</span>
                            )}
                          </div>
                        </div>

                        {/* Navigation & Status buttons (hidden in print) */}
                        <div className="flex items-center gap-2 print:hidden">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${order.deliveryAddress}, Beylikdüzü, İstanbul`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-[#241A13] hover:bg-[#302218] text-artisan-gold text-xs font-sans flex items-center gap-1.5 transition-colors border border-[#34241A]"
                            title="Haritada Rota Aç"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Harita</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setSelectedOrderForSlip(order)}
                            className="p-2 rounded-xl bg-[#241A13] hover:bg-[#302218] text-artisan-gold text-xs font-sans flex items-center gap-1.5 transition-colors border border-[#34241A]"
                            title="Paket Fişi / Etiket Yazdır"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateOrderStatus(
                                order.id,
                                isDelivered ? "kuryede" : "teslim_edildi"
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition-all ${
                              isDelivered
                                ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                                : "bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground shadow-sm"
                            }`}
                          >
                            {isDelivered ? "Teslim Edildi ✓" : "Teslim Et"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Thermal Slip Modal */}
      {selectedOrderForSlip && (
        <OrderSlipModal
          order={selectedOrderForSlip}
          isOpen={Boolean(selectedOrderForSlip)}
          onClose={() => setSelectedOrderForSlip(null)}
        />
      )}
    </div>
  );
}
