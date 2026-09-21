"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import {
  Clock,
  Flame,
  Truck,
  CheckCircle2,
  Package,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Navigation,
  AlertCircle,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  neighborhood: string;
  deliveryMethod: "courier" | "pickup";
  deliveryDate: string;
  deliveryTimeWindow?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: "bekliyor" | "hazirlaniyor" | "firinda" | "kuryede" | "teslim_edildi" | "iptal";
  paymentMethod: string;
  orderNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CourierLocation {
  lat: number;
  lon: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: number;
  courierName?: string;
}

// Calculate distance in km between two GPS coordinates
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function extractCoordinates(address?: string): { lat: number; lon: number } | null {
  if (!address) return null;
  const match = address.match(/(?:GPS|Konum):\s*([0-9.]+),\s*([0-9.]+)/i);
  if (match) {
    return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
  }
  return null;
}

const STAGES = [
  {
    id: "bekliyor",
    title: "Sipariş Alındı",
    desc: "Siparişiniz fırınımıza ulaştı, sıraya alındı.",
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    id: "hazirlaniyor",
    title: "Hamur Hazırlanıyor",
    desc: "Ekşi mayalı hamurunuz elle şekillendiriliyor ve dinlendiriliyor.",
    icon: Package,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    id: "firinda",
    title: "Taş Fırında Pişiyor",
    desc: "Ekmeğiniz odun ateşli taş tabanlı fırında nar gibi pişiyor.",
    icon: Flame,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
  {
    id: "kuryede",
    title: "Kurye Dağıtımda",
    desc: "Fırından taptaze çıktı! Özel kuryemiz adresinize doğru yolda.",
    icon: Truck,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "teslim_edildi",
    title: "Afiyet Olsun!",
    desc: "Siparişiniz başarıyla teslim edildi. Şifa olsun!",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
];

function getStageIndex(status: string): number {
  switch (status) {
    case "bekliyor":
      return 0;
    case "hazirlaniyor":
      return 1;
    case "firinda":
      return 2;
    case "kuryede":
      return 3;
    case "teslim_edildi":
      return 4;
    case "iptal":
      return -1;
    default:
      return 0;
  }
}

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const rawId = resolvedParams.id;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [courierLocation, setCourierLocation] = useState<CourierLocation | null>(null);
  const [lastLocationTime, setLastLocationTime] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Fetch Order
  useEffect(() => {
    async function loadOrder() {
      if (!supabase || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        // Query by id or orderNumber
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .or(`id.eq.${rawId},id.ilike.%${rawId}%`)
          .single();

        if (error) {
          // Try search without .single()
          const { data: list } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .limit(10);

          const found = list?.find(
            (o: any) =>
              o.id === rawId ||
              o.id.toLowerCase().includes(rawId.toLowerCase()) ||
              (o.order_number && o.order_number.toLowerCase().includes(rawId.toLowerCase()))
          );

          if (found) {
            mapOrderData(found);
          }
        } else if (data) {
          mapOrderData(data);
        }
      } catch (err) {
        console.error("Error loading order for tracking:", err);
      } finally {
        setLoading(false);
      }
    }

    function mapOrderData(data: any) {
      const items: OrderItem[] = (data.order_items || []).map((it: any) => ({
        productName: it.product_name || "Taş Fırın Ekmeği",
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unit_price) || 0,
        totalPrice: Number(it.total_price) || 0,
      }));

      setOrder({
        id: data.id,
        orderNumber: data.order_number || data.id.replace("ORD-", "").toUpperCase(),
        customerName: data.customer_name || "Değerli Müşterimiz",
        phone: data.phone || "",
        deliveryAddress: data.delivery_address || "",
        neighborhood: data.neighborhood || "Beylikdüzü",
        deliveryMethod: data.delivery_method === "pickup" ? "pickup" : "courier",
        deliveryDate: data.delivery_date || "",
        deliveryTimeWindow: data.delivery_time_window || "14:00 - 18:00",
        items,
        subtotal: Number(data.subtotal) || 0,
        shippingFee: Number(data.shipping_fee) || 0,
        totalAmount: Number(data.total_amount) || 0,
        status: data.status || "bekliyor",
        paymentMethod: data.payment_method || "cash_on_delivery",
        orderNotes: data.order_notes || "",
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    }

    loadOrder();
  }, [rawId, supabase]);

  // Realtime updates for Order status
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured() || !order?.id) return;

    const channel = supabase
      .channel(`order-track-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    status: payload.new.status,
                    deliveryTimeWindow: payload.new.delivery_time_window || prev.deliveryTimeWindow,
                    updatedAt: payload.new.updated_at,
                  }
                : null
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, supabase]);

  // Realtime listener for Courier Live Location broadcast
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) return;

    // Listen to courier-live-location broadcast
    const courierChannel = supabase
      .channel("courier-live-location")
      .on("broadcast", { event: "location" }, (event: any) => {
        if (event.payload) {
          setCourierLocation(event.payload);
          setLastLocationTime(
            new Date(event.payload.timestamp || Date.now()).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(courierChannel);
    };
  }, [supabase]);

  // Distance & ETA calculation if courier and customer coordinates are known
  const distanceInfo = useMemo(() => {
    if (!courierLocation || !order?.deliveryAddress) return null;
    const customerCoords = extractCoordinates(order.deliveryAddress);
    if (!customerCoords) return null;

    const km = calculateDistanceKm(
      courierLocation.lat,
      courierLocation.lon,
      customerCoords.lat,
      customerCoords.lon
    );

    // Approximate time: courier average city speed ~25 km/h
    const minutes = Math.max(3, Math.round((km / 25) * 60));

    return {
      distanceKm: km.toFixed(1),
      etaMinutes: minutes,
      customerCoords,
    };
  }, [courierLocation, order?.deliveryAddress]);

  const currentStageIndex = order ? getStageIndex(order.status) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#120E0B] text-stone-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif text-amber-200 text-sm tracking-wide">
          Sipariş durumu sorgulanıyor...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#120E0B] text-stone-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-stone-900/80 border border-stone-800 rounded-3xl text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="font-serif text-xl font-bold text-stone-100">Sipariş Bulunamadı</h1>
          <p className="text-stone-400 text-xs leading-relaxed">
            <strong>#{rawId}</strong> numaralı sipariş kaydı bulunamadı. Lütfen sipariş takip linkinizi kontrol ediniz veya fırınımızla iletişime geçiniz.
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/905324567890?text=Merhaba,%20siparisimi%20takip%20edemiyorum"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Tahsin Usta'ya WhatsApp'tan Yaz</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120E0B] text-stone-100 selection:bg-amber-500 selection:text-stone-950">
      {/* Artisan Bakery Header */}
      <header className="border-b border-stone-800/80 bg-[#16110D]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-serif font-bold text-base shadow-inner">
              E
            </div>
            <div>
              <div className="font-serif font-bold text-stone-100 text-sm tracking-wide flex items-center gap-1.5">
                <span>EkmekLab</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-sans font-medium">
                  Canlı Takip
                </span>
              </div>
              <div className="text-[11px] text-stone-400 font-mono">
                Sipariş #{order.orderNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/905324567890?text=${encodeURIComponent(
                `Merhaba Tahsin Usta, #${order.orderNumber} numaralı siparişim hakkında yazıyorum.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Usta'ya Yaz</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Greeting & Status Banner */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-widest">
                Taş Fırın Dağıtım Akışı
              </span>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                Merhaba, {order.customerName}
              </h1>
              <p className="text-xs text-stone-400 mt-1">
                Ekşi mayalı siparişiniz fırından taptaze çıkıp kapınıza ulaşana kadar her adımı buradan canlı izleyebilirsiniz.
              </p>
            </div>

            <div className="shrink-0 text-right">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  order.status === "teslim_edildi"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : order.status === "kuryede"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse"
                    : order.status === "firinda"
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                <span>
                  {order.status === "teslim_edildi"
                    ? "Teslim Edildi"
                    : order.status === "kuryede"
                    ? "Kuryede (Yolda)"
                    : order.status === "firinda"
                    ? "Fırında Pişiyor"
                    : order.status === "hazirlaniyor"
                    ? "Hazırlanıyor"
                    : order.status === "iptal"
                    ? "İptal Edildi"
                    : "Sipariş Alındı"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Stepper Track */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sipariş Aşamaları</span>
          </h2>

          <div className="relative space-y-6 before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-800">
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isFuture = idx > currentStageIndex;
              const StageIcon = stage.icon;

              return (
                <div key={stage.id} className="relative flex items-start gap-4">
                  {/* Icon Circle */}
                  <div
                    className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                      isCurrent
                        ? `${stage.bg} ${stage.color} border-2 ${stage.border} shadow-lg shadow-amber-500/10 scale-110`
                        : isPast
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-stone-950 text-stone-600 border border-stone-800"
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <StageIcon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`font-serif text-sm font-bold ${
                          isCurrent
                            ? "text-amber-200"
                            : isPast
                            ? "text-stone-200"
                            : "text-stone-500"
                        }`}
                      >
                        {stage.title}
                      </div>

                      {isCurrent && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse font-bold">
                          ŞU AN BU AŞAMADA
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs mt-0.5 leading-relaxed ${
                        isCurrent
                          ? "text-stone-300 font-medium"
                          : isPast
                          ? "text-stone-400"
                          : "text-stone-600"
                      }`}
                    >
                      {stage.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Courier Radar / Map Section when status is 'kuryede' */}
        {order.status === "kuryede" && (
          <div className="bg-gradient-to-br from-blue-950/40 via-stone-900/90 to-stone-900/90 border border-blue-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
                <div>
                  <h3 className="font-serif text-sm font-bold text-blue-200">
                    Canlı Kurye Dağıtımında
                  </h3>
                  <p className="text-[11px] text-blue-400/80 font-mono">
                    {courierLocation
                      ? `Kurye konumu anlık alınıyor (${lastLocationTime || "Şimdi"})`
                      : "Kurye rotaya çıktı, sinyal bekleniyor..."}
                  </p>
                </div>
              </div>

              {distanceInfo && (
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-blue-300">
                    ~{distanceInfo.distanceKm} km
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Tahmini ~{distanceInfo.etaMinutes} dk
                  </div>
                </div>
              )}
            </div>

            {/* Embedded Live Map or Visual Route Indicator */}
            {courierLocation ? (
              <div className="space-y-3">
                <div className="w-full h-52 rounded-2xl overflow-hidden border border-blue-500/20 relative bg-stone-950">
                  <iframe
                    title="Kurye Konumu"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      courierLocation.lon - 0.015
                    }%2C${courierLocation.lat - 0.015}%2C${
                      courierLocation.lon + 0.015
                    }%2C${courierLocation.lat + 0.015}&layer=mapnik&marker=${
                      courierLocation.lat
                    }%2C${courierLocation.lon}`}
                    className="filter invert hue-rotate-180 contrast-125 opacity-80"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-xl bg-stone-900/90 border border-stone-800 text-[10px] font-mono text-blue-400 flex items-center gap-1.5 shadow">
                    <Truck className="w-3 h-3 text-blue-400" />
                    <span>Kurye Canlı Konum</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-stone-400 text-[11px]">
                    Kuryeniz Beylikdüzü bölgesinde siparişleri sırayla ulaştırıyor.
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${courierLocation.lat},${courierLocation.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-blue-400 hover:text-blue-300 font-medium text-[11px] inline-flex items-center gap-1"
                  >
                    <span>Büyük Haritada Aç</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 text-center space-y-2">
                <Truck className="w-8 h-8 text-blue-400 mx-auto animate-bounce" />
                <p className="text-xs text-stone-300 font-medium">
                  Kuryemiz teslimat çantasını hazırladı ve fırından ayrıldı.
                </p>
                <p className="text-[11px] text-stone-500">
                  Teslimat aralığı: {order.deliveryTimeWindow || "14:00 - 18:00"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Order Details & Summary */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Sipariş Detayları</span>
          </h2>

          <div className="divide-y divide-stone-800/80">
            {order.items.map((item, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400">{item.quantity}x</span>
                  <span className="text-stone-200 font-medium">{item.productName}</span>
                </div>
                <div className="font-mono text-stone-300">{item.totalPrice} ₺</div>
              </div>
            ))}

            {order.shippingFee > 0 && (
              <div className="py-2.5 flex items-center justify-between text-xs text-stone-400">
                <span>Kurye Teslimat Ücreti</span>
                <span className="font-mono">{order.shippingFee} ₺</span>
              </div>
            )}

            <div className="pt-3 flex items-center justify-between text-sm font-bold">
              <span className="text-stone-300">Toplam Tutar</span>
              <span className="font-mono text-amber-400 text-base">{order.totalAmount} ₺</span>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-stone-950/60 border border-stone-800/80 space-y-1">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Ödeme Yöntemi</div>
              <div className="text-stone-200 font-medium">
                {order.paymentMethod === "cash_on_delivery"
                  ? "💵 Kapıda Nakit"
                  : order.paymentMethod === "pos_at_door"
                  ? "💳 Kapıda POS / Kredi Kartı"
                  : order.paymentMethod === "online"
                  ? "✅ Online Ödendi"
                  : order.paymentMethod === "transfer"
                  ? "🏦 Havale / EFT"
                  : "🏢 Cari Hesap"}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-stone-950/60 border border-stone-800/80 space-y-1">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Teslimat Zamanı</div>
              <div className="text-stone-200 font-medium">
                {order.deliveryDate} ({order.deliveryTimeWindow || "14:00 - 18:00"})
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-stone-950/60 border border-stone-800/80 space-y-1 text-xs">
            <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span>Teslimat Adresi</span>
            </div>
            <div className="text-stone-300 font-medium">{order.deliveryAddress}</div>
            {order.orderNotes && (
              <div className="text-stone-400 text-[11px] pt-1 italic">
                Not: {order.orderNotes}
              </div>
            )}
          </div>
        </div>

        {/* Contact Bakery Card */}
        <div className="p-5 rounded-3xl bg-stone-900/60 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-0.5">
            <div className="font-serif font-bold text-stone-200">Bir sorunuz mu var?</div>
            <div className="text-stone-400 text-[11px]">
              Fırıncı Tahsin Usta veya dağıtım ekibimize anında ulaşabilirsiniz.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:05324567890"
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span>Fırını Ara</span>
            </a>

            <a
              href={`https://wa.me/905324567890?text=${encodeURIComponent(
                `Merhaba Tahsin Usta, #${order.orderNumber} numaralı siparişim ile ilgili bir sorum var.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold inline-flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
