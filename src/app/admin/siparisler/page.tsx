"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Plus, Search, ShoppingBag, Truck } from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { OrderCard } from "@/components/admin/OrderCard";
import { compareForWork, inStatusGroup, isUncollected, STATUS_GROUP_LABELS, type StatusGroup } from "@/lib/orders/adminFlow";
import { addDays } from "@/lib/time/istanbul";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";

const GROUPS: StatusGroup[] = ["acik", "yeni", "hazirlik", "yolda", "teslim", "iptal", "hepsi"];
const PAGE_SIZE = 30;

export default function AdminOrdersPage() {
  const { orders, allOrders, loading, error, dateFilter, setDateFilter, searchQuery, setSearchQuery, updateOrderStatus, searchOrders } =
    useAdminOrders();
  const today = useIstanbulToday();
  const tomorrow = addDays(today, 1);

  const [group, setGroup] = React.useState<StatusGroup>("acik");
  const [onlyUncollected, setOnlyUncollected] = React.useState(false);
  const [shown, setShown] = React.useState(PAGE_SIZE);

  React.useEffect(() => setShown(PAGE_SIZE), [group, dateFilter, searchQuery, onlyUncollected]);

  // Eski siparişler yüklü listede olmayabilir: aramayı sunucuya da sor (yazmayı bitirince)
  React.useEffect(() => {
    if (searchQuery.trim().length < 3) return;
    const t = setTimeout(() => void searchOrders(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery, searchOrders]);

  const uncollected = React.useMemo(() => allOrders.filter(isUncollected), [allOrders]);

  // Tahsil edilmeyenler tarihe bakmadan listelenir; diğer filtreler hook'tan (tarih + arama) gelen listeye uygulanır.
  const base = onlyUncollected ? uncollected : orders;
  const counts = React.useMemo(() => {
    const c = {} as Record<StatusGroup, number>;
    for (const g of GROUPS) c[g] = base.filter((o) => inStatusGroup(o.status, g)).length;
    return c;
  }, [base]);
  const list = React.useMemo(
    () => (onlyUncollected ? base : base.filter((o) => inStatusGroup(o.status, group))).slice().sort(compareForWork),
    [base, group, onlyUncollected]
  );

  const dayCount = (d: string) => allOrders.filter((o) => o.deliveryDate === d && o.status !== "iptal").length;
  const active = orders.filter((o) => o.status !== "iptal");
  const loaves = active.reduce((s, o) => s + o.items.reduce((n, it) => n + it.quantity, 0), 0);
  const revenue = active.reduce((s, o) => s + o.totalAmount, 0);

  const dates: { id: typeof dateFilter; label: string; count?: number }[] = [
    { id: "bugun", label: "Bugün", count: dayCount(today) },
    { id: "yarin", label: "Yarın", count: dayCount(tomorrow) },
    { id: "hepsi", label: "Tümü" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Siparişler</h1>
          {!loading && !onlyUncollected && (
            <p className="text-xs text-stone-400 mt-0.5">
              {active.length} sipariş · {loaves} ürün · {revenue.toLocaleString("tr-TR")} ₺
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kurye" aria-label="Teslimat ekranı" className="h-11 px-3 rounded-xl bg-[#201812] border border-[#2A201A] text-stone-300 text-sm flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Teslimat</span>
          </Link>
          <Link href="/admin/siparisler/yeni" className="h-11 px-4 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Yeni
          </Link>
        </div>
      </div>

      {uncollected.length > 0 && (
        <button
          type="button"
          onClick={() => setOnlyUncollected((v) => !v)}
          className={`w-full p-3 rounded-xl border text-sm text-left flex items-center gap-2 ${
            onlyUncollected ? "bg-amber-500/20 border-amber-500/60 text-amber-100" : "bg-amber-950/30 border-amber-500/30 text-amber-200"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            Teslim edilmiş {uncollected.length} siparişin parası alınmadı ({uncollected.reduce((s, o) => s + o.totalAmount, 0).toLocaleString("tr-TR")} ₺)
          </span>
          <span className="text-xs underline">{onlyUncollected ? "Listeye dön" : "Göster"}</span>
        </button>
      )}

      {!onlyUncollected && (
        <div className="space-y-2">
          <div className="flex gap-1 p-1 rounded-xl bg-[#16120E] border border-[#261E17]">
            {dates.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateFilter(d.id)}
                className={`flex-1 h-10 rounded-lg text-sm ${dateFilter === d.id ? "bg-artisan-terracotta text-foreground font-bold" : "text-stone-400"}`}
              >
                {d.label}
                {d.count ? <span className="ml-1 font-mono text-xs opacity-80">{d.count}</span> : null}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`h-9 px-3 rounded-full text-sm whitespace-nowrap border ${
                  group === g ? "bg-[#2A2018] border-artisan-gold/50 text-artisan-gold font-bold" : "bg-[#1A1410] border-transparent text-stone-400"
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

      {error && <p className="text-sm text-red-300">{error}</p>}

      {loading ? (
        <div className="py-16 text-center text-sm text-stone-400">Siparişler yükleniyor…</div>
      ) : list.length === 0 ? (
        <div className="py-14 text-center space-y-2 rounded-2xl border border-[#261E17] bg-[#18130F]">
          <ShoppingBag className="w-8 h-8 text-stone-600 mx-auto" />
          <p className="text-sm text-stone-300">
            {group === "acik" && dateFilter !== "hepsi" ? `${dateFilter === "bugun" ? "Bugün" : "Yarın"} için açık sipariş yok.` : "Bu filtrede sipariş yok."}
          </p>
          <p className="text-xs text-stone-500">Telefon ya da WhatsApp siparişini &quot;Yeni&quot; ile girebilirsin.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.slice(0, shown).map((order) => (
              <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} />
            ))}
          </div>
          {list.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="w-full h-12 rounded-xl bg-[#201812] border border-[#2A201A] text-sm text-stone-300"
            >
              {list.length - shown} sipariş daha göster
            </button>
          )}
        </>
      )}
    </div>
  );
}
