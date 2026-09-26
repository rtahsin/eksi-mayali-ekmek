"use client";

import React from "react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { OrderCard } from "@/components/admin/OrderCard";
import {
  ShoppingBag,
  Clock,
  Plus,
  Search,
  Truck,
  Flame,
  CheckCircle2,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export default function AdminOrdersPage() {
  const {
    orders,
    loading,
    stats,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    searchQuery,
    setSearchQuery,
    allOrders,
    updateOrderStatus,
  } = useAdminOrders();

  const [extraFilter, setExtraFilter] = React.useState<"none" | "pending_payment" | "unassigned_courier">("none");

  // Bekleyen tahsilat ve atanmamış kurye hesaplamaları
  const pendingPaymentOrders = React.useMemo(
    () => allOrders.filter((o) => o.status !== "iptal" && o.paymentStatus !== "paid"),
    [allOrders]
  );
  const pendingPaymentTotal = React.useMemo(
    () => pendingPaymentOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [pendingPaymentOrders]
  );
  const unassignedCourierCount = React.useMemo(
    () => allOrders.filter((o) => !o.courierId && o.status !== "iptal" && o.status !== "teslim_edildi").length,
    [allOrders]
  );

  const statusTabs = [
    { id: "all", label: "Tümü" },
    { id: "bekliyor", label: "🟡 Bekleyen", count: stats.pendingCount },
    { id: "hazirlaniyor", label: "🟠 Hazırlanan", count: stats.processingCount },
    { id: "firinda", label: "🔥 Fırında", count: stats.bakingCount },
    { id: "kuryede", label: "🛵 Kuryede", count: stats.courierCount },
    { id: "teslim_edildi", label: "🟢 Teslim Edilen", count: stats.completedTodayCount },
    { id: "iptal", label: "⚪ İptal" },
  ];

  const displayedOrders = React.useMemo(() => {
    return orders.filter((o) => {
      if (extraFilter === "pending_payment") {
        return o.paymentStatus !== "paid" && o.status !== "iptal";
      }
      if (extraFilter === "unassigned_courier") {
        return !o.courierId && o.status !== "iptal" && o.status !== "teslim_edildi";
      }
      return true;
    });
  }, [orders, extraFilter]);

  const [currentPage, setCurrentPage] = React.useState(0);
  const PAGE_SIZE = 24;

  React.useEffect(() => {
    setCurrentPage(0);
  }, [statusFilter, dateFilter, searchQuery, extraFilter]);

  const totalPages = Math.max(1, Math.ceil(displayedOrders.length / PAGE_SIZE));
  const paginatedOrders = React.useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return displayedOrders.slice(start, start + PAGE_SIZE);
  }, [displayedOrders, currentPage, PAGE_SIZE]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Sipariş Komuta Merkezi
          </h1>
          <p className="text-xs sm:text-sm text-foreground/60 font-sans mt-0.5">
            Canlı Fırın & Kurye Dağıtım Akışı
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/siparisler/dagitim"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#201812] hover:bg-[#2B2018] border border-artisan-gold/30 text-artisan-gold text-xs font-sans font-medium transition-all"
          >
            <Truck className="w-4 h-4" />
            <span>Kurye Dağıtım Listesi</span>
          </Link>

          <Link
            href="/admin/siparisler/yeni"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground text-xs font-serif font-bold shadow-lg shadow-artisan-terracotta/20 transition-all border border-artisan-gold/30"
          >
            <Plus className="w-4 h-4" />
            <span>Hızlı Sipariş Girişi</span>
          </Link>
        </div>
      </div>

      {/* Live Operational Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-foreground/60">
            <ShoppingBag className="w-3.5 h-3.5 text-artisan-gold" />
            <span>Bugünkü Siparişler</span>
          </div>
          <div className="font-serif text-2xl font-bold text-foreground">{stats.totalToday}</div>
          <div className="text-[10px] text-artisan-gold/80 font-mono">
            Toplam: {stats.todayRevenue.toLocaleString("tr-TR")} ₺
          </div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-foreground/60">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Bekleyen / Teyit</span>
          </div>
          <div className="font-serif text-2xl font-bold text-amber-400">{stats.pendingCount}</div>
          <div className="text-[10px] text-foreground/50 font-sans">Aksiyon bekliyor</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-foreground/60">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Fırında / Hazırlıkta</span>
          </div>
          <div className="font-serif text-2xl font-bold text-red-400">
            {stats.processingCount + stats.bakingCount}
          </div>
          <div className="text-[10px] text-foreground/50 font-sans">Üretim aşamasında</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-foreground/60">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>Kurye Dağıtımında</span>
          </div>
          <div className="font-serif text-2xl font-bold text-blue-400">{stats.courierCount}</div>
          <div className="text-[10px] text-foreground/50 font-sans">Yoldaki paketler</div>
        </div>
      </div>

      {/* Control Filters Bar: Date & Status */}
      <div className="space-y-3 bg-[#16120E] border border-[#261E17] p-4 rounded-2xl">
        {/* Row 1: Date Toggles & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-1 bg-[#1A1410] p-1 rounded-xl border border-[#2A201A] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setDateFilter("bugun")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-sans transition-all ${
                dateFilter === "bugun"
                  ? "bg-artisan-terracotta text-foreground font-bold shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Bugünün Teslimatları
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("yarin")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-sans transition-all ${
                dateFilter === "yarin"
                  ? "bg-artisan-terracotta text-foreground font-bold shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Yarınki Teslimatlar
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("hepsi")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-sans transition-all ${
                dateFilter === "hepsi"
                  ? "bg-artisan-terracotta text-foreground font-bold shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Tüm Tarihler
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-foreground/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim, telefon, mahalle ara..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1A1410] border border-[#2A201A] text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-artisan-gold"
            />
          </div>
        </div>

        {/* Row 2: Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-sans no-scrollbar">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-[#2A2018] text-artisan-gold border border-artisan-gold/40 font-bold"
                  : "bg-[#1A1410] text-foreground/60 hover:text-foreground border border-transparent"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-artisan-gold/20 text-artisan-gold text-[10px] font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Row 3: Özel Hızlı Filtreler (Tahsilat & Kurye Durumu) */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#221812] text-xs">
          <span className="text-[11px] font-sans text-foreground/50">Hızlı Filtre:</span>
          <button
            onClick={() => setExtraFilter(extraFilter === "pending_payment" ? "none" : "pending_payment")}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
              extraFilter === "pending_payment"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                : "bg-[#1A1410] text-foreground/60 hover:text-foreground border border-transparent"
            }`}
          >
            <span>Ödemesi Bekleyen</span>
            <span className="text-[10px] font-mono px-1 rounded bg-amber-500/10">
              {pendingPaymentOrders.length} ({pendingPaymentTotal} ₺)
            </span>
          </button>

          <button
            onClick={() => setExtraFilter(extraFilter === "unassigned_courier" ? "none" : "unassigned_courier")}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
              extraFilter === "unassigned_courier"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold"
                : "bg-[#1A1410] text-foreground/60 hover:text-foreground border border-transparent"
            }`}
          >
            <span>Kuryeye Atanmamış</span>
            <span className="text-[10px] font-mono px-1 rounded bg-blue-500/10">
              {unassignedCourierCount}
            </span>
          </button>
        </div>
      </div>

      {/* Orders List / Grid */}
      {loading ? (
        <div className="p-16 text-center space-y-3 bg-[#18130F] rounded-3xl border border-[#261E17]">
          <div className="w-10 h-10 rounded-full border-2 border-artisan-gold/30 border-t-artisan-gold animate-spin mx-auto" />
          <p className="text-xs text-foreground/60">Canlı siparişler yükleniyor...</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="p-16 text-center space-y-3 bg-[#18130F] rounded-3xl border border-[#261E17]">
          <div className="w-12 h-12 rounded-full bg-[#201812] border border-[#2F241D] flex items-center justify-center mx-auto text-foreground/40">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-base font-bold text-foreground">
              Seçilen Kriterlere Uygun Sipariş Bulunamadı
            </h3>
            <p className="text-xs text-foreground/60 max-w-sm mx-auto">
              Filtreleri değiştirebilir veya sağ üstteki butondan yeni WhatsApp/telefon siparişi girebilirsiniz.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {paginatedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateOrderStatus}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#18130F] border border-[#261E17] text-xs font-sans">
              <span className="text-foreground/60">
                Toplam <strong className="text-foreground font-mono">{displayedOrders.length}</strong> siparişten{" "}
                <span className="font-mono text-artisan-gold">
                  {currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, displayedOrders.length)}
                </span>{" "}
                arası gösteriliyor
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1.5 rounded-xl bg-[#221812] hover:bg-[#2C2018] text-foreground/80 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none border border-[#2F241D] flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Önceki</span>
                </button>
                <span className="px-3 py-1 font-mono text-artisan-gold bg-[#221812] rounded-xl border border-artisan-gold/20">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-1.5 rounded-xl bg-[#221812] hover:bg-[#2C2018] text-foreground/80 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none border border-[#2F241D] flex items-center gap-1 transition-all"
                >
                  <span>Sonraki</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
