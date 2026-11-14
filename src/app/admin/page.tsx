"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Truck,
  Wallet,
  Flame,
  Clock,
  MessageCircle,
  Phone,
  Globe,
  Store,
  ArrowRight,
  Gauge,
  Check,
  CheckCheck,
  Loader2,
  Banknote,
  CreditCard,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { addDays, formatTrDate, relativeTrDate } from "@/lib/time/istanbul";
import { summarizeDay, type DaySummary } from "@/lib/orders/daySummary";
import type { ProductionDay } from "@/types/production";
import type { OrderSource } from "@/types/admin";

const SOURCE_BADGE: Record<OrderSource, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  phone: { label: "Telefon", icon: Phone, cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  web: { label: "Web", icon: Globe, cls: "bg-stone-800 text-stone-300 border-stone-700" },
  in_store: { label: "Dükkân", icon: Store, cls: "bg-stone-800 text-stone-300 border-stone-700" },
};

const tl = (n: number) => `${n.toLocaleString("tr-TR")} ₺`;

/** Üretim API'si: o günün ekmek/paket satırları ve kapasite doluluğu */
function useProduction(date: string): ProductionDay | null {
  const [data, setData] = useState<ProductionDay | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/production?date=${date}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<ProductionDay>) : null))
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setData(null);
      });
    return () => {
      alive = false;
    };
  }, [date]);
  return data;
}

function ZReconciliationCard({ date, s }: { date: string; s: DaySummary }) {
  const openDoorTotal = s.collectCash + s.collectPos + s.collectTransfer + s.uncollectedDelivered;

  return (
    <section className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#261E17] pb-3.5">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Günlük Ciro & Kasa Mutabakatı (Z-Özeti)
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            {formatTrDate(date, "long")} · {s.activeOrderCount} aktif sipariş ({s.delivered} teslim · {s.toDeliver} açık)
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xs text-stone-400">Bugünkü Toplam Ciro</div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-stone-100">{tl(s.grossRevenue)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-emerald-500/20 space-y-1">
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Kasaya Giren Nakit
          </div>
          <div className="text-lg font-black font-mono text-emerald-300">{tl(s.collectedCash)}</div>
          <div className="text-[11px] text-stone-500">Tahsil edildi</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-emerald-500/20 space-y-1">
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> POS & Kart Tahsilatı
          </div>
          <div className="text-lg font-black font-mono text-emerald-300">{tl(s.collectedPos)}</div>
          <div className="text-[11px] text-stone-500">
            {s.collectedTransfer > 0 ? `+ ${tl(s.collectedTransfer)} havale ödendi` : "POS / Online ödendi"}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-orange-500/20 space-y-1">
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-orange-400" /> Cariye İşlenen
          </div>
          <div className="text-lg font-black font-mono text-orange-300">{tl(s.bookedCari)}</div>
          <div className="text-[11px] text-stone-500">
            {s.pendingCari > 0 ? `+ ${tl(s.pendingCari)} teslimde işlenecek` : "Teslim edilen B2B fişler"}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-amber-500/30 space-y-1">
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Kapıda Açık Tahsilat
          </div>
          <div className="text-lg font-black font-mono text-amber-300">{tl(openDoorTotal)}</div>
          <div className="text-[11px] text-stone-400 truncate">
            {openDoorTotal === 0
              ? "Açık tahsilat yok"
              : [
                  s.collectCash > 0 ? `Nakit ${tl(s.collectCash)}` : null,
                  s.collectPos > 0 ? `POS ${tl(s.collectPos)}` : null,
                  s.collectTransfer > 0 ? `Havale ${tl(s.collectTransfer)}` : null,
                  s.uncollectedDelivered > 0 ? `Alınmamış ${tl(s.uncollectedDelivered)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </div>
        </div>
      </div>
    </section>
  );
}

function DeliveryCard({ title, date, s }: { title: string; date: string; s: DaySummary }) {
  return (
    <Link
      href="/kurye"
      className="block bg-[#18130F] border border-[#261E17] hover:border-amber-500/40 rounded-3xl p-5 space-y-3 transition-colors"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-stone-100 flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-400" /> {title}
        </h3>
        <span className="text-xs text-stone-500">{formatTrDate(date)}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black font-mono text-stone-100">{s.toDeliver}</span>
        <span className="text-xs text-stone-400">
          teslim edilecek{s.delivered > 0 && ` · ${s.delivered} teslim edildi`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 font-medium">
          <Truck className="w-3.5 h-3.5 text-amber-400" />
          Kurye: <strong className="font-mono text-amber-300">{s.courierToDeliver}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 font-medium">
          <Store className="w-3.5 h-3.5 text-stone-400" />
          Gel-Al: <strong className="font-mono text-stone-100">{s.pickupToDeliver}</strong>
        </span>
      </div>

      {s.unconfirmed > 0 && <div className="text-xs text-amber-300">{s.unconfirmed} tanesi onay bekliyor</div>}
      {(s.collectCash > 0 || s.collectPos > 0 || s.collectTransfer > 0 || s.onAccount > 0) && (
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          {s.collectCash > 0 && (
            <div className="text-stone-300">
              Nakit: <strong className="text-amber-300 font-mono">{tl(s.collectCash)}</strong>
            </div>
          )}
          {s.collectPos > 0 && (
            <div className="text-stone-300">
              POS: <strong className="text-amber-300 font-mono">{tl(s.collectPos)}</strong>
            </div>
          )}
          {s.collectTransfer > 0 && (
            <div className="text-stone-300">
              Havale: <strong className="text-amber-300 font-mono">{tl(s.collectTransfer)}</strong>
            </div>
          )}
          {s.onAccount > 0 && (
            <div className="text-stone-300">
              Cariye: <strong className="text-orange-300 font-mono">{tl(s.onAccount)}</strong>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

function BakeCard({ title, p }: { title: string; p: ProductionDay | null }) {
  const breads = p?.lines.filter((l) => l.capacityUnits > 0) ?? [];
  const extras = p?.lines.filter((l) => l.capacityUnits === 0) ?? [];
  const limit = p?.capacity.limit ?? null;
  const used = p?.capacity.used ?? 0;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <Link
      href="/admin/uretim"
      className="block bg-[#18130F] border border-[#261E17] hover:border-amber-500/40 rounded-3xl p-5 space-y-3 transition-colors"
    >
      <h3 className="font-serif font-bold text-stone-100 flex items-center gap-2">
        <Flame className="w-4 h-4 text-[#C85A32]" /> {title}
      </h3>
      {!p ? (
        <div className="text-xs text-stone-500">Yükleniyor…</div>
      ) : breads.length === 0 && extras.length === 0 ? (
        <div className="text-xs text-stone-500">
          Sipariş yok{p.wholesaleLoaves > 0 && ` · şarküterilere ${p.wholesaleLoaves} ekmek`}
        </div>
      ) : (
        <div className="space-y-1 text-sm">
          {breads.map((l) => (
            <div key={l.productId} className="flex justify-between text-stone-200">
              <span>{l.name}</span>
              <span className="font-mono font-bold text-amber-300">{l.quantity}</span>
            </div>
          ))}
          {p.wholesaleLoaves > 0 && (
            <div className="flex justify-between text-stone-400 text-xs pt-1 border-t border-[#261E17]">
              <span>+ Şarküterilere (günlük toptan)</span>
              <span className="font-mono">{p.wholesaleLoaves}</span>
            </div>
          )}
          {extras.length > 0 && (
            <div className="text-xs text-stone-500 pt-1">
              Paketlenecek: {extras.map((l) => `${l.quantity}× ${l.name}`).join(", ")}
            </div>
          )}
        </div>
      )}
      {limit !== null && (
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" /> Kapasite
            </span>
            <span className="font-mono">
              {used} / {limit}
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
            <div className={`h-full ${pct >= 90 ? "bg-[#C85A32]" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </Link>
  );
}

/** "Bugün" paneli: Z-mutabakatı, tek tıkla sipariş onayı, bugün/yarın teslimat (kurye/gel-al) ve fırın planı. */
export default function TodayPage() {
  const { allOrders, loading, updateOrderStatus } = useAdminOrders();
  const today = useIstanbulToday();
  const tomorrow = addDays(today, 1);

  const [approvingIds, setApprovingIds] = useState<Set<string>>(() => new Set());
  const [approvingAll, setApprovingAll] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const todaySum = useMemo(() => summarizeDay(allOrders, today), [allOrders, today]);
  const tomorrowSum = useMemo(() => summarizeDay(allOrders, tomorrow), [allOrders, tomorrow]);
  const pending = useMemo(
    () =>
      allOrders
        .filter((o) => o.status === "bekliyor")
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || (a.createdAt || "").localeCompare(b.createdAt || "")),
    [allOrders]
  );
  const prodToday = useProduction(today);
  const prodTomorrow = useProduction(tomorrow);

  const handleApproveSingle = async (orderId: string) => {
    if (approvingIds.has(orderId) || approvingAll) return;
    setApproveError(null);
    setApprovingIds((prev) => new Set(prev).add(orderId));
    try {
      const res = await updateOrderStatus(orderId, "hazirlaniyor");
      if (!res.success) {
        setApproveError(res.error || "Sipariş onaylanamadı.");
      }
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleApproveAll = async () => {
    if (pending.length === 0 || approvingAll) return;
    setApproveError(null);
    setApprovingAll(true);
    try {
      const errors: string[] = [];
      for (const o of pending) {
        const res = await updateOrderStatus(o.id, "hazirlaniyor");
        if (!res.success) {
          errors.push(`${o.customerName}: ${res.error || "hata"}`);
        }
      }
      if (errors.length > 0) {
        setApproveError(`Bazı siparişler onaylanamadı: ${errors.join(", ")}`);
      }
    } finally {
      setApprovingAll(false);
    }
  };

  const actions = [
    { label: "Sipariş ekle", href: "/admin/siparisler/yeni", icon: PlusCircle },
    { label: "Teslimat", href: "/kurye", icon: Truck },
    { label: "Fiş kes / tahsilat", href: "/admin/cariler", icon: Wallet },
    { label: "Fırından çıktı", href: "/admin/uretim#firindan-cikti", icon: Flame },
  ];

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-100">Bugün</h1>
        <p className="text-xs text-stone-400 mt-0.5">{formatTrDate(today, "long")}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-[#18130F] border border-[#261E17] hover:border-amber-500/40 text-stone-200 text-xs font-bold min-h-[80px] active:scale-95 transition-all"
          >
            <a.icon className="w-6 h-6 text-amber-400" />
            {a.label}
          </Link>
        ))}
      </div>

      {/* Günlük Ciro & Kasa Mutabakatı Kartı (Z-Özeti) */}
      <ZReconciliationCard date={today} s={todaySum} />

      {/* Onay bekleyen siparişler */}
      <section className="bg-[#18130F] border border-[#261E17] rounded-3xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-[#261E17]">
          <h2 className="font-serif font-bold text-stone-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> Onay bekleyen
            {pending.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#C85A32] text-white text-xs">{pending.length}</span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <button
                type="button"
                disabled={approvingAll || approvingIds.size > 0}
                onClick={() => void handleApproveAll()}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
              >
                {approvingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                <span>{approvingAll ? "Onaylanıyor…" : `Tümünü Onayla (${pending.length})`}</span>
              </button>
            )}
            <Link href="/admin/siparisler" className="min-h-[40px] px-2 text-xs text-amber-400 flex items-center gap-1">
              Tümü <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {approveError && (
          <div role="alert" className="px-4 py-2.5 bg-red-950/50 border-b border-red-500/30 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{approveError}</span>
          </div>
        )}

        {loading ? (
          <div className="p-6 text-center text-xs text-stone-500">Yükleniyor…</div>
        ) : pending.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500">Onay bekleyen sipariş yok.</div>
        ) : (
          <ul className="divide-y divide-[#261E17]">
            {pending.slice(0, 8).map((o) => {
              const src = SOURCE_BADGE[o.source] ?? SOURCE_BADGE.web;
              const isBusy = approvingAll || approvingIds.has(o.id);
              return (
                <li key={o.id} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 hover:bg-stone-800/30">
                  <Link href={`/admin/siparisler/${o.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-100 truncate">{o.customerName}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-xs font-bold shrink-0 ${src.cls}`}>
                          <src.icon className="w-3 h-3" /> {src.label}
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 truncate mt-0.5">
                        {relativeTrDate(o.deliveryDate)} · {o.deliveryMethod === "pickup" ? "Gel-Al" : o.neighborhood} ·{" "}
                        {o.items.reduce((n, it) => n + it.quantity, 0)} ürün
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-stone-200 shrink-0">{tl(o.totalAmount)}</span>
                  </Link>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleApproveSingle(o.id)}
                    aria-label={`${o.customerName} siparişini onayla`}
                    className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Onayla</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Teslimat ve tahsilat */}
      <div className="grid sm:grid-cols-2 gap-4">
        <DeliveryCard title="Bugünkü teslimat" date={today} s={todaySum} />
        <DeliveryCard title="Yarınki teslimat" date={tomorrow} s={tomorrowSum} />
      </div>

      {/* Fırın planı */}
      <div className="grid sm:grid-cols-2 gap-4">
        <BakeCard title="Bugünkü fırın" p={prodToday} />
        <BakeCard title="Yarınki fırın" p={prodTomorrow} />
      </div>
    </div>
  );
}
