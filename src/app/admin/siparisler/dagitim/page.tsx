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
  ExternalLink,
  Map as MapIcon,
  X,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";
import { AdminOrder } from "@/types/admin";

function extractCoordinates(address?: string): { lat: string; lon: string } | null {
  if (!address) return null;
  const match = address.match(/(?:GPS|Konum):\s*([0-9.]+),\s*([0-9.]+)/i);
  if (match) {
    return { lat: match[1], lon: match[2] };
  }
  return null;
}

function getMapUrls(address: string) {
  const coords = extractCoordinates(address);
  const cleanAddress = address.replace(/\[📍\s*(?:GPS|Konum):[^\]]+\]/g, "").trim();
  const query = encodeURIComponent(`${cleanAddress}, Beylikdüzü, İstanbul`);

  if (coords) {
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`,
      apple: `https://maps.apple.com/?daddr=${coords.lat},${coords.lon}`,
      yandex: `https://yandex.com.tr/harita/?rtext=~${coords.lat}%2C${coords.lon}&rtt=auto`,
      coords,
    };
  }

  return {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    apple: `https://maps.apple.com/?q=${query}`,
    yandex: `https://yandex.com.tr/harita/?text=${query}`,
    coords: null,
  };
}

export default function DeliveryRoutePage() {
  const { allOrders, updateOrderStatus, loading } = useAdminOrders();
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<AdminOrder | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [showRouteMapModal, setShowRouteMapModal] = useState(false);

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

    let globalIndex = 1;
    groupedOrders.forEach(([neighborhood, orders]) => {
      text += `📍 *${neighborhood} Mahallesi (${orders.length} Paket)*\n`;
      orders.forEach((o) => {
        const urls = getMapUrls(o.deliveryAddress);
        text += `${globalIndex}) ${o.customerName} - ${o.phone || ""}\n`;
        text += `Adres: ${o.deliveryAddress}\n`;
        text += `Paket: ${o.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}\n`;
        if (o.orderNotes) {
          text += `Not: ${o.orderNotes}\n`;
        }
        
        let payLabel = "Ödendi / Cari";
        if (o.paymentMethod === "cash_on_delivery") payLabel = "Kapıda Nakit";
        else if (o.paymentMethod === "pos_at_door") payLabel = "Kapıda POS";
        
        text += `Tutar: ${o.totalAmount} ₺ (${payLabel})\n`;
        text += `🗺️ Harita/Navigasyon: ${urls.google}\n\n`;
        globalIndex++;
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
              Beylikdüzü mahalle bazlı sıralı teslimat rotası, canlı harita ve navigasyon
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#1A1410] border border-[#2A201A] text-xs text-foreground font-mono focus:outline-none focus:border-artisan-gold"
          />

          <button
            type="button"
            onClick={() => setShowRouteMapModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-sans font-bold transition-all"
            title="Canlı Harita Görünümünü Aç"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Canlı Harita Rotası</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 text-xs font-sans font-medium transition-all"
            title="Rotayı ve Harita Linklerini Kuryeye Gönder"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kurye WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#221A14] hover:bg-[#2C211A] border border-artisan-gold/30 text-artisan-gold text-xs font-sans font-medium transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
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
        <div className="p-12 text-center bg-[#18130F] border border-[#261E17] rounded-2xl space-y-2">
          <Truck className="w-8 h-8 text-foreground/30 mx-auto" />
          <div className="text-sm font-sans font-bold text-foreground">
            Bu tarihte ({selectedDate}) kurye teslimatı bulunmuyor
          </div>
          <div className="text-xs text-foreground/50">
            Günün siparişlerini görüntülemek için tarih seçimini değiştirebilirsiniz.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedOrders.map(([neighborhood, orders]) => (
            <div
              key={neighborhood}
              className="bg-[#18130F] border border-[#261E17] rounded-2xl overflow-hidden print:border-black print:bg-white"
            >
              {/* Neighborhood Header */}
              <div className="bg-[#201812] px-4 py-3 border-b border-[#261E17] flex items-center justify-between print:bg-gray-100 print:text-black">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-artisan-gold print:text-black" />
                  <span className="font-serif font-bold text-sm text-foreground print:text-black">
                    {neighborhood}
                  </span>
                </div>
                <div className="text-xs font-sans text-artisan-gold font-mono print:text-black">
                  {orders.length} Adres / Paket
                </div>
              </div>

              {/* Order List */}
              <div className="divide-y divide-[#261E17] print:divide-black">
                {orders.map((order, idx) => {
                  const isDelivered = order.status === "teslim_edildi";
                  const urls = getMapUrls(order.deliveryAddress);

                  return (
                    <div
                      key={order.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        isDelivered ? "opacity-60 bg-emerald-950/10" : "hover:bg-[#1E1611]"
                      }`}
                    >
                      {/* Left: Customer info & Address */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#291F18] flex items-center justify-center text-[10px] font-mono text-artisan-gold font-bold shrink-0 print:border print:border-black print:text-black">
                            {idx + 1}
                          </span>
                          <span className="font-serif font-bold text-sm text-foreground print:text-black">
                            {order.customerName}
                          </span>
                          <span className="text-xs font-mono text-foreground/50">
                            (#{order.orderNumber || order.id.slice(-6)})
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

                          {urls.coords && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              📍 Hassas GPS
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-foreground/80 font-sans pl-7 leading-relaxed print:text-black select-all">
                          {order.deliveryAddress}
                        </div>

                        {/* Items Summary */}
                        <div className="text-xs text-foreground/60 pl-7 font-sans print:text-black">
                          <strong className="text-foreground/80 print:text-black">Paket:</strong>{" "}
                          {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}
                        </div>

                        {order.orderNotes && (
                          <div className="text-[11px] text-amber-300/90 pl-7 italic print:text-black">
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
                        <div className="flex items-center gap-1.5 print:hidden">
                          {/* Google Maps Button */}
                          <a
                            href={urls.google}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-sans flex items-center gap-1 transition-colors border border-amber-500/30"
                            title="Google Haritalar ile Yol Tarifi Al"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Navigasyon</span>
                          </a>

                          {/* Yandex Maps Alternative */}
                          <a
                            href={urls.yandex}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-[#241A13] hover:bg-[#302218] text-stone-300 text-xs font-sans flex items-center gap-1 transition-colors border border-[#34241A]"
                            title="Yandex Navigasyon ile Aç"
                          >
                            <Compass className="w-3.5 h-3.5 text-red-400" />
                            <span className="hidden lg:inline">Yandex</span>
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

      {/* Visual Live Route Map Modal */}
      {showRouteMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-serif font-bold text-stone-100 text-base">
                    Beylikdüzü Canlı Dağıtım Haritası ({selectedDate})
                  </h3>
                  <p className="text-stone-400 text-xs">
                    Toplam {deliveryOrders.length} teslimat noktası mahallelere göre listelenmiştir.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRouteMapModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content: Map + Stop List */}
            <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
              {/* Map Embed Container */}
              <div className="md:col-span-2 relative min-h-[350px] bg-stone-950 flex flex-col items-center justify-center">
                <iframe
                  title="Beylikdüzü Dağıtım Haritası"
                  width="100%"
                  height="100%"
                  className="w-full h-full min-h-[400px] border-0"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=28.59,40.95,28.72,41.03&layer=mapnik"
                />
                <div className="absolute bottom-3 left-3 bg-stone-900/90 border border-stone-700 px-3 py-1.5 rounded-xl text-[11px] text-stone-200 font-sans backdrop-blur-sm flex items-center gap-2 shadow">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Merkez: Beylikdüzü Taş Fırın Dağıtım Bölgesi</span>
                </div>
              </div>

              {/* Stop Checklist */}
              <div className="p-4 overflow-y-auto max-h-[500px] space-y-3 bg-stone-950/40 border-t md:border-t-0 md:border-l border-stone-800">
                <div className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Teslimat Sırası ({deliveryOrders.length})</span>
                  <span className="text-amber-400 font-mono">{totalCashToCollect} ₺</span>
                </div>

                {deliveryOrders.length === 0 ? (
                  <div className="text-stone-500 text-xs p-4 text-center">Bu tarihte durak yok</div>
                ) : (
                  deliveryOrders.map((o, idx) => {
                    const urls = getMapUrls(o.deliveryAddress);
                    const isDone = o.status === "teslim_edildi";

                    return (
                      <div
                        key={o.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                          isDone
                            ? "bg-emerald-950/20 border-emerald-500/20 opacity-60"
                            : "bg-stone-900/80 border-stone-800 hover:border-amber-500/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-200 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-mono font-bold">
                              {idx + 1}
                            </span>
                            <span>{o.customerName}</span>
                          </span>
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            {o.totalAmount} ₺
                          </span>
                        </div>

                        <div className="text-stone-400 text-[11px] line-clamp-1">
                          {o.neighborhood} · {o.deliveryAddress}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <a
                            href={urls.google}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Navigasyonu Başlat</span>
                          </a>

                          <a
                            href={urls.yandex}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-stone-400 hover:text-stone-200 flex items-center gap-0.5"
                          >
                            <span>Yandex</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
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
