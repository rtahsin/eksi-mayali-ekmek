"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CalendarCheck2,
  Check,
  CheckCheck,
  Clock,
  CreditCard,
  Flame,
  Gauge,
  Globe,
  Loader2,
  MessageCircle,
  PackageCheck,
  Phone,
  PlusCircle,
  Printer,
  Receipt,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCouriers } from "@/hooks/useCouriers";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { addDays, formatTrDate, relativeTrDate } from "@/lib/time/istanbul";
import { summarizeDay, type DaySummary } from "@/lib/orders/daySummary";
import { computeCourierCashVariance } from "@/lib/delivery/settlement";
import { hasCapability } from "@/lib/security/capabilities";
import type { ProductionDay } from "@/types/production";
import type { AdminOrder, CariAccount, ExtendedOrderSource } from "@/types/admin";

interface BulkStatusResponse {
  ok?: boolean;
  updatedCount?: number;
  updatedIds?: string[];
  skippedCount?: number;
  skipped?: { orderId: string; orderNumber: string | null; reason: string }[];
  error?: string;
}

interface TeamSettlementRow {
  cashHandedOver: number;
  cardSlipTotal: number;
  cashExpected: number;
  cardExpected: number;
}

interface TeamCourierSummaryRow {
  cashExpected: number;
  retailCashExpected?: number;
  cardExpected: number;
  settlement: TeamSettlementRow | null;
}

interface TeamCourierRow {
  id: string;
  isActive: boolean;
  isOnShift: boolean;
  summary: TeamCourierSummaryRow | null;
}

interface TeamApiPayload {
  couriers?: TeamCourierRow[];
  settlements?: TeamSettlementRow[];
}

interface TeamCashStats {
  onShiftCouriers: number;
  activeCouriers: number;
  settledCash: number;
  settledPos: number;
  courierDeliveredCashTotal: number;
  courierRetailCashTotal: number;
  courierDeliveredPosTotal: number;
  openCourierCash: number;
  openCourierPos: number;
  cashShortfall: number;
}

interface CariRadarStats {
  loading: boolean;
  totalReceivable: number;
  overLimitAccounts: CariAccount[];
  topDebtors: CariAccount[];
}

const SOURCE_BADGE: Record<
  ExtendedOrderSource,
  { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    cls: "bg-[#E5EFE7] text-[#1D5130] border-[#B4D3BC]",
  },
  phone: {
    label: "Telefon",
    icon: Phone,
    cls: "bg-[#FEF3D6] text-[#7A4A0B] border-[#E8C587]",
  },
  web: {
    label: "Web",
    icon: Globe,
    cls: "bg-[#F6EEDF] text-[#3B1E1A] border-[#E2D3BD]",
  },
  in_store: {
    label: "Dükkân",
    icon: Store,
    cls: "bg-[#EEF3F8] text-[#24476B] border-[#C5D5E4]",
  },
  admin: {
    label: "Panel",
    icon: Store,
    cls: "bg-[#FBF6EC] text-[#3B1E1A] border-[#E2D3BD]",
  },
  standing_order: {
    label: "Sabit Rutin",
    icon: CalendarCheck2,
    cls: "bg-[#F3E2D4] text-[#8E3D1B] border-[#DFB99F]",
  },
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

function useTeamCash(date: string, enabled: boolean): TeamCashStats | null {
  const [stats, setStats] = useState<TeamCashStats | null>(null);
  useEffect(() => {
    if (!enabled) {
      setStats(null);
      return;
    }
    let alive = true;
    fetch(`/api/admin/team?date=${date}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<TeamApiPayload>) : null))
      .then((payload) => {
        if (!alive || !payload) return;
        const couriers = Array.isArray(payload.couriers) ? payload.couriers : [];
        const settlements = Array.isArray(payload.settlements) ? payload.settlements : [];
        const active = couriers.filter((c) => c.isActive);
        const onShiftCouriers = active.filter((c) => c.isOnShift).length;
        const settledCash = settlements.reduce((s, x) => s + (Number(x.cashHandedOver) || 0), 0);
        const settledPos = settlements.reduce((s, x) => s + (Number(x.cardSlipTotal) || 0), 0);
        const courierDeliveredCashTotal = couriers.reduce(
          (s, c) => s + (Number(c.summary?.cashExpected) || 0),
          0
        );
        const courierRetailCashTotal = couriers.reduce(
          (s, c) => s + (Number(c.summary?.retailCashExpected ?? c.summary?.cashExpected) || 0),
          0
        );
        const courierDeliveredPosTotal = couriers.reduce(
          (s, c) => s + (Number(c.summary?.cardExpected) || 0),
          0
        );
        const openCourierCash = couriers.reduce((s, c) => {
          const expected = Number(c.summary?.cashExpected) || 0;
          const settledExp = Number(c.summary?.settlement?.cashExpected) || 0;
          return s + Math.max(0, expected - settledExp);
        }, 0);
        const openCourierPos = couriers.reduce((s, c) => {
          const expected = Number(c.summary?.cardExpected) || 0;
          const settledExp = Number(c.summary?.settlement?.cardExpected) || 0;
          return s + Math.max(0, expected - settledExp);
        }, 0);
        const cashShortfall = settlements.reduce((s, x) => {
          const variance = computeCourierCashVariance({
            cashExpected: Number(x.cashExpected) || 0,
            cardExpected: Number(x.cardExpected) || 0,
            cashHandedOver: Number(x.cashHandedOver) || 0,
            cardSlipTotal: Number(x.cardSlipTotal) || 0,
          });
          return s + variance.cashShortfall;
        }, 0);
        setStats({
          onShiftCouriers,
          activeCouriers: active.length,
          settledCash,
          settledPos,
          courierDeliveredCashTotal,
          courierRetailCashTotal,
          courierDeliveredPosTotal,
          openCourierCash,
          openCourierPos,
          cashShortfall,
        });
      })
      .catch(() => {
        if (alive) setStats(null);
      });
    return () => {
      alive = false;
    };
  }, [date, enabled]);
  return stats;
}

function useCariRadar(enabled: boolean): CariRadarStats {
  const [accounts, setAccounts] = useState<CariAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetch("/api/admin/cari/accounts", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ accounts?: CariAccount[] }>) : null))
      .then((payload) => {
        if (!alive) return;
        setAccounts(Array.isArray(payload?.accounts) ? payload.accounts : []);
      })
      .catch(() => {
        if (alive) setAccounts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return useMemo(() => {
    const activeCustomers = accounts.filter((a) => !a.archivedAt && a.accountType !== "gider");
    const totalReceivable = activeCustomers.reduce((s, a) => s + (a.balance > 0 ? a.balance : 0), 0);
    const overLimitAccounts = activeCustomers
      .filter((a) => typeof a.creditLimit === "number" && a.creditLimit > 0 && a.balance > a.creditLimit)
      .sort((a, b) => b.balance - a.balance);
    const topDebtors = activeCustomers
      .filter((a) => a.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
    return { loading, totalReceivable, overLimitAccounts, topDebtors };
  }, [accounts, loading]);
}

function ZReconciliationCard({
  date,
  s,
  teamCash,
}: {
  date: string;
  s: DaySummary;
  teamCash: TeamCashStats | null;
}) {
  const directStoreCash = Math.max(0, s.collectedCash - (teamCash?.courierRetailCashTotal ?? 0));
  const netCashEntered = teamCash ? directStoreCash + teamCash.settledCash : null;
  const openCourierCash = teamCash?.openCourierCash ?? 0;
  const openCourierPos = teamCash?.openCourierPos ?? 0;
  const cashShortfall = teamCash?.cashShortfall ?? 0;
  const openDoorTotal = s.collectCash + s.collectPos + s.collectTransfer + s.uncollectedDelivered;

  return (
    <section className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2D3BD] pb-3.5">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#8E3D1B] flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" aria-hidden="true" /> Günlük Ciro &amp; Kasa Mutabakatı (Z-Özeti)
          </div>
          <p className="text-xs text-[#6E5148] mt-0.5">
            {formatTrDate(date, "long")} · <span className="font-mono tabular-nums">{s.activeOrderCount}</span> aktif
            sipariş (<span className="font-mono tabular-nums">{s.delivered}</span> teslim ·{" "}
            <span className="font-mono tabular-nums">{s.toDeliver}</span> açık)
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xs text-[#6E5148]">Bugünkü Toplam Ciro</div>
          <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-[#3B1E1A]">
            {tl(s.grossRevenue)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#FBF6EC] border border-[#B4D3BC] space-y-1">
          <div className="text-xs text-[#6E5148] flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 text-[#1D5130]" aria-hidden="true" /> Kasaya Giren Net Nakit
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-[#1D5130]">
            {netCashEntered !== null ? tl(netCashEntered) : "Yükleniyor…"}
          </div>
          <div className="text-[11px] text-[#6E5148]">
            {openCourierCash > 0
              ? `+ ${tl(openCourierCash)} kurye zimmetinde bekliyor`
              : "Dükkân + mutabık kurye nakiti"}
          </div>
          {cashShortfall > 0 && (
            <div className="text-[11px] font-semibold text-[#8E3D1B]">
              Kurye nakit açığı: {tl(cashShortfall)}
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FBF6EC] border border-[#B4D3BC] space-y-1">
          <div className="text-xs text-[#6E5148] flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-[#1D5130]" aria-hidden="true" /> POS &amp; Havale Tahsilatı
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-[#1D5130]">
            {tl(s.collectedPos + s.collectedTransfer)}
          </div>
          <div className="text-[11px] text-[#6E5148]">
            {openCourierPos > 0
              ? `${tl(openCourierPos)} kurye POS slibi mutabakat bekliyor`
              : s.collectedTransfer > 0
                ? `${tl(s.collectedPos)} POS · ${tl(s.collectedTransfer)} havale`
                : "POS / Online ödendi"}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FBF6EC] border border-[#DFB99F] space-y-1">
          <div className="text-xs text-[#6E5148] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#8E3D1B]" aria-hidden="true" /> Cariye İşlenen
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-[#8E3D1B]">{tl(s.bookedCari)}</div>
          <div className="text-[11px] text-[#6E5148]">
            {s.pendingCari > 0 ? `+ ${tl(s.pendingCari)} teslimde işlenecek` : "Teslim edilen B2B fişler"}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FBF6EC] border border-[#E8C587] space-y-1">
          <div className="text-xs text-[#6E5148] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#7A4A0B]" aria-hidden="true" /> Açık Zimmet &amp; Kapıda
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-[#7A4A0B]">
            {tl(openDoorTotal + openCourierCash + openCourierPos)}
          </div>
          <div className="text-[11px] text-[#6E5148] truncate">
            {openDoorTotal + openCourierCash + openCourierPos === 0
              ? "Açık tahsilat veya zimmet yok"
              : [
                  openCourierCash > 0 ? `Kurye nakit ${tl(openCourierCash)}` : null,
                  openCourierPos > 0 ? `Kurye POS ${tl(openCourierPos)}` : null,
                  s.collectCash > 0 ? `Kapı nakit ${tl(s.collectCash)}` : null,
                  s.collectPos > 0 ? `Kapı POS ${tl(s.collectPos)}` : null,
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

function CourierDispatchCard({ date, orders }: { date: string; orders: AdminOrder[] }) {
  const { activeCouriers } = useCouriers();

  const stats = useMemo(() => {
    const dayOrders = orders.filter((o) => o.deliveryDate === date && o.status !== "iptal");
    let assigned = 0;
    let benchCourierWaiting = 0;
    let benchPickupWaiting = 0;
    let delivered = 0;

    for (const o of dayOrders) {
      if (o.status === "teslim_edildi") {
        delivered += 1;
        continue;
      }
      if (o.deliveryMethod === "pickup") {
        benchPickupWaiting += 1;
      } else if (o.courierId) {
        assigned += 1;
      } else {
        benchCourierWaiting += 1;
      }
    }

    const onShiftCount = activeCouriers.filter((c) => c.isOnShift).length;

    return {
      assigned,
      benchTotal: benchCourierWaiting + benchPickupWaiting,
      benchCourierWaiting,
      benchPickupWaiting,
      delivered,
      activeCourierCount: activeCouriers.length,
      onShiftCount,
    };
  }, [orders, date, activeCouriers]);

  return (
    <section className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2D3BD] pb-3.5">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#8E3D1B] flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" aria-hidden="true" /> Kurye & Dağıtım Durumu (Bugün)
          </div>
          <p className="text-xs text-[#6E5148] mt-0.5">
            Aktif kurye:{" "}
            <span className="font-mono tabular-nums font-semibold text-[#3B1E1A]">{stats.activeCourierCount}</span> ·
            Vardiyada:{" "}
            <span className="font-mono tabular-nums font-semibold text-[#1D5130]">{stats.onShiftCount}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/ekip"
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1.5 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-[#8E3D1B]" aria-hidden="true" />
            Ekip & Kurye
          </Link>
          <Link
            href="/kurye"
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B4532A] hover:bg-[#9D4622] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <Truck className="w-3.5 h-3.5" aria-hidden="true" />
            Kurye Konsolu
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#FBF6EC] border border-[#C5D5E4] space-y-1">
          <div className="text-xs text-[#6E5148]">Atanmış</div>
          <div className="text-2xl font-black font-mono tabular-nums text-[#24476B]">{stats.assigned}</div>
          <div className="text-[11px] text-[#6E5148]">Kuryeye zimmetli aktif sipariş</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FBF6EC] border border-[#E8C587] space-y-1">
          <div className="text-xs text-[#6E5148]">Tezgahta Bekleyen</div>
          <div className="text-2xl font-black font-mono tabular-nums text-[#7A4A0B]">{stats.benchTotal}</div>
          <div className="text-[11px] text-[#6E5148]">
            {stats.benchCourierWaiting} atama bekliyor · {stats.benchPickupWaiting} gel-al
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FBF6EC] border border-[#B4D3BC] space-y-1">
          <div className="text-xs text-[#6E5148] flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5 text-[#1D5130]" aria-hidden="true" /> Teslim Edildi
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-[#1D5130]">{stats.delivered}</div>
          <div className="text-[11px] text-[#6E5148]">Bugün tamamlanan teslimat</div>
        </div>
      </div>
    </section>
  );
}

function DeliveryCard({
  title,
  date,
  s,
  canViewFinance,
  href,
}: {
  title: string;
  date: string;
  s: DaySummary;
  canViewFinance: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-[#FFFFFF] border border-[#E2D3BD] hover:border-[#B4532A]/60 rounded-3xl p-5 space-y-3 transition-colors shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-serif font-bold text-[#3B1E1A] flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#B4532A]" aria-hidden="true" /> {title}
        </h3>
        <span className="text-xs text-[#6E5148] font-mono tabular-nums">{formatTrDate(date)}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black font-mono tabular-nums text-[#3B1E1A]">{s.toDeliver}</span>
        <span className="text-xs text-[#6E5148]">
          teslim edilecek{s.delivered > 0 ? ` · ${s.delivered} teslim edildi` : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] font-medium">
          <Truck className="w-3.5 h-3.5 text-[#8E3D1B]" aria-hidden="true" />
          Kurye: <strong className="font-mono tabular-nums text-[#3B1E1A]">{s.courierToDeliver}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] font-medium">
          <Store className="w-3.5 h-3.5 text-[#6E5148]" aria-hidden="true" />
          Gel-Al: <strong className="font-mono tabular-nums text-[#3B1E1A]">{s.pickupToDeliver}</strong>
        </span>
      </div>

      {s.unconfirmed > 0 && (
        <div className="text-xs font-medium text-[#7A4A0B]">{s.unconfirmed} tanesi onay bekliyor</div>
      )}

      {canViewFinance &&
        (s.collectCash > 0 || s.collectPos > 0 || s.collectTransfer > 0 || s.onAccount > 0) && (
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E2D3BD]">
            {s.collectCash > 0 && (
              <div className="text-[#6E5148]">
                Nakit: <strong className="text-[#3B1E1A] font-mono tabular-nums">{tl(s.collectCash)}</strong>
              </div>
            )}
            {s.collectPos > 0 && (
              <div className="text-[#6E5148]">
                POS: <strong className="text-[#3B1E1A] font-mono tabular-nums">{tl(s.collectPos)}</strong>
              </div>
            )}
            {s.collectTransfer > 0 && (
              <div className="text-[#6E5148]">
                Havale: <strong className="text-[#3B1E1A] font-mono tabular-nums">{tl(s.collectTransfer)}</strong>
              </div>
            )}
            {s.onAccount > 0 && (
              <div className="text-[#6E5148]">
                Cariye: <strong className="text-[#8E3D1B] font-mono tabular-nums">{tl(s.onAccount)}</strong>
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
      className="block bg-[#FFFFFF] border border-[#E2D3BD] hover:border-[#B4532A]/60 rounded-3xl p-5 space-y-3 transition-colors shadow-sm"
    >
      <h3 className="font-serif font-bold text-[#3B1E1A] flex items-center gap-2">
        <Flame className="w-4 h-4 text-[#B4532A]" aria-hidden="true" /> {title}
      </h3>
      {!p ? (
        <div className="text-xs text-[#6E5148]">Yükleniyor…</div>
      ) : breads.length === 0 && extras.length === 0 ? (
        <div className="text-xs text-[#6E5148]">
          Sipariş yok
          {p.unbookedWholesaleLoaves > 0 ? ` · kalan toptan rezerv ${p.unbookedWholesaleLoaves} ekmek` : ""}
        </div>
      ) : (
        <div className="space-y-1.5 text-sm">
          <div className="flex flex-wrap gap-1.5 text-[11px] text-[#6E5148] pb-1 border-b border-[#E2D3BD]">
            <span>
              Perakende: <strong className="font-mono tabular-nums text-[#3B1E1A]">{p.retailLoaves}</strong>
            </span>
            <span>·</span>
            <span>
              Planlı B2B: <strong className="font-mono tabular-nums text-[#3B1E1A]">{p.b2bOrderLoaves}</strong>
            </span>
            <span>·</span>
            <span>
              Rezerv: <strong className="font-mono tabular-nums text-[#3B1E1A]">{p.unbookedWholesaleLoaves}</strong>
            </span>
          </div>
          {breads.map((l) => (
            <div key={l.productId} className="flex justify-between gap-2 text-[#3B1E1A]">
              <span>{l.name}</span>
              <span className="font-mono tabular-nums font-bold text-[#8E3D1B]">{l.quantity}</span>
            </div>
          ))}
          {p.unbookedWholesaleLoaves > 0 && (
            <div className="flex justify-between gap-2 text-[#6E5148] text-xs pt-1.5 border-t border-[#E2D3BD]">
              <span>+ Kalan Toptan Rezerv</span>
              <span className="font-mono tabular-nums font-semibold text-[#3B1E1A]">
                {p.unbookedWholesaleLoaves}
              </span>
            </div>
          )}
          {extras.length > 0 && (
            <div className="text-xs text-[#6E5148] pt-1">
              Paketlenecek: {extras.map((l) => `${l.quantity}× ${l.name}`).join(", ")}
            </div>
          )}
        </div>
      )}
      {limit !== null && (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-[#6E5148]">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" aria-hidden="true" /> Kapasite
            </span>
            <span className="font-mono tabular-nums font-semibold text-[#3B1E1A]">
              {used} / {limit}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#F6EEDF] border border-[#E2D3BD] overflow-hidden">
            <div
              className={`h-full transition-all ${pct >= 90 ? "bg-[#B4532A]" : "bg-[#1D5130]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

/** "Bugün" paneli: rol bazlı Z-mutabakatı, kurye dağıtım özeti, toplu/tekil sipariş onayı ve fırın planı. */
export default function TodayPage() {
  const { adminUser } = useAdminAuth();
  const role = adminUser?.role;
  const canViewFinance = hasCapability(role, "dashboard.finance");
  const canDispatchCourier = hasCapability(role, "courier.dispatch");
  const canReadCari = hasCapability(role, "cari.read");
  const canManageTeam = hasCapability(role, "team.manage");
  const canManageOrders = hasCapability(role, "orders.ops");

  const { allOrders, loading, updateOrderStatus, refetch } = useAdminOrders();
  const today = useIstanbulToday();
  const tomorrow = addDays(today, 1);

  const [approvingIds, setApprovingIds] = useState<Set<string>>(() => new Set());
  const [approvingAll, setApprovingAll] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approveNotice, setApproveNotice] = useState<string | null>(null);

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
  const teamCash = useTeamCash(today, canViewFinance && canManageTeam);
  const cariRadar = useCariRadar(canReadCari);

  const pipeline = useMemo(() => {
    const todayActive = allOrders.filter(
      (o) => o.deliveryDate === today && o.status !== "iptal" && o.status !== "teslim_edildi"
    );
    const preparingCount = todayActive.filter((o) => o.status === "hazirlaniyor").length;
    const ovenCount = todayActive.filter((o) => o.status === "firinda").length;
    const unassignedCourierCount = todayActive.filter(
      (o) => o.deliveryMethod === "courier" && !o.courierId
    ).length;
    const pickupWaitingCount = todayActive.filter((o) => o.deliveryMethod === "pickup").length;
    return { preparingCount, ovenCount, unassignedCourierCount, pickupWaitingCount };
  }, [allOrders, today]);

  const handleApproveSingle = async (orderId: string) => {
    if (approvingIds.has(orderId) || approvingAll) return;
    setApproveError(null);
    setApproveNotice(null);
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
    setApproveNotice(null);
    setApprovingAll(true);

    try {
      const ids = pending.map((o) => o.id);
      let updatedTotal = 0;
      let skippedTotal = 0;
      const chunkErrors: string[] = [];

      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const res = await fetch("/api/admin/orders/bulk-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderIds: chunk, action: "approve" }),
        });

        const body = (await res.json().catch(() => ({}))) as BulkStatusResponse;
        if (!res.ok) {
          chunkErrors.push(body.error || `HTTP ${res.status}`);
        } else {
          updatedTotal += body.updatedCount ?? 0;
          skippedTotal += body.skippedCount ?? 0;
        }
      }

      await refetch();

      if (chunkErrors.length > 0) {
        setApproveError(`Toplu onay tamamlanamadı: ${chunkErrors.join(" · ")}`);
      } else if (skippedTotal > 0) {
        setApproveNotice(
          `${updatedTotal} sipariş onaylandı, ${skippedTotal} sipariş mevcut durumu nedeniyle atlandı.`
        );
      } else if (updatedTotal > 0) {
        setApproveNotice(`${updatedTotal} sipariş topluca onaylandı.`);
      }
    } catch {
      setApproveError("Toplu onay sırasında bağlantı hatası oluştu.");
    } finally {
      setApprovingAll(false);
    }
  };

  const actions = useMemo(() => {
    const list: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [];
    if (canManageOrders) {
      list.push({ label: "Sipariş ekle", href: "/admin/siparisler/yeni", icon: PlusCircle });
    }
    if (canDispatchCourier) {
      list.push({ label: "Teslimat", href: "/kurye", icon: Truck });
    } else {
      list.push({ label: "Siparişler", href: "/admin/siparisler", icon: PackageCheck });
    }
    if (canReadCari) {
      list.push({ label: "Fiş kes / tahsilat", href: "/admin/cariler", icon: Wallet });
    } else {
      list.push({ label: "Üretim planı", href: "/admin/uretim", icon: Gauge });
    }
    list.push({ label: "Fırından çıktı", href: "/admin/uretim#firindan-cikti", icon: Flame });
    return list;
  }, [canManageOrders, canDispatchCourier, canReadCari]);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3B1E1A]">Bugün</h1>
          <p className="text-xs text-[#6E5148] mt-0.5">{formatTrDate(today, "long")}</p>
        </div>
        {!canViewFinance && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-medium text-[#6E5148]">
            Operasyon Görünümü
          </span>
        )}
      </div>

      {/* 4 Duraklı Günlük Operasyon Akış Rayı (Pipeline) */}
      <section aria-label="Günlük Operasyon Akış Rayı" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* 1. Onay & Üretim */}
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 space-y-2 shadow-sm flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8E3D1B] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" aria-hidden="true" /> 1. Onay &amp; Üretim
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-[#3B1E1A]">{pending.length}</span>
              <span className="text-xs text-[#6E5148]">onay bekleyen</span>
            </div>
            <p className="text-[11px] text-[#6E5148]">
              {prodToday
                ? `Bugün fırın: ${prodToday.retailLoaves} perakende · ${prodToday.b2bOrderLoaves} B2B · ${prodToday.unbookedWholesaleLoaves} rezerv`
                : "Fırın yükü hesaplanıyor…"}
            </p>
          </div>
          <Link
            href="/admin/uretim"
            className="min-h-[44px] px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center justify-between transition-colors"
          >
            <span>Üretim Planına Git</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
          </Link>
        </div>

        {/* 2. Paket & Etiket */}
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 space-y-2 shadow-sm flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8E3D1B] flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5" aria-hidden="true" /> 2. Paket &amp; Etiket
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-[#3B1E1A]">
                {pipeline.preparingCount + pipeline.ovenCount}
              </span>
              <span className="text-xs text-[#6E5148]">bugün tezgahta/fırında</span>
            </div>
            <p className="text-[11px] text-[#6E5148]">
              {pipeline.preparingCount} hazırlanıyor · {pipeline.ovenCount} fırında/paket
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/siparisler"
              className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center justify-center transition-colors"
            >
              Siparişler
            </Link>
            <Link
              href="/admin/baski"
              className="min-h-[44px] px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
              <span>Etiket</span>
            </Link>
          </div>
        </div>

        {/* 3. Kurye Dağıtım */}
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 space-y-2 shadow-sm flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8E3D1B] flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" aria-hidden="true" /> 3. Kurye Dağıtım
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-[#3B1E1A]">
                {pipeline.unassignedCourierCount}
              </span>
              <span className="text-xs text-[#6E5148]">atanmamış kurye paketi</span>
            </div>
            <p className="text-[11px] text-[#6E5148]">
              Gel-Al (kuryesiz): <strong className="font-mono tabular-nums text-[#3B1E1A]">{pipeline.pickupWaitingCount}</strong>
            </p>
            {canManageTeam && teamCash && (
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                  teamCash.onShiftCouriers === 0
                    ? "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
                    : "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                }`}
              >
                {teamCash.onShiftCouriers === 0 ? (
                  <>
                    <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>Vardiyada kurye yok (0)</span>
                  </>
                ) : (
                  <span>{teamCash.onShiftCouriers} kurye vardiyada</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/siparisler"
              className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center justify-center transition-colors"
            >
              Rota Dağıtımı
            </Link>
            {canManageTeam && (
              <Link
                href="/admin/ekip"
                className="min-h-[44px] px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center justify-center transition-colors"
              >
                Ekip
              </Link>
            )}
          </div>
        </div>

        {/* 4. Kasa & Mutabakat — yalnız admin/superadmin */}
        {canViewFinance && (
          <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 space-y-2 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8E3D1B] flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" aria-hidden="true" /> 4. Kasa &amp; Mutabakat
              </div>
              {teamCash ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono tabular-nums text-[#1D5130]">
                      {tl(
                        Math.max(0, todaySum.collectedCash - teamCash.courierDeliveredCashTotal) +
                          teamCash.settledCash
                      )}
                    </span>
                    <span className="text-xs text-[#6E5148]">kasaya giren net</span>
                  </div>
                  <p className="text-[11px] text-[#7A4A0B] font-medium">
                    Kuryede açık zimmet:{" "}
                    <strong className="font-mono tabular-nums">
                      {tl(teamCash.openCourierCash)} nakit · {tl(teamCash.openCourierPos)} POS
                    </strong>
                  </p>
                </>
              ) : (
                <p className="text-xs text-[#6E5148]">Kasa ve kurye zimmeti yükleniyor…</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/ekip"
                className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center justify-between transition-colors"
              >
                <span>Kurye Mutabakatı</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
              </Link>
              <Link
                href="/admin/finans"
                className="min-h-[44px] px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center justify-center transition-colors"
              >
                Finans &amp; Gider
              </Link>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-[#FFFFFF] border border-[#E2D3BD] hover:border-[#B4532A] text-[#3B1E1A] text-xs font-bold min-h-[84px] shadow-sm active:scale-95 transition-all"
          >
            <a.icon className="w-6 h-6 text-[#B4532A]" aria-hidden="true" />
            {a.label}
          </Link>
        ))}
      </div>

      {/* Günlük Ciro & Kasa Mutabakatı Kartı (Z-Özeti) — sadece yetkili rollere */}
      {canViewFinance && <ZReconciliationCard date={today} s={todaySum} teamCash={teamCash} />}

      {/* B2B Tahsilat & Kredi Limiti Radarı — sadece cari.read yetkili rollere */}
      {canReadCari && (
        <section className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl overflow-hidden shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-[#E2D3BD] bg-[#FBF6EC]">
            <div>
              <h2 className="font-serif font-bold text-[#3B1E1A] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#B4532A]" aria-hidden="true" /> B2B Tahsilat &amp; Kredi Limiti Radarı
              </h2>
              <p className="text-xs text-[#6E5148] mt-0.5">
                Açık bakiye taşıyan müşteri carileri ve kredi limiti uyarıları
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A]">
                Açık Alacak:{" "}
                <strong className="font-mono tabular-nums text-[#8E3D1B]">
                  {tl(cariRadar.totalReceivable)}
                </strong>
              </span>
              <Link
                href="/admin/cariler"
                className="min-h-[40px] px-2.5 text-xs font-semibold text-[#3B1E1A] hover:text-[#8E3D1B] inline-flex items-center gap-1"
              >
                Cariler <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {cariRadar.overLimitAccounts.length > 0 && (
            <div
              role="status"
              className="px-4 py-2.5 bg-[#FCECE9] border-b border-[#E7B7AF] text-xs text-[#7D2114] flex items-center gap-2 font-medium"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                <strong>{cariRadar.overLimitAccounts.length}</strong> cari hesap kredi limitini aştı:{" "}
                {cariRadar.overLimitAccounts
                  .slice(0, 3)
                  .map((c) => c.businessName)
                  .join(", ")}
                {cariRadar.overLimitAccounts.length > 3 ? "…" : ""}
              </span>
            </div>
          )}

          {cariRadar.loading ? (
            <div className="p-6 text-center text-xs text-[#6E5148]">Cari bakiyeler yükleniyor…</div>
          ) : cariRadar.topDebtors.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#6E5148]">Açık bakiyeli B2B müşteri carisi yok.</div>
          ) : (
            <ul className="divide-y divide-[#E2D3BD]">
              {cariRadar.topDebtors.map((c) => {
                const isOverLimit =
                  typeof c.creditLimit === "number" && c.creditLimit > 0 && c.balance > c.creditLimit;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-4 hover:bg-[#FBF6EC]/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#3B1E1A] truncate">{c.businessName}</span>
                        {isOverLimit && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FCECE9] border border-[#E7B7AF] text-[#7D2114] text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Limit Aşıldı
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6E5148] truncate mt-0.5">
                        {c.contactPerson || c.neighborhood || "B2B Cari"}
                        {typeof c.creditLimit === "number" && c.creditLimit > 0
                          ? ` · Limit: ${tl(c.creditLimit)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-mono tabular-nums text-sm font-bold ${
                          isOverLimit ? "text-[#7D2114]" : "text-[#8E3D1B]"
                        }`}
                      >
                        {tl(c.balance)}
                      </span>
                      <Link
                        href={`/admin/cariler/${c.id}`}
                        className="min-h-[44px] px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] inline-flex items-center transition-colors"
                      >
                        Detay / Tahsilat
                      </Link>
                      <Link
                        href={`/admin/siparisler/yeni?cariId=${encodeURIComponent(c.id)}`}
                        className="min-h-[44px] px-3 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold inline-flex items-center transition-colors"
                      >
                        Sipariş Gir
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Kurye & Dağıtım Özeti — sadece kurye dağıtım yetkili rollere */}
      {canDispatchCourier && <CourierDispatchCard date={today} orders={allOrders} />}

      {/* Onay bekleyen siparişler */}
      <section className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-[#E2D3BD] bg-[#FBF6EC]">
          <h2 className="font-serif font-bold text-[#3B1E1A] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#B4532A]" aria-hidden="true" /> Onay bekleyen
            {pending.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#B4532A] text-white text-xs font-mono tabular-nums">
                {pending.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {pending.length > 0 && canManageOrders && (
              <button
                type="button"
                disabled={approvingAll || approvingIds.size > 0}
                onClick={() => void handleApproveAll()}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#B4532A] hover:bg-[#9D4622] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
              >
                {approvingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCheck className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{approvingAll ? "Onaylanıyor…" : `Tümünü Onayla (${pending.length})`}</span>
              </button>
            )}
            <Link
              href="/admin/siparisler"
              className="min-h-[40px] px-2.5 text-xs font-semibold text-[#3B1E1A] hover:text-[#8E3D1B] inline-flex items-center gap-1"
            >
              Tümü <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {approveError && (
          <div
            role="alert"
            className="px-4 py-2.5 bg-[#FCECE9] border-b border-[#E7B7AF] text-xs text-[#7D2114] flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{approveError}</span>
          </div>
        )}

        {approveNotice && (
          <div
            role="status"
            className="px-4 py-2.5 bg-[#E5EFE7] border-b border-[#B4D3BC] text-xs text-[#1D5130] flex items-center gap-2"
          >
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{approveNotice}</span>
          </div>
        )}

        {loading ? (
          <div className="p-6 text-center text-xs text-[#6E5148]">Yükleniyor…</div>
        ) : pending.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#6E5148]">Onay bekleyen sipariş yok.</div>
        ) : (
          <ul className="divide-y divide-[#E2D3BD]">
            {pending.slice(0, 8).map((o) => {
              const src = SOURCE_BADGE[o.source] ?? SOURCE_BADGE.web;
              const isBusy = approvingAll || approvingIds.has(o.id);
              return (
                <li key={o.id} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 hover:bg-[#FBF6EC]/70">
                  <Link href={`/admin/siparisler/${o.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#3B1E1A] truncate">{o.customerName}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold shrink-0 ${src.cls}`}
                        >
                          <src.icon className="w-3 h-3" aria-hidden="true" /> {src.label}
                        </span>
                      </div>
                      <div className="text-xs text-[#6E5148] truncate mt-0.5">
                        {relativeTrDate(o.deliveryDate)} · {o.deliveryMethod === "pickup" ? "Gel-Al" : o.neighborhood} ·{" "}
                        <span className="font-mono tabular-nums">
                          {o.items.reduce((n, it) => n + it.quantity, 0)}
                        </span>{" "}
                        ürün
                      </div>
                    </div>
                    {canViewFinance && (
                      <span className="font-mono tabular-nums text-sm font-bold text-[#3B1E1A] shrink-0">
                        {tl(o.totalAmount)}
                      </span>
                    )}
                  </Link>
                  {canManageOrders && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleApproveSingle(o.id)}
                      aria-label={`${o.customerName} siparişini onayla`}
                      className="min-h-[44px] px-3.5 rounded-xl bg-[#1D5130] hover:bg-[#163F25] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>Onayla</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!loading && pending.length > 8 && (
          <div className="p-3 bg-[#FBF6EC] border-t border-[#E2D3BD] text-center">
            <Link
              href="/admin/siparisler"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl text-xs font-bold text-[#8E3D1B] hover:bg-[#F3E2D4] transition-colors"
            >
              <span>+{pending.length - 8} bekleyen sipariş daha → Tümünü Gör</span>
            </Link>
          </div>
        )}
      </section>

      {/* Teslimat ve hazırlık özeti */}
      <div className="grid sm:grid-cols-2 gap-4">
        <DeliveryCard
          title="Bugünkü teslimat"
          date={today}
          s={todaySum}
          canViewFinance={canViewFinance}
          href={canDispatchCourier ? "/kurye" : "/admin/siparisler"}
        />
        <DeliveryCard
          title="Yarınki teslimat"
          date={tomorrow}
          s={tomorrowSum}
          canViewFinance={canViewFinance}
          href={canDispatchCourier ? "/kurye" : "/admin/siparisler"}
        />
      </div>

      {/* Fırın planı */}
      <div className="grid sm:grid-cols-2 gap-4">
        <BakeCard title="Bugünkü fırın" p={prodToday} />
        <BakeCard title="Yarınki fırın" p={prodTomorrow} />
      </div>
    </div>
  );
}
