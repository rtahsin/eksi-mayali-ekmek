"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Flame,
  Truck,
  CheckCircle2,
  PlusCircle,
  MapPin,
  ArrowRight,
  Phone,
  MessageCircle,
  Layers,
  ShieldCheck,
  AlertCircle,
  Store,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";

export default function AdminDashboardPage() {
  const { orders, allOrders, stats, loading } = useAdminOrders();
  const { adminUser } = useAdminAuth();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Today's orders
  const todayOrders = useMemo(() => {
    return allOrders.filter((o) => o.deliveryDate === todayStr);
  }, [allOrders, todayStr]);

  // Neighborhood distribution for today
  const neighborhoodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    todayOrders.forEach((o) => {
      const n = o.neighborhood || "Beylikdüzü";
      counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [todayOrders]);

  // Orders by source
  const sourceStats = useMemo(() => {
    const sources = { web: 0, whatsapp: 0, phone: 0, in_store: 0 };
    todayOrders.forEach((o) => {
      const src = (o.source || "web") as keyof typeof sources;
      if (sources[src] !== undefined) sources[src]++;
    });
    return sources;
  }, [todayOrders]);

  // Recent 6 orders
  const recentOrders = useMemo(() => {
    return allOrders.slice(0, 6);
  }, [allOrders]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/40 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
            <Store className="w-3.5 h-3.5" />
            <span>Beylikdüzü Taş Fırın Operasyon Masası</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
            EkmekLab Komuta Merkezi
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Bugün ({new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" })}) taş fırın ve kurye dağıtımı canlı durumu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/siparisler/yeni"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Hızlı Sipariş Yaz</span>
          </Link>
          <Link
            href="/admin/siparisler/dagitim"
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl transition-all border border-stone-700 text-sm active:scale-95"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Kurye Rotası</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Revenue */}
        <div className="bg-stone-900/80 border border-stone-800/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Bugünkü Ciro</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
              {stats.todayRevenue.toLocaleString("tr-TR")} ₺
            </div>
            <div className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
              <span className="text-amber-400 font-semibold">{stats.totalToday} sipariş</span>
              <span>• Teslimat günü bugün</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600 opacity-60" />
        </div>

        {/* Pending Orders */}
        <div className="bg-stone-900/80 border border-stone-800/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Teyit Bekleyen</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stats.pendingCount > 0 ? "bg-amber-500/20 text-amber-400 animate-pulse" : "bg-stone-800 text-stone-400"}`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
              {stats.pendingCount}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              {stats.pendingCount > 0 ? (
                <span className="text-amber-400 font-medium">Onay bekleyen siparişler var</span>
              ) : (
                <span className="text-stone-400">Bekleyen yeni sipariş yok</span>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/50" />
        </div>

        {/* Baking & In Kitchen */}
        <div className="bg-stone-900/80 border border-stone-800/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Fırında / Hazırlık</span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
              {stats.processingCount + stats.bakingCount}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              {stats.bakingCount} fırında, {stats.processingCount} hamur/paket
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500/50" />
        </div>

        {/* Courier & Delivered */}
        <div className="bg-stone-900/80 border border-stone-800/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Kuryede / Teslim</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
              {stats.courierCount} <span className="text-sm font-normal text-stone-400">/ {stats.completedTodayCount} teslim</span>
            </div>
            <div className="text-xs text-stone-400 mt-1">
              {stats.courierCount > 0 ? (
                <span className="text-blue-400 font-medium">{stats.courierCount} sipariş Beylikdüzü kuryesinde</span>
              ) : (
                <span>Dağıtımda kurye yok</span>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/50" />
        </div>
      </div>

      {/* Main Grid: Live Orders + Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Active Orders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-stone-100 font-serif">Son Siparişler</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
                {allOrders.length}
              </span>
            </div>
            <Link
              href="/admin/siparisler"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold group"
            >
              <span>Tümünü Gör</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center text-stone-400">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Siparişler yükleniyor...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center text-stone-400">
              Henüz kayıtlı sipariş bulunmuyor.
              <div className="mt-4">
                <Link
                  href="/admin/siparisler/yeni"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  İlk Siparişi Oluştur
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl divide-y divide-stone-800/80 overflow-hidden shadow-lg">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 hover:bg-stone-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        #{order.orderNumber || order.id.substring(0, 6)}
                      </span>
                      <span className="font-semibold text-stone-200 text-sm">
                        {order.customerName}
                      </span>
                      {order.source === "whatsapp" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          WhatsApp
                        </span>
                      )}
                      {order.source === "phone" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Telefon
                        </span>
                      )}
                      {order.source === "web" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-700/40 text-stone-300">
                          Web
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-400">
                      <span className="flex items-center gap-1 text-stone-300">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        {order.neighborhood || "Beylikdüzü"}
                      </span>
                      <span>•</span>
                      <span>
                        {order.items.length} çeşit (
                        {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ").substring(0, 35)}
                        ...)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800/60">
                    <div className="text-right">
                      <div className="font-bold text-stone-100 text-sm">
                        {order.totalAmount.toLocaleString("tr-TR")} ₺
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {order.paymentMethod === "cash_on_delivery" && "Kapıda Nakit"}
                        {order.paymentMethod === "pos_at_door" && "Kapıda POS"}
                        {order.paymentMethod === "online" && "Online Kart"}
                        {order.paymentMethod === "transfer" && "Havale/EFT"}
                        {order.paymentMethod === "cari" && "Cari Hesap"}
                      </div>
                    </div>

                    <OrderStatusBadge status={order.status} />

                    {order.phone && (
                      <a
                        href={`tel:${order.phone}`}
                        className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                        title="Müşteriyi Ara"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Operations, Neighborhoods & Fast Channels */}
        <div className="space-y-6">
          {/* Beylikdüzü Neighborhood Distribution */}
          <div className="bg-stone-900/70 border border-stone-800 p-5 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-stone-200 text-sm font-serif">
                  Bugünkü Beylikdüzü Dağıtımı
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">
                {todayOrders.length} paket
              </span>
            </div>

            {neighborhoodStats.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                Bugün için planlanmış kurye teslimatı bulunmuyor.
              </p>
            ) : (
              <div className="space-y-2.5">
                {neighborhoodStats.map(([neighborhood, count]) => {
                  const pct = Math.round((count / (todayOrders.length || 1)) * 100);
                  return (
                    <div key={neighborhood} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-stone-300">{neighborhood}</span>
                        <span className="text-amber-400 font-mono font-bold">{count} adet</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-stone-800/80">
              <Link
                href="/admin/siparisler/dagitim"
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-all"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Kurye Rota Listesini Aç</span>
              </Link>
            </div>
          </div>

          {/* Quick Shortcuts & Fast Links */}
          <div className="bg-stone-900/70 border border-stone-800 p-5 rounded-2xl shadow-lg space-y-3">
            <h3 className="font-bold text-stone-200 text-sm font-serif mb-3">
              Hızlı Yönetim Panelleri
            </h3>

            <Link
              href="/admin/siparisler/yeni"
              className="flex items-center justify-between p-3 rounded-xl bg-stone-800/60 hover:bg-stone-800 text-stone-300 hover:text-white transition-all border border-stone-750 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-200">WhatsApp Siparişi Ekle</div>
                  <div className="text-[11px] text-stone-400">10 saniyede rota listesine yaz</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/admin/urunler"
              className="flex items-center justify-between p-3 rounded-xl bg-stone-800/60 hover:bg-stone-800 text-stone-300 hover:text-white transition-all border border-stone-750 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-200">Ürünler & Gurme Kataloğu</div>
                  <div className="text-[11px] text-stone-400">Fiyatlar ve stok durumu</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/admin/ayarlar"
              className="flex items-center justify-between p-3 rounded-xl bg-stone-800/60 hover:bg-stone-800 text-stone-300 hover:text-white transition-all border border-stone-750 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-200">Güvenli Cihazlar & Kilit</div>
                  <div className="text-[11px] text-stone-400">Telefon ve bilgisayar onayları</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          {/* Bakery Delivery Info Badge */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">Özel Kurye Dağıtım Kuralı</p>
              <p className="text-stone-400 leading-relaxed">
                Dağıtım bölgesi sadece <strong className="text-stone-200">Beylikdüzü</strong> sınırlarıdır. 1.000 ₺ üzeri siparişlerde kurye teslimatı ücretsizdir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
