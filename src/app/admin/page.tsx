"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Building2,
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
import { hasCapability } from "@/lib/security/capabilities";
import type { ProductionDay } from "@/types/production";
import type { AdminOrder, OrderSource } from "@/types/admin";

interface BulkStatusResponse {
  ok?: boolean;
  updatedCount?: number;
  updatedIds?: string[];
  skippedCount?: number;
  skipped?: { orderId: string; orderNumber: string | null; reason: string }[];
  error?: string;
}

const SOURCE_BADGE: Record<
  OrderSource,
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
    <section className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2D3BD] pb-3.5">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#8E3D1B] flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" aria-hidden="true" /> Günlük Ciro & Kasa Mutabakatı (Z-Özeti)
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
            <Banknote className="w-3.5 h-3.5 text-[#1D5130]" aria-hidden="true" /> Kasaya Giren Nakit
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-[#1D5130]">{tl(s.collectedCash)}</div>
          <div className="text-[11px] text-[#6E5148]">Tahsil edildi</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FBF6EC] border border-[#B4D3BC] space-y-1">
          <div className="text-xs text-[#6E5148] flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-[#1D5130]" aria-hidden="true" /> POS & Kart Tahsilatı
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-[#1D5130]">{tl(s.collectedPos)}</div>
          <div className="text-[11px] text-[#6E5148]">
            {s.collectedTransfer > 0 ? `+ ${tl(s.collectedTransfer)} havale ödendi` : "POS / Online ödendi"}
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
            <Clock className="w-3.5 h-3.5 text-[#7A4A0B]" aria-hidden="true" /> Kapıda Açık Tahsilat
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-[#7A4A0B]">{tl(openDoorTotal)}</div>
          <div className="text-[11px] text-[#6E5148] truncate">
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
          Sipariş yok{p.wholesaleLoaves > 0 ? ` · şarküterilere ${p.wholesaleLoaves} ekmek` : ""}
        </div>
      ) : (
        <div className="space-y-1.5 text-sm">
          {breads.map((l) => (
            <div key={l.productId} className="flex justify-between gap-2 text-[#3B1E1A]">
              <span>{l.name}</span>
              <span className="font-mono tabular-nums font-bold text-[#8E3D1B]">{l.quantity}</span>
            </div>
          ))}
          {p.wholesaleLoaves > 0 && (
            <div className="flex justify-between gap-2 text-[#6E5148] text-xs pt-1.5 border-t border-[#E2D3BD]">
              <span>+ Şarküterilere (günlük toptan)</span>
              <span className="font-mono tabular-nums font-semibold text-[#3B1E1A]">{p.wholesaleLoaves}</span>
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
      {canViewFinance && <ZReconciliationCard date={today} s={todaySum} />}

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
