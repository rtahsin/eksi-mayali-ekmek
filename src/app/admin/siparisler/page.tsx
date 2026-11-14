"use client";

import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  ChefHat,
  Loader2,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { OrderCard } from "@/components/admin/OrderCard";
import { BulkLabelsModal } from "@/components/admin/BulkLabelsModal";
import type { AdminOrder } from "@/types/admin";
import {
  compareForWork,
  inStatusGroup,
  isUncollected,
  paymentLabel,
  STATUS_GROUP_LABELS,
  statusLabel,
  type StatusGroup,
} from "@/lib/orders/adminFlow";
import { addDays, formatTrDate } from "@/lib/time/istanbul";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";

const GROUPS: StatusGroup[] = ["acik", "yeni", "hazirlik", "yolda", "teslim", "iptal", "hepsi"];
const PAGE_SIZE = 30;

export default function AdminOrdersPage() {
  const {
    orders,
    allOrders,
    loading,
    error,
    dateFilter,
    setDateFilter,
    searchQuery,
    setSearchQuery,
    updateOrderStatus,
    searchOrders,
  } = useAdminOrders();
  const today = useIstanbulToday();
  const tomorrow = addDays(today, 1);

  const [customDate, setCustomDate] = React.useState<string>("");
  const [group, setGroup] = React.useState<StatusGroup>("acik");
  const [onlyUncollected, setOnlyUncollected] = React.useState(false);
  const [shown, setShown] = React.useState(PAGE_SIZE);

  // Toplu seçim ve aksiyon durumları
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = React.useState<"hazirlaniyor" | "kuryede" | null>(null);
  const [bulkFeedback, setBulkFeedback] = React.useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [labelsOpen, setLabelsOpen] = React.useState(false);
  const selectAllRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setShown(PAGE_SIZE);
    setSelectedIds(new Set());
    setBulkFeedback(null);
  }, [group, dateFilter, customDate, searchQuery, onlyUncollected]);

  // Eski siparişler yüklü listede olmayabilir: aramayı sunucuya da sor (yazmayı bitirince)
  React.useEffect(() => {
    if (searchQuery.trim().length < 3) return;
    const t = setTimeout(() => void searchOrders(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery, searchOrders]);

  const uncollected = React.useMemo(() => allOrders.filter(isUncollected), [allOrders]);

  const searching = searchQuery.trim().length > 0;
  const dateFilteredOrders = React.useMemo(() => {
    if (!customDate || searching) return orders;
    return orders.filter((o) => o.deliveryDate === customDate);
  }, [orders, customDate, searching]);

  // Tahsil edilmeyenler tarihe bakmadan listelenir; diğer filtreler tarih + arama listesine uygulanır.
  const base = onlyUncollected ? uncollected : dateFilteredOrders;
  const counts = React.useMemo(() => {
    const c = {} as Record<StatusGroup, number>;
    for (const g of GROUPS) c[g] = base.filter((o) => inStatusGroup(o.status, g)).length;
    return c;
  }, [base]);

  const list = React.useMemo(
    () => (onlyUncollected ? base : base.filter((o) => inStatusGroup(o.status, group))).slice().sort(compareForWork),
    [base, group, onlyUncollected]
  );

  const selectedOrders = React.useMemo(
    () => list.filter((o) => selectedIds.has(o.id)),
    [list, selectedIds]
  );

  const allSelected = list.length > 0 && selectedOrders.length === list.length;
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < list.length;

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const eligibleForPrep = React.useMemo(
    () => selectedOrders.filter((o) => o.status === "bekliyor"),
    [selectedOrders]
  );
  const eligibleForCourier = React.useMemo(
    () =>
      selectedOrders.filter(
        (o) => o.status === "bekliyor" || o.status === "hazirlaniyor" || o.status === "firinda"
      ),
    [selectedOrders]
  );

  const dayCount = (d: string) => allOrders.filter((o) => o.deliveryDate === d && o.status !== "iptal").length;
  const active = dateFilteredOrders.filter((o) => o.status !== "iptal");
  const loaves = active.reduce((s, o) => s + o.items.reduce((n, it) => n + it.quantity, 0), 0);
  const revenue = active.reduce((s, o) => s + o.totalAmount, 0);

  const dates: { id: typeof dateFilter; label: string; count?: number }[] = [
    { id: "bugun", label: "Bugün", count: dayCount(today) },
    { id: "yarin", label: "Yarın", count: dayCount(tomorrow) },
    { id: "hepsi", label: "Tümü" },
  ];

  const handlePresetDate = (preset: typeof dateFilter) => {
    setCustomDate("");
    setDateFilter(preset);
  };

  const handleCustomDateChange = (val: string) => {
    if (!val) {
      setCustomDate("");
      setDateFilter("hepsi");
      return;
    }
    if (val === today) {
      setCustomDate("");
      setDateFilter("bugun");
      return;
    }
    if (val === tomorrow) {
      setCustomDate("");
      setDateFilter("yarin");
      return;
    }
    setCustomDate(val);
    setDateFilter("hepsi");
  };

  const datePickerValue = customDate || (dateFilter === "bugun" ? today : dateFilter === "yarin" ? tomorrow : "");

  const activeDateLabel = React.useMemo(() => {
    if (onlyUncollected) return "Tahsilat Bekleyen Teslimler";
    if (customDate) return formatTrDate(customDate, "long");
    if (dateFilter === "bugun") return `Bugün (${formatTrDate(today, "long")})`;
    if (dateFilter === "yarin") return `Yarın (${formatTrDate(tomorrow, "long")})`;
    return "Tüm Tarihler";
  }, [onlyUncollected, customDate, dateFilter, today, tomorrow]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((o) => o.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const runBulkStatus = async (targetStatus: "hazirlaniyor" | "kuryede", targets: AdminOrder[]) => {
    if (bulkBusy || targets.length === 0) return;
    setBulkBusy(targetStatus);
    setBulkFeedback(null);
    let okCount = 0;
    const errors: string[] = [];

    try {
      for (const order of targets) {
        const res = await updateOrderStatus(order.id, targetStatus);
        if (res.success) {
          okCount += 1;
        } else {
          errors.push(`#${order.orderNumber}: ${res.error || "güncellenemedi"}`);
        }
      }
      if (errors.length > 0) {
        setBulkFeedback({
          kind: "error",
          message: `${okCount} sipariş güncellendi, ${errors.length} siparişte hata: ${errors.slice(0, 2).join(" · ")}`,
        });
      } else {
        const statusText = targetStatus === "hazirlaniyor" ? "Hazırlanıyor" : "Yolda / Hazır";
        setBulkFeedback({
          kind: "ok",
          message: `${okCount} sipariş "${statusText}" durumuna geçirildi.`,
        });
        setSelectedIds(new Set());
      }
    } finally {
      setBulkBusy(null);
    }
  };

  const handlePrintShipmentList = () => {
    if (labelsOpen) {
      setLabelsOpen(false);
      requestAnimationFrame(() => {
        window.print();
      });
      return;
    }
    window.print();
  };

  const printOrders = selectedOrders.length > 0 ? selectedOrders : list;
  const printItemCount = printOrders.reduce(
    (sum, o) => sum + o.items.reduce((n, it) => n + it.quantity, 0),
    0
  );
  const printTotalAmount = printOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <>
      <div className="space-y-4 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Siparişler</h1>
            {!loading && !onlyUncollected && (
              <p className="text-xs text-stone-400 mt-0.5">
                {customDate ? `${formatTrDate(customDate)} · ` : ""}
                {active.length} sipariş · {loaves} ürün · {revenue.toLocaleString("tr-TR")} ₺
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/kurye"
              aria-label="Teslimat ekranı"
              className="h-11 px-3 rounded-xl bg-[#201812] border border-[#2A201A] text-stone-300 text-sm flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-artisan-gold"
            >
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Teslimat</span>
            </Link>
            <Link
              href="/admin/siparisler/yeni"
              className="h-11 px-4 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground text-sm font-bold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-artisan-gold"
            >
              <Plus className="w-4 h-4" /> Yeni
            </Link>
          </div>
        </div>

        {uncollected.length > 0 && (
          <button
            type="button"
            onClick={() => setOnlyUncollected((v) => !v)}
            className={`w-full p-3 rounded-xl border text-sm text-left flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              onlyUncollected
                ? "bg-amber-500/20 border-amber-500/60 text-amber-100"
                : "bg-amber-950/30 border-amber-500/30 text-amber-200"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">
              Teslim edilmiş {uncollected.length} siparişin parası alınmadı (
              {uncollected.reduce((s, o) => s + o.totalAmount, 0).toLocaleString("tr-TR")} ₺)
            </span>
            <span className="text-xs underline">{onlyUncollected ? "Listeye dön" : "Göster"}</span>
          </button>
        )}

        {!onlyUncollected && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-1 gap-1 p-1 rounded-xl bg-[#16120E] border border-[#261E17]">
                {dates.map((d) => {
                  const isActive = !customDate && dateFilter === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handlePresetDate(d.id)}
                      className={`flex-1 h-10 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-artisan-gold ${
                        isActive ? "bg-artisan-terracotta text-foreground font-bold" : "text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      {d.label}
                      {d.count ? <span className="ml-1 font-mono text-xs opacity-80">{d.count}</span> : null}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 sm:flex-initial">
                  <Calendar className="w-4 h-4 text-stone-400 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    aria-label="Teslimat tarihi seç"
                    value={datePickerValue}
                    onChange={(e) => handleCustomDateChange(e.target.value)}
                    className={`h-12 w-full sm:w-auto pl-9 pr-3 rounded-xl border text-sm font-mono focus:outline-none focus:border-artisan-gold ${
                      customDate
                        ? "bg-artisan-terracotta/20 border-artisan-terracotta text-foreground font-bold"
                        : "bg-[#16120E] border-[#261E17] text-stone-300"
                    }`}
                  />
                </div>
                {customDate && (
                  <button
                    type="button"
                    aria-label="Özel tarih filtresini temizle"
                    onClick={() => handlePresetDate("bugun")}
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-[#1A1410] border border-[#2A201A] text-stone-300 hover:text-foreground flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`min-h-[40px] px-3.5 rounded-full text-sm whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-artisan-gold ${
                    group === g
                      ? "bg-[#2A2018] border-artisan-gold/50 text-artisan-gold font-bold"
                      : "bg-[#1A1410] border-transparent text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {STATUS_GROUP_LABELS[g]}
                  {counts[g] > 0 && <span className="ml-1 font-mono text-xs">{counts[g]}</span>}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İsim, telefon, mahalle, sipariş no"
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1A1410] border border-[#2A201A] text-sm text-foreground placeholder:text-stone-600 focus:outline-none focus:border-artisan-gold"
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}

        {bulkFeedback && (
          <div
            role={bulkFeedback.kind === "error" ? "alert" : "status"}
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              bulkFeedback.kind === "error"
                ? "bg-red-950/40 border-red-500/40 text-red-200"
                : "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
            }`}
          >
            <span>{bulkFeedback.message}</span>
            <button
              type="button"
              aria-label="Bildirimi kapat"
              onClick={() => setBulkFeedback(null)}
              className="p-1 text-current opacity-80 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-stone-400">Siparişler yükleniyor…</div>
        ) : list.length === 0 ? (
          <div className="py-14 text-center space-y-2 rounded-2xl border border-[#261E17] bg-[#18130F]">
            <ShoppingBag className="w-8 h-8 text-stone-600 mx-auto" />
            <p className="text-sm text-stone-300">
              {group === "acik" && customDate
                ? `${formatTrDate(customDate)} için açık sipariş yok.`
                : group === "acik" && dateFilter !== "hepsi"
                ? `${dateFilter === "bugun" ? "Bugün" : "Yarın"} için açık sipariş yok.`
                : "Bu filtrede sipariş yok."}
            </p>
            <p className="text-xs text-stone-500">Telefon ya da WhatsApp siparişini &quot;Yeni&quot; ile girebilirsin.</p>
          </div>
        ) : (
          <>
            {/* Toplu Seçim ve Toplu Durum / Yazdırma Çubuğu */}
            <div className="rounded-2xl border border-[#2A201A] bg-[#18130F] p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2.5 min-h-[44px] px-2.5 rounded-xl bg-[#201812] border border-[#2A201A] text-xs font-semibold text-stone-200 cursor-pointer select-none">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-artisan-terracotta"
                  />
                  <span>{allSelected ? "Tümünü Kaldır" : `Tümünü Seç (${list.length})`}</span>
                </label>

                {selectedOrders.length > 0 && (
                  <>
                    <span className="px-2.5 py-1 rounded-lg bg-artisan-terracotta/20 border border-artisan-terracotta/40 text-xs font-mono font-bold text-amber-200">
                      {selectedOrders.length} seçili
                    </span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="min-h-[44px] px-3 rounded-xl text-xs text-stone-400 hover:text-stone-200 underline"
                    >
                      Temizle
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedOrders.length > 0 && (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(bulkBusy) || eligibleForPrep.length === 0}
                      onClick={() => void runBulkStatus("hazirlaniyor", eligibleForPrep)}
                      title={
                        eligibleForPrep.length === 0
                          ? "Yalnızca 'Yeni (bekliyor)' durumundaki siparişler Hazırlanıyor yapılır"
                          : undefined
                      }
                      className="min-h-[44px] px-3.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                    >
                      {bulkBusy === "hazirlaniyor" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChefHat className="w-4 h-4" />
                      )}
                      <span>Hazırlanıyor Yap ({eligibleForPrep.length})</span>
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(bulkBusy) || eligibleForCourier.length === 0}
                      onClick={() => void runBulkStatus("kuryede", eligibleForCourier)}
                      title={
                        eligibleForCourier.length === 0
                          ? "Yalnızca teslim edilmemiş / iptal olmamış açık siparişler kuryeye çıkarılır"
                          : undefined
                      }
                      className="min-h-[44px] px-3.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                    >
                      {bulkBusy === "kuryede" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Truck className="w-4 h-4" />
                      )}
                      <span>Kuryeye Çıkar ({eligibleForCourier.length})</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setLabelsOpen(true)}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#241B14] hover:bg-[#2E231A] border border-[#36291F] text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>
                    Toplu Etiket Bas ({selectedOrders.length > 0 ? selectedOrders.length : list.length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintShipmentList}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#241B14] hover:bg-[#2E231A] border border-[#36291F] text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-stone-300" />
                  <span>
                    Sevkiyat Listesi Yazdır ({selectedOrders.length > 0 ? selectedOrders.length : list.length})
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.slice(0, shown).map((order) => {
                const isSelected = selectedIds.has(order.id);
                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl transition-shadow ${
                      isSelected ? "ring-2 ring-artisan-terracotta" : ""
                    }`}
                  >
                    <label
                      className={`flex items-center justify-between gap-2 px-3.5 min-h-[44px] rounded-t-2xl border border-b-0 cursor-pointer select-none text-xs ${
                        isSelected
                          ? "bg-artisan-terracotta/20 border-artisan-terracotta/50 text-amber-100"
                          : "bg-[#15100C] border-[#292019] text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 font-mono font-semibold">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(order.id)}
                          className="w-4 h-4 rounded accent-artisan-terracotta"
                        />
                        <span>#{order.orderNumber}</span>
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {formatTrDate(order.deliveryDate)} · {statusLabel(order.status, order.deliveryMethod)}
                      </span>
                    </label>
                    <div className="[&>article]:rounded-t-none">
                      <OrderCard order={order} onUpdateStatus={updateOrderStatus} />
                    </div>
                  </div>
                );
              })}
            </div>

            {list.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="w-full h-12 rounded-xl bg-[#201812] border border-[#2A201A] text-sm text-stone-300 hover:bg-[#281E17]"
              >
                {list.length - shown} sipariş daha göster
              </button>
            )}
          </>
        )}
      </div>

      {/* Toplu Paket & Torba Etiketleri Modalı */}
      <BulkLabelsModal
        orders={printOrders}
        date={activeDateLabel}
        isOpen={labelsOpen}
        onClose={() => setLabelsOpen(false)}
      />

      {/* Sevkiyat Listesi Yazdır (Beyaz Kağıt Tablosu — yalnızca etiket modalı kapalıyken yazdırılır) */}
      <div className={labelsOpen ? "hidden" : "hidden print:block bg-white text-black p-6 text-xs"}>
        <header className="flex items-end justify-between border-b-2 border-black pb-3 mb-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-gray-700">
              EkmekLab Taş Fırın · Operasyon & Dağıtım
            </p>
            <h2 className="font-serif text-xl font-bold text-black">
              Sevkiyat & Teslimat Listesi — {activeDateLabel}
            </h2>
          </div>
          <div className="text-right font-mono text-xs text-black">
            <div>
              <strong>{printOrders.length}</strong> sipariş · <strong>{printItemCount}</strong> adet ürün
            </div>
            <div>
              Toplam: <strong>{printTotalAmount.toLocaleString("tr-TR")} ₺</strong>
            </div>
          </div>
        </header>

        <table className="w-full border-collapse text-left text-black">
          <caption className="sr-only">Seçili gün ve filtre için sevkiyat sipariş tablosu</caption>
          <thead>
            <tr className="border-b-2 border-black bg-gray-100 text-[11px] uppercase">
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 w-16">
                # / No
              </th>
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 w-40">
                Müşteri & Telefon
              </th>
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400">
                Teslimat / Adres
              </th>
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 w-56">
                Ürün Kalemleri
              </th>
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 w-28">
                Ödeme
              </th>
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 text-right w-24">
                Tutar
              </th>
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 text-center w-16">
                İmza
              </th>
            </tr>
          </thead>
          <tbody>
            {printOrders.map((order, idx) => {
              const isPickup = order.deliveryMethod === "pickup";
              const paidBadge =
                order.cariId || order.paymentMethod === "cari"
                  ? "Cari"
                  : order.paymentStatus === "paid"
                  ? "Ödendi"
                  : "Tahsil Edilecek";
              return (
                <tr key={order.id} className="border-b border-gray-400 break-inside-avoid align-top">
                  <td className="py-2 px-2 border border-gray-400 font-mono">
                    <div className="font-bold">{idx + 1}</div>
                    <div className="text-[10px] text-gray-700">#{order.orderNumber}</div>
                  </td>
                  <td className="py-2 px-2 border border-gray-400">
                    <div className="font-bold">{order.customerName}</div>
                    {order.phone && <div className="font-mono text-[11px]">{order.phone}</div>}
                  </td>
                  <td className="py-2 px-2 border border-gray-400">
                    {isPickup ? (
                      <div className="font-bold">Fırından Gel-Al</div>
                    ) : (
                      <div>
                        {order.neighborhood && <strong>{order.neighborhood} · </strong>}
                        <span>{order.deliveryAddress}</span>
                      </div>
                    )}
                    {order.deliveryTimeWindow && (
                      <div className="text-[10px] text-gray-700 font-mono">Saat: {order.deliveryTimeWindow}</div>
                    )}
                    {order.orderNotes && (
                      <div className="text-[10px] italic mt-0.5">Not: {order.orderNotes}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 border border-gray-400">
                    {order.items.map((it, i) => (
                      <div key={`${order.id}-item-${i}`} className="leading-snug">
                        <strong className="font-mono">{it.quantity}×</strong> {it.productName}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-2 border border-gray-400 text-[11px]">
                    <div className="font-semibold">{paymentLabel(order.paymentMethod, order.deliveryMethod)}</div>
                    <div className="text-[10px] text-gray-700">{paidBadge}</div>
                  </td>
                  <td className="py-2 px-2 border border-gray-400 text-right font-mono font-bold whitespace-nowrap">
                    {order.totalAmount.toLocaleString("tr-TR")} ₺
                  </td>
                  <td className="py-2 px-2 border border-gray-400 text-center font-mono text-base">
                    ☐
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-black">
              <td colSpan={3} className="py-2 px-2 border border-gray-400">
                TOPLAM ({printOrders.length} sipariş)
              </td>
              <td className="py-2 px-2 border border-gray-400 font-mono">{printItemCount} adet ürün</td>
              <td className="py-2 px-2 border border-gray-400" />
              <td className="py-2 px-2 border border-gray-400 text-right font-mono whitespace-nowrap">
                {printTotalAmount.toLocaleString("tr-TR")} ₺
              </td>
              <td className="py-2 px-2 border border-gray-400" />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
