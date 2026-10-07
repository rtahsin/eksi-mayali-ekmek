"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusCircle, Truck, Wallet, Flame, Clock, MessageCircle, Phone, Globe, Store, ArrowRight, Gauge } from "lucide-react";
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

/** "Bugün" paneli (Faz 3a-2): onay bekleyenler, bugün/yarın teslimat ve tahsilat, fırın planı, hızlı işlemler. */
export default function TodayPage() {
  const { allOrders, loading } = useAdminOrders();
  const today = useIstanbulToday();
  const tomorrow = addDays(today, 1);

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

  const actions = [
    { label: "Sipariş ekle", href: "/admin/siparisler/yeni", icon: PlusCircle },
    { label: "Teslimat", href: "/kurye", icon: Truck },
    { label: "Fiş kes / tahsilat", href: "/admin/cariler", icon: Wallet },
    { label: "Üretim", href: "/admin/uretim", icon: Flame },
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

      {/* Onay bekleyen siparişler */}
      <section className="bg-[#18130F] border border-[#261E17] rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#261E17]">
          <h2 className="font-serif font-bold text-stone-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> Onay bekleyen
            {pending.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#C85A32] text-white text-xs">{pending.length}</span>
            )}
          </h2>
          <Link href="/admin/siparisler" className="text-xs text-amber-400 flex items-center gap-1">
            Tümü <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="p-6 text-center text-xs text-stone-500">Yükleniyor…</div>
        ) : pending.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500">Onay bekleyen sipariş yok.</div>
        ) : (
          <ul className="divide-y divide-[#261E17]">
            {pending.slice(0, 8).map((o) => {
              const src = SOURCE_BADGE[o.source] ?? SOURCE_BADGE.web;
              return (
                <li key={o.id}>
                  <Link href={`/admin/siparisler/${o.id}`} className="flex items-center gap-3 p-4 hover:bg-stone-800/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-100 truncate">{o.customerName}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-xs font-bold shrink-0 ${src.cls}`}>
                          <src.icon className="w-3 h-3" /> {src.label}
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 truncate">
                        {relativeTrDate(o.deliveryDate)} · {o.neighborhood} · {o.items.reduce((n, it) => n + it.quantity, 0)} ürün
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-stone-200 shrink-0">{tl(o.totalAmount)}</span>
                  </Link>
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
