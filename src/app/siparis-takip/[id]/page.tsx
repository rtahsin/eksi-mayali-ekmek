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
  ShieldCheck,
  Sparkles,
  Navigation,
  AlertCircle,
  XCircle,
  Calendar,
  History,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useCustomerLocation } from "@/hooks/useCustomerLocation";
import { LocationConsentModal } from "@/components/customer/LocationConsentModal";
import { OrderStatusHistoryEntry } from "@/types/orderStatusHistory";

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
  status:
    | "onay_bekliyor"
    | "bekliyor"
    | "hazirlaniyor"
    | "firinda"
    | "kuryede"
    | "teslim_edildi"
    | "iptal";
  paymentMethod: string;
  paymentStatus?: string;
  orderNotes?: string;
  locationShared?: boolean;
  courierId?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  cancelReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface CourierLocation {
  courierId?: string;
  lat: number;
  lon: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: number;
  courierName?: string;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
    id: "onay_bekliyor",
    title: "Onay Bekleniyor",
    desc: "Siparişinizi teyit etmek için WhatsApp üzerinden onay vermeniz bekleniyor.",
    icon: Clock,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
  },
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
    case "onay_bekliyor":
      return 0;
    case "bekliyor":
      return 1;
    case "hazirlaniyor":
      return 2;
    case "firinda":
      return 3;
    case "kuryede":
      return 4;
    case "teslim_edildi":
      return 5;
    case "iptal":
      return -1;
    default:
      return 1;
  }
}

interface RawDBOrder {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  delivery_address?: string | null;
  neighborhood?: string | null;
  delivery_method?: string | null;
  delivery_date?: string | null;
  delivery_time_window?: string | null;
  subtotal?: number | string | null;
  shipping_fee?: number | string | null;
  total_amount?: number | string | null;
  status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  order_notes?: string | null;
  location_shared?: boolean | null;
  courier_id?: string | null;
  customer_lat?: number | null;
  customer_lng?: number | null;
  cancel_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  order_items?: {
    product_name?: string | null;
    quantity?: number | string | null;
    unit_price?: number | string | null;
    total_price?: number | string | null;
  }[];
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

  // Status timeline and cancel modal states
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistoryEntry[]>([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Location sharing state
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const { startLocationSharing, stopLocationSharing, isSharing } = useCustomerLocation(order?.id);

  const supabase = useMemo(() => createClient(), []);

  // Fetch Order and Status History
  useEffect(() => {
    async function loadOrder() {
      if (!supabase || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .or(`id.eq.${rawId},id.ilike.%${rawId}%,order_number.ilike.%${rawId}%`)
          .maybeSingle();

        if (data) {
          mapOrderData(data as unknown as RawDBOrder);
        } else {
          // Fallback to secure API endpoint (essential for guest users where client RLS blocks direct anon SELECT)
          try {
            const res = await fetch(`/api/orders/${rawId}`);
            if (res.ok) {
              const apiJson = await res.json();
              if (apiJson.success && apiJson.order) {
                mapOrderData(apiJson.order as unknown as RawDBOrder);
                if (apiJson.order.history) {
                  setStatusHistory(apiJson.order.history as OrderStatusHistoryEntry[]);
                }
                return;
              }
            }
          } catch (fetchErr) {
            console.error("API fallback fetch error:", fetchErr);
          }
          if (error) {
            console.error("Order fetch error:", error);
          }
        }
      } catch (err: unknown) {
        console.error("Error loading order for tracking:", err);
      } finally {
        setLoading(false);
      }
    }

    interface RawAnyItem {
      product_name?: string | null;
      productName?: string | null;
      quantity?: number | string | null;
      unit_price?: number | string | null;
      unitPrice?: number | string | null;
      total_price?: number | string | null;
      totalPrice?: number | string | null;
    }

    function mapOrderData(
      data: RawDBOrder & {
        items?: RawAnyItem[];
      }
    ) {
      const rawList: readonly RawAnyItem[] = (data.items || data.order_items || []) as readonly RawAnyItem[];
      const items: OrderItem[] = rawList.map((it) => ({
        productName: it.productName || it.product_name || "Taş Fırın Ekmeği",
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
        totalPrice: Number(it.totalPrice ?? it.total_price ?? 0),
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
        status: (data.status as OrderData["status"]) || "bekliyor",
        paymentMethod: data.payment_method || "cash_on_delivery",
        paymentStatus: data.payment_status || "pending",
        orderNotes: data.order_notes || "",
        locationShared: !!data.location_shared,
        courierId: data.courier_id ?? null,
        customerLat: data.customer_lat ?? null,
        customerLng: data.customer_lng ?? null,
        cancelReason: data.cancel_reason ?? null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });

      // Load status history
      if (supabase) {
        supabase
          .from("order_status_history")
          .select("*")
          .eq("order_id", data.id)
          .order("created_at", { ascending: true })
          .then(({ data: histData }) => {
            if (histData) {
              setStatusHistory(histData as unknown as OrderStatusHistoryEntry[]);
            }
          });
      }
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
        (payload) => {
          const updatedRow = payload.new as RawDBOrder;
          if (updatedRow) {
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    status: (updatedRow.status as OrderData["status"]) || prev.status,
                    deliveryTimeWindow: updatedRow.delivery_time_window || prev.deliveryTimeWindow,
                    paymentStatus: updatedRow.payment_status || prev.paymentStatus,
                    cancelReason: updatedRow.cancel_reason || prev.cancelReason,
                    updatedAt: updatedRow.updated_at,
                  }
                : null
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_status_history",
          filter: `order_id=eq.${order.id}`,
        },
        (payload) => {
          const newEntry = payload.new as unknown as OrderStatusHistoryEntry;
          if (newEntry) {
            setStatusHistory((prev) => {
              if (prev.some((e) => e.id === newEntry.id)) return prev;
              return [...prev, newEntry];
            });
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
    if (!supabase || !isSupabaseConfigured() || !order?.courierId) return;

    const channelName = `courier-location-${order.courierId}`;
    const courierChannel = supabase
      .channel(channelName)
      .on("broadcast", { event: "courier_location" }, (event) => {
        if (event.payload) {
          const payload = event.payload as CourierLocation;
          // Security & logic filter: only accept updates for the assigned courier
          if (payload.courierId && payload.courierId !== order.courierId) {
            return;
          }
          setCourierLocation(payload);
          setLastLocationTime(
            new Date(payload.timestamp || Date.now()).toLocaleTimeString("tr-TR", {
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
  }, [supabase, order?.courierId]);

  // Distance calculation
  const distanceInfo = useMemo(() => {
    if (!courierLocation || !order?.deliveryAddress) return null;
    const customerCoords = extractCoordinates(order.deliveryAddress) || (order.customerLat && order.customerLng ? { lat: order.customerLat, lon: order.customerLng } : null);
    if (!customerCoords) return null;

    const km = calculateDistanceKm(
      courierLocation.lat,
      courierLocation.lon,
      customerCoords.lat,
      customerCoords.lon
    );

    const minutes = Math.max(3, Math.round((km / 25) * 60));

    return {
      distanceKm: km.toFixed(1),
      etaMinutes: minutes,
      customerCoords,
    };
  }, [courierLocation, order?.deliveryAddress, order?.customerLat, order?.customerLng]);

  // Handle Cancel Order
  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || "Müşteri sipariş takip ekranından iptal etti",
          cancelledBy: "customer",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Sipariş iptal edilemedi");
      }

      setOrder((prev) => (prev ? { ...prev, status: "iptal", cancelReason } : null));
      setIsCancelModalOpen(false);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setCancelling(false);
    }
  };

  const currentStageIndex = order ? getStageIndex(order.status) : 0;
  const canCancel = order?.status === "bekliyor" || order?.status === "onay_bekliyor";

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
        <div className="max-w-md w-full p-8 bg-[#18130F] border border-[#261E17] rounded-3xl text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-[#F59E0B] mx-auto" />
          <h1 className="font-serif text-xl font-bold text-[#F7EBD3]">Sipariş Bulunamadı</h1>
          <p className="text-stone-400 text-xs leading-relaxed">
            <strong>#{rawId}</strong> referansına ait sipariş kaydı bulunamadı. Lütfen sipariş takip linkinizi kontrol ediniz veya fırınımızla iletişime geçiniz.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#261E17] hover:bg-[#342920] text-stone-300 font-medium text-xs transition-colors"
            >
              Ana Sayfaya Dön
            </Link>
            <a
              href="https://wa.me/905010126653?text=Merhaba,%20siparisimi%20takip%20edemiyorum"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black font-bold text-xs shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Fırın Destek Hattına Yaz</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120E0B] text-stone-100 selection:bg-amber-500 selection:text-stone-950">
      {/* Artisan Bakery Header */}
      <header className="border-b border-[#261E17] bg-[#16110D]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] font-serif font-bold text-base shadow-inner hover:scale-105 transition-transform"
            >
              E
            </Link>
            <div>
              <div className="font-serif font-bold text-stone-100 text-sm tracking-wide flex items-center gap-1.5">
                <span>EkmekLab</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 font-sans font-medium">
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
              href={`https://wa.me/905010126653?text=${encodeURIComponent(
                `Merhaba EkmekLab, #${order.orderNumber} numaralı siparişim hakkında bilgi almak istiyorum.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fırına Yaz</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Greeting & Status Banner */}
        <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-[#F59E0B] uppercase tracking-widest">
                Taş Fırın Dağıtım Akışı
              </span>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                Merhaba, {order.customerName}
              </h1>
              <p className="text-xs text-stone-400 mt-1">
                Ekşi mayalı ekmekleriniz fırından taptaze çıkıp kapınıza ulaşana kadar her adımı buradan canlı izleyebilirsiniz.
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
                    : order.status === "onay_bekliyor"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                    : order.status === "iptal"
                    ? "bg-stone-800 text-stone-400 border-stone-700"
                    : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
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
                    : order.status === "onay_bekliyor"
                    ? "Onay Bekleniyor"
                    : order.status === "iptal"
                    ? "İptal Edildi"
                    : "Sipariş Alındı"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Deliver Celebration Card */}
        {order.status === "teslim_edildi" && (
          <div className="bg-gradient-to-r from-emerald-950/40 via-[#18130F] to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-serif font-bold text-emerald-200">Afiyet Olsun!</h2>
            <p className="text-xs text-stone-300 max-w-md mx-auto leading-relaxed">
              Ekşi mayalı artisan ekmekleriniz kapınıza teslim edildi. Sağlıkla ve afiyetle tüketmenizi dileriz.
            </p>
          </div>
        )}

        {/* Live Stepper Track */}
        {order.status !== "iptal" && (
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
            <h2 className="text-xs font-mono uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Sipariş Aşamaları</span>
            </h2>

            <div className="relative space-y-6 before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#261E17]">
              {STAGES.map((stage, idx) => {
                const isPast = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const StageIcon = stage.icon;

                return (
                  <div key={stage.id} className="relative flex items-start gap-4">
                    <div
                      className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                        isCurrent
                          ? `${stage.bg} ${stage.color} border-2 ${stage.border} shadow-lg shadow-amber-500/10 scale-110`
                          : isPast
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-stone-950 text-stone-600 border border-[#261E17]"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <StageIcon className="w-5 h-5" />
                      )}
                    </div>

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
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 animate-pulse font-bold">
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
        )}

        {/* Live Location Sharing & Radar Card */}
        {order.status !== "teslim_edildi" && order.status !== "iptal" && (
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <Navigation className="w-4 h-4 text-[#F59E0B]" />
                <div>
                  <h3 className="text-sm font-serif font-bold text-stone-200">
                    Canlı Konum Paylaşımı
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {isSharing
                      ? "📍 Konumunuz kuryeye anlık olarak aktarılıyor."
                      : "Kuryemizin sizi daha rahat bulması için konumunuzu açabilirsiniz."}
                  </p>
                </div>
              </div>

              {isSharing ? (
                <button
                  onClick={stopLocationSharing}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors"
                >
                  Paylaşımı Durdur
                </button>
              ) : (
                <button
                  onClick={() => setIsConsentModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  Konumumu Paylaş
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Courier Map when in transit */}
        {order.status === "kuryede" && (
          <div className="bg-gradient-to-br from-blue-950/40 via-[#18130F] to-[#18130F] border border-blue-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
                <div>
                  <h3 className="font-serif text-sm font-bold text-blue-200">
                    Kurye Dağıtımda
                  </h3>
                  <p className="text-[11px] text-blue-400/80 font-mono">
                    {courierLocation
                      ? `Kurye konumu anlık alınıyor (${lastLocationTime || "Şimdi"})`
                      : "Kurye yola çıktı, GPS sinyali bekleniyor..."}
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

            {courierLocation && (
              <div className="space-y-3">
                <div className="w-full h-52 rounded-2xl overflow-hidden border border-blue-500/20 relative bg-stone-950">
                  <iframe
                    title="Kurye Konumu"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
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
                    <span>Kurye Canlı Konumu</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-stone-400 text-[11px]">
                    Kuryeniz Beylikdüzü bölgesinde siparişinizi teslim etmek üzere ilerliyor.
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${courierLocation.lat},${courierLocation.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-blue-400 hover:text-blue-300 font-medium text-[11px] inline-flex items-center gap-1"
                  >
                    <span>Haritada Aç</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Details & Summary */}
        <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Sipariş Detayları</span>
          </h2>

          <div className="divide-y divide-stone-800/80">
            {order.items.map((item, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#F59E0B]">{item.quantity}x</span>
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
              <span className="font-mono text-[#F59E0B] text-base">{order.totalAmount} ₺</span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#261E17] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-[#120E0B] border border-[#261E17] space-y-1">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Ödeme Bilgisi</div>
              <div className="text-stone-200 font-medium flex items-center justify-between">
                <span>
                  {order.paymentMethod === "cash_on_delivery"
                    ? "💵 Kapıda Nakit"
                    : order.paymentMethod === "pos_at_door"
                    ? "💳 Kapıda POS"
                    : order.paymentMethod === "online"
                    ? "✅ Online Kart"
                    : order.paymentMethod === "transfer"
                    ? "🏦 Havale / EFT"
                    : "🏢 Cari Hesap"}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    order.paymentStatus === "paid" || order.status === "teslim_edildi"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {order.paymentStatus === "paid" || order.status === "teslim_edildi"
                    ? "Ödendi"
                    : "Tahsil Edilecek"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#120E0B] border border-[#261E17] space-y-1">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Teslimat Zamanı</div>
              <div className="text-stone-200 font-medium">
                {order.deliveryDate || "Bugün"} ({order.deliveryTimeWindow || "14:00 - 18:00"})
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#120E0B] border border-[#261E17] space-y-1 text-xs">
            <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#F59E0B]" />
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

        {/* Status History Timeline (Audit Trail) */}
        {statusHistory.length > 0 && (
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>İşlem Zaman Çizelgesi</span>
            </h2>
            <div className="space-y-2">
              {statusHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-[#261E17] last:border-none"
                >
                  <span className="text-stone-300">
                    {h.toStatus === "bekliyor"
                      ? "Sipariş oluşturuldu"
                      : h.toStatus === "hazirlaniyor"
                      ? "Hamur hazırlandı"
                      : h.toStatus === "firinda"
                      ? "Taş fırına verildi"
                      : h.toStatus === "kuryede"
                      ? "Kurye teslimata çıktı"
                      : h.toStatus === "teslim_edildi"
                      ? "Teslim edildi"
                      : h.toStatus === "iptal"
                      ? `İptal edildi (${h.note || "Müşteri talebi"})`
                      : h.toStatus}
                  </span>
                  <span className="font-mono text-stone-500 text-[11px]">
                    {new Date(h.createdAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancellation Section */}
        {canCancel && (
          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between gap-4">
            <div className="text-xs text-stone-400">
              Siparişiniz henüz hazırlanmaya başlamadı. Fikrinizi değiştirdiyseniz iptal edebilirsiniz.
            </div>
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors shrink-0"
            >
              Siparişi İptal Et
            </button>
          </div>
        )}

        {/* Cancellation Modal */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#18130F] border border-[#261E17] rounded-2xl p-6 text-stone-100 space-y-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
                <h3 className="font-serif font-bold text-base">Siparişi İptal Et</h3>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                #{order.orderNumber} numaralı siparişinizi iptal etmek istediğinize emin misiniz?
              </p>
              <div>
                <label className="text-[11px] font-mono text-stone-400 block mb-1">
                  İptal Sebebi (İsteğe bağlı):
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Vazgeçtim, teslimat adresi yanlıştı vb."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-[#120E0B] border border-[#261E17] text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              {cancelError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {cancelError}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl bg-[#261E17] hover:bg-[#342920] text-xs font-medium transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {cancelling ? "İptal Ediliyor..." : "Evet, İptal Et"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location Consent Modal */}
        <LocationConsentModal
          isOpen={isConsentModalOpen}
          onClose={() => setIsConsentModalOpen(false)}
          onConsentGiven={async (lat, lng) => {
            await startLocationSharing(order.id);
            setOrder((prev) => (prev ? { ...prev, customerLat: lat, customerLng: lng } : null));
          }}
          orderId={order.id}
        />
      </main>
    </div>
  );
}
