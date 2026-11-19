"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Building2,
  CalendarDays,
  ChevronRight,
  Edit3,
  Flame,
  Loader2,
  MessageCircle,
  MoreVertical,
  Package,
  Phone,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  Tag,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCariler } from "@/hooks/useCariler";
import { useCouriers } from "@/hooks/useCouriers";
import { useProducts } from "@/hooks/useProducts";
import { hasCapability } from "@/lib/security/capabilities";
import { CariEditModal } from "@/components/admin/cariler/CariEditModal";
import B2BSlipModal from "@/components/admin/cariler/B2BSlipModal";
import B2BCollectionModal from "@/components/admin/cariler/B2BCollectionModal";
import { B2BHotSaleModal } from "@/components/admin/cariler/B2BHotSaleModal";
import { CariQuickOrderModal } from "@/components/admin/cariler/CariQuickOrderModal";
import { generateStandingOrdersClient } from "@/lib/cari/client";
import { ekstreMessage, shareViaWhatsApp } from "@/lib/cari/whatsapp";
import type { CariAccount } from "@/types/admin";

type BalanceFilter = "all" | "debtor" | "balanced" | "gider" | "archived";

function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CarilerPage() {
  const { adminUser } = useAdminAuth();
  const canReadCari = hasCapability(adminUser?.role, "cari.read");
  const {
    cariler,
    archivedCariler,
    loading,
    error,
    totalReceivable,
    totalCredit,
    refreshCariler,
  } = useCariler(canReadCari);
  const { products } = useProducts();
  const { assignableCouriers } = useCouriers();

  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [generatingRoutine, setGeneratingRoutine] = useState(false);
  const [routineSummary, setRoutineSummary] = useState<{
    deliveryDate: string;
    createdCount: number;
    skippedExisting: number;
    errors: Array<{ businessName: string; error: string }>;
  } | null>(null);

  // Modals
  const [editModalState, setEditModalState] = useState<{
    open: boolean;
    cari: CariAccount | null;
    isNew: boolean;
    initialTab: "info" | "prices";
  }>({ open: false, cari: null, isNew: true, initialTab: "info" });

  const [slipTarget, setSlipTarget] = useState<CariAccount | null>(null);
  const [collectionTarget, setCollectionTarget] = useState<CariAccount | null>(null);
  const [hotSaleState, setHotSaleState] = useState<{ open: boolean; accountId?: string; lock?: boolean }>({
    open: false,
  });
  const [quickOrderTarget, setQuickOrderTarget] = useState<CariAccount | null>(null);
  const [actionSheetCari, setActionSheetCari] = useState<CariAccount | null>(null);
  const actionDialogRef = useRef<HTMLDialogElement | null>(null);
  const actionContentRef = useRef<HTMLDivElement | null>(null);

  const enrichedActiveCariler = cariler;
  const enrichedArchivedCariler = archivedCariler;

  const b2bCustomerAccounts = useMemo(
    () => enrichedActiveCariler.filter((c) => c.accountType !== "gider"),
    [enrichedActiveCariler],
  );

  const filteredCariler = useMemo(() => {
    const source = balanceFilter === "archived" ? enrichedArchivedCariler : enrichedActiveCariler;
    const q = searchQuery.trim().toLocaleLowerCase("tr-TR");

    return source.filter((cari) => {
      const searchMatch =
        !q ||
        cari.businessName.toLocaleLowerCase("tr-TR").includes(q) ||
        (cari.companyTitle ?? "").toLocaleLowerCase("tr-TR").includes(q) ||
        cari.contactPerson.toLocaleLowerCase("tr-TR").includes(q) ||
        (cari.district ?? "").toLocaleLowerCase("tr-TR").includes(q) ||
        cari.neighborhood.toLocaleLowerCase("tr-TR").includes(q) ||
        cari.phone.includes(searchQuery.trim());

      if (!searchMatch) return false;
      if (balanceFilter === "archived") return true;
      if (balanceFilter === "debtor") return cari.balance > 0 && cari.accountType !== "gider";
      if (balanceFilter === "balanced") return cari.balance <= 0 && cari.accountType !== "gider";
      if (balanceFilter === "gider") return cari.accountType === "gider";
      return cari.accountType !== "gider";
    });
  }, [enrichedActiveCariler, enrichedArchivedCariler, searchQuery, balanceFilter]);

  const customerCount = enrichedActiveCariler.filter((c) => c.accountType !== "gider").length;
  const debtorCount = enrichedActiveCariler.filter((c) => c.balance > 0 && c.accountType !== "gider").length;
  const expenseCount = enrichedActiveCariler.filter((c) => c.accountType === "gider").length;

  useEffect(() => {
    if (!loading && balanceFilter === "gider" && expenseCount === 0) {
      setBalanceFilter("all");
    }
  }, [loading, balanceFilter, expenseCount]);

  // Action Sheet <dialog> sync
  useEffect(() => {
    const dialog = actionDialogRef.current;
    if (!dialog) return;
    if (actionSheetCari && !dialog.open) {
      dialog.showModal();
    } else if (!actionSheetCari && dialog.open) {
      dialog.close();
    }
  }, [actionSheetCari]);

  useEffect(() => {
    const dialog = actionDialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      dialog.returnValue = "";
      setActionSheetCari(null);
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  const handleRefreshAll = refreshCariler;

  const handleGenerateRoutineOrders = async () => {
    setGeneratingRoutine(true);
    setNotice(null);
    setRoutineSummary(null);

    try {
      const summary = await generateStandingOrdersClient();
      setRoutineSummary(summary);
    } catch (err: unknown) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Rutin siparişler oluşturulurken hata oluştu.",
      });
    } finally {
      setGeneratingRoutine(false);
    }
  };

  const handleActionDialogPointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    if ("closedBy" in HTMLDialogElement.prototype) return;
    const rect = actionContentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) {
      actionDialogRef.current?.close();
    }
  };

  const openNewCariModal = () => {
    setEditModalState({ open: true, cari: null, isNew: true, initialTab: "info" });
  };

  const openEditCariModal = (cari: CariAccount, initialTab: "info" | "prices" = "info") => {
    setActionSheetCari(null);
    setEditModalState({ open: true, cari, isNew: false, initialTab });
  };

  const filterTabs: Array<{ key: BalanceFilter; label: string }> = [
    { key: "all", label: `Müşteriler (${customerCount})` },
    { key: "debtor", label: `Alacaklı (${debtorCount})` },
    { key: "balanced", label: "Sıfır / Avans" },
    ...(expenseCount > 0
      ? [{ key: "gider" as const, label: `Gider / Tedarikçi (${expenseCount})` }]
      : []),
    { key: "archived", label: `Arşiv (${enrichedArchivedCariler.length})` },
  ];

  if (!canReadCari) {
    return (
      <div className="max-w-xl mx-auto my-12 rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-6 text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#FCECE9] border border-[#E7B7AF] text-[#7D2114] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-xl font-bold text-[#3B1E1A]">Cari Hesap Yetkisi Gerekli</h1>
        <p className="text-sm text-[#6E5148]">
          Kurumsal cari hesaplar ve ön muhasebe kayıtları yalnızca cari yetkisine sahip yönetici hesaplarına açıktır.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold transition-colors"
        >
          Yönetim Paneline Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#3B1E1A]">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#6E5148]">
            B2B Toptan &amp; Ön Muhasebe
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#3B1E1A] sm:text-3xl">
            Kurumsal Cari Hesaplar
          </h1>
          <p className="mt-1 text-sm text-[#6E5148]">
            Şarküteri, kafe ve restoran carileri · özel fiyat matrisi · kredi limiti · araçtan sıcak satış.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleGenerateRoutineOrders()}
            disabled={generatingRoutine || b2bCustomerAccounts.length === 0}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-bold text-[#3B1E1A] transition hover:bg-[#FBF6EC] disabled:opacity-50"
          >
            {generatingRoutine ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#B4532A]" />
            ) : (
              <CalendarDays className="h-4 w-4 text-[#B4532A]" />
            )}
            <span>Yarınki Rutin Siparişleri Oluştur</span>
          </button>
          <button
            type="button"
            onClick={() => setHotSaleState({ open: true, accountId: b2bCustomerAccounts[0]?.id, lock: false })}
            disabled={b2bCustomerAccounts.length === 0}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-[#B4532A] bg-[#FBF6EC] px-4 text-sm font-bold text-[#8E3D1B] transition hover:bg-[#E2D3BD]/40 disabled:opacity-50"
          >
            <Flame className="h-4 w-4 text-[#B4532A]" />
            Sıcak Satış &amp; İrsaliye
          </button>
          <button
            type="button"
            onClick={openNewCariModal}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[#B4532A] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#9C4421]"
          >
            <Plus className="h-4 w-4" />
            Yeni Cari Hesap
          </button>
        </div>
      </header>

      {routineSummary && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
        >
          <div className="space-y-1">
            <p className="font-bold">
              {routineSummary.deliveryDate} rutin üretimi tamamlandı:{" "}
              <span className="font-mono">{routineSummary.createdCount}</span> yeni sipariş oluşturuldu,{" "}
              <span className="font-mono">{routineSummary.skippedExisting}</span> cari zaten oluşturulmuştu.
            </p>
            {routineSummary.errors.length > 0 && (
              <p className="text-xs text-amber-900">
                Uyarılar: {routineSummary.errors.map((e) => `${e.businessName} (${e.error})`).join(" · ")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setRoutineSummary(null)}
            aria-label="Rutin bildirimini kapat"
            className="flex min-h-9 min-w-9 items-center justify-center rounded-lg hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {(notice || error) && (
        <div
          role="alert"
          aria-live="polite"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice?.tone === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <span>{notice?.text ?? error}</span>
          {notice && (
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Bildirimi kapat"
              className="flex min-h-9 min-w-9 items-center justify-center rounded-lg hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* KPI Strip */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E2D3BD] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6E5148]">Toplam Açık Alacak</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#8E3D1B]">
            {formatMoney(totalReceivable)} ₺
          </p>
          <p className="mt-1 text-xs text-[#6E5148]">{debtorCount} caride tahsil edilecek bakiye</p>
        </div>
        <div className="rounded-2xl border border-[#E2D3BD] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6E5148]">Müşteri Ön Ödeme / Avans</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-800">
            {formatMoney(Math.abs(totalCredit))} ₺
          </p>
          <p className="mt-1 text-xs text-[#6E5148]">Alacak bakiyesi taşıyan cariler</p>
        </div>
        <div className="rounded-2xl border border-[#E2D3BD] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6E5148]">Aktif B2B Portföyü</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#3B1E1A]">{customerCount} Kurum</p>
          <p className="mt-1 text-xs text-[#6E5148]">
            {expenseCount > 0 ? `${expenseCount} tedarikçi/gider · ` : ""}
            {enrichedArchivedCariler.length} arşiv
          </p>
        </div>
      </section>

      {/* Search & Filter Controls */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-4">
        <search className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E5148]" />
          <label htmlFor="cariler-search-input" className="sr-only">
            Cari ara
          </label>
          <input
            id="cariler-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İşletme, resmi unvan, ilçe, mahalle, yetkili veya telefon ara..."
            className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white pl-10 pr-4 text-base text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:border-[#B4532A] focus:outline-none sm:text-sm"
          />
        </search>

        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => {
            const active = balanceFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setBalanceFilter(tab.key)}
                className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition ${
                  active
                    ? "border-[#B4532A] bg-[#B4532A] text-white shadow-sm"
                    : "border-[#E2D3BD] bg-white text-[#3B1E1A] hover:bg-[#F6EEDF]"
                }`}
              >
                {tab.key === "archived" && <Archive className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Cari Grid / List */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#E2D3BD] bg-white py-16 text-sm text-[#6E5148]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#B4532A]" />
          Cari hesaplar yükleniyor...
        </div>
      ) : filteredCariler.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2D3BD] bg-white p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-[#6E5148]" />
          <p className="mt-3 font-serif text-lg font-bold text-[#3B1E1A]">
            {balanceFilter === "archived"
              ? "Arşivlenmiş cari hesap yok"
              : "Kriterlere uygun cari hesap bulunamadı"}
          </p>
          <p className="mt-1 text-sm text-[#6E5148]">
            Aramayı temizleyebilir veya yeni kurumsal cari kartı açabilirsiniz.
          </p>
          {balanceFilter !== "archived" && (
            <button
              type="button"
              onClick={openNewCariModal}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#B4532A] px-4 text-sm font-bold text-white transition hover:bg-[#9C4421]"
            >
              <Plus className="h-4 w-4" />
              Yeni Cari Oluştur
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCariler.map((cari) => {
            const isExpense = cari.accountType === "gider";
            const isArchived = Boolean(cari.archivedAt);
            const customPriceCount = Object.keys(cari.customPrices ?? {}).length;
            const creditLimit = cari.creditLimit ?? 0;
            const overLimit = creditLimit > 0 && cari.balance > creditLimit;

            return (
              <article
                key={cari.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E2D3BD] bg-white p-4 shadow-sm transition hover:border-[#B4532A]/60 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/cariler/${cari.id}`}
                        className="truncate font-serif text-lg font-bold text-[#3B1E1A] hover:underline"
                      >
                        {cari.businessName}
                      </Link>
                      {isExpense && (
                        <span className="rounded-md bg-[#F6EEDF] px-2 py-0.5 text-[11px] font-bold text-[#6E5148]">
                          Gider / Tedarikçi
                        </span>
                      )}
                      {isArchived && (
                        <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                          Arşivli
                        </span>
                      )}
                      {customPriceCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#E2D3BD] bg-[#FBF6EC] px-2 py-0.5 text-[11px] font-bold text-[#8E3D1B]">
                          <Tag className="h-3 w-3 text-[#B4532A]" />
                          {customPriceCount} Özel Fiyat
                        </span>
                      )}
                    </div>

                    {cari.companyTitle && (
                      <p className="mt-0.5 truncate text-xs font-medium text-[#6E5148]">{cari.companyTitle}</p>
                    )}

                    <p className="mt-1 text-xs text-[#6E5148]">
                      {(cari.district || "Beylikdüzü") + (cari.neighborhood ? ` · ${cari.neighborhood}` : "")}
                      {cari.contactPerson ? ` · ${cari.contactPerson}` : ""}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                      {isExpense ? "Bakiye" : cari.balance > 0 ? "Alacağımız" : cari.balance < 0 ? "Avans" : "Bakiye"}
                    </span>
                    <p
                      className={`font-mono text-xl font-bold tabular-nums ${
                        cari.balance > 0
                          ? "text-[#8E3D1B]"
                          : cari.balance < 0
                            ? "text-emerald-800"
                            : "text-[#3B1E1A]"
                      }`}
                    >
                      {formatMoney(cari.balance)} ₺
                    </p>
                    {creditLimit > 0 && (
                      <p
                        className={`mt-0.5 font-mono text-[11px] tabular-nums ${
                          overLimit ? "font-bold text-red-700" : "text-[#6E5148]"
                        }`}
                      >
                        Limit: {formatMoney(creditLimit)} ₺
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Actions Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2D3BD]/70 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/cariler/${cari.id}`}
                      className="flex min-h-11 items-center gap-1 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
                    >
                      <span>Ekstre &amp; Detay</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>

                    {!isArchived && !isExpense && (
                      <>
                        <button
                          type="button"
                          onClick={() => setQuickOrderTarget(cari)}
                          className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#B4532A] px-3 text-xs font-bold text-white transition hover:bg-[#9C4421]"
                        >
                          <Package className="h-3.5 w-3.5" />
                          <span>Sipariş Planla</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHotSaleState({ open: true, accountId: cari.id, lock: true })}
                          className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#B4532A]/40 bg-[#FBF6EC] px-3 text-xs font-bold text-[#8E3D1B] transition hover:bg-[#F6EEDF]"
                        >
                          <Zap className="h-3.5 w-3.5 text-[#B4532A]" />
                          <span>Sıcak Satış</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCollectionTarget(cari)}
                          className="flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          <span>Tahsilat</span>
                        </button>
                      </>
                    )}

                    {!isArchived && isExpense && (
                      <button
                        type="button"
                        onClick={() => setSlipTarget(cari)}
                        className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
                      >
                        <Receipt className="h-3.5 w-3.5 text-[#B4532A]" />
                        <span>Masraf / İşlem Ekle</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {cari.phone && (
                      <a
                        href={`tel:${cari.phone}`}
                        aria-label={`${cari.businessName} ara`}
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditCariModal(cari, "prices")}
                      aria-label={`${cari.businessName} özel fiyatlar`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
                    >
                      <Tag className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionSheetCari(cari)}
                      aria-label={`${cari.businessName} diğer işlemler`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Action Sheet <dialog> */}
      <dialog
        ref={actionDialogRef}
        {...({ closedby: "any" } as Record<string, string>)}
        onPointerDown={handleActionDialogPointerDown}
        aria-labelledby="cari-action-sheet-title"
        className="m-auto mb-0 w-full max-w-md rounded-t-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 sm:mb-auto sm:rounded-2xl"
      >
        {actionSheetCari && (
          <div ref={actionContentRef} className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2D3BD] pb-3">
              <div className="min-w-0">
                <h2 id="cari-action-sheet-title" className="truncate font-serif text-lg font-bold text-[#3B1E1A]">
                  {actionSheetCari.businessName}
                </h2>
                <p className="text-xs text-[#6E5148]">
                  Bakiye: <strong className="font-mono">{formatMoney(actionSheetCari.balance)} ₺</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => actionDialogRef.current?.close()}
                aria-label="Kapat"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {!actionSheetCari.archivedAt && actionSheetCari.accountType !== "gider" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const target = actionSheetCari;
                      actionDialogRef.current?.close();
                      setQuickOrderTarget(target);
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[#B4532A] px-4 text-sm font-bold text-white"
                  >
                    <Package className="h-4 w-4" />
                    Sipariş Planla &amp; Haftalık Rutin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = actionSheetCari;
                      actionDialogRef.current?.close();
                      setHotSaleState({ open: true, accountId: target.id, lock: true });
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#B4532A]/40 bg-white px-4 text-sm font-bold text-[#8E3D1B] hover:bg-[#F6EEDF]"
                  >
                    <Zap className="h-4 w-4 text-[#B4532A]" />
                    Sıcak Satış &amp; Sevk İrsaliyesi Kes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = actionSheetCari;
                      actionDialogRef.current?.close();
                      setCollectionTarget(target);
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-bold text-emerald-900 hover:bg-emerald-50"
                  >
                    <Wallet className="h-4 w-4 text-emerald-700" />
                    Tahsilat Al
                  </button>
                </>
              )}

              {!actionSheetCari.archivedAt && actionSheetCari.accountType === "gider" && (
                <button
                  type="button"
                  onClick={() => {
                    const target = actionSheetCari;
                    actionDialogRef.current?.close();
                    setSlipTarget(target);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-bold text-[#3B1E1A] hover:bg-[#F6EEDF]"
                >
                  <Receipt className="h-4 w-4 text-[#B4532A]" />
                  Masraf / İşlem Ekle
                </button>
              )}

              <button
                type="button"
                onClick={() => openEditCariModal(actionSheetCari, "info")}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-bold text-[#3B1E1A] hover:bg-[#F6EEDF]"
              >
                <Edit3 className="h-4 w-4 text-[#6E5148]" />
                Cari Bilgileri &amp; Kredi Limiti Düzenle
              </button>

              <button
                type="button"
                onClick={() => openEditCariModal(actionSheetCari, "prices")}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-bold text-[#3B1E1A] hover:bg-[#F6EEDF]"
              >
                <Tag className="h-4 w-4 text-[#B4532A]" />
                Özel Fiyat Matrisi ({Object.keys(actionSheetCari.customPrices ?? {}).length} ürün)
              </button>

              {actionSheetCari.phone && actionSheetCari.accountType !== "gider" && (
                <button
                  type="button"
                  onClick={() => {
                    const target = actionSheetCari;
                    actionDialogRef.current?.close();
                    void shareViaWhatsApp(
                      target.phone,
                      { accountId: target.id },
                      ekstreMessage(target.businessName, target.balance),
                    );
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-950 hover:bg-emerald-100"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-700" />
                  WhatsApp Canlı Ekstre Gönder
                </button>
              )}
            </div>
          </div>
        )}
      </dialog>

      {/* Modals */}
      {editModalState.open && (
        <CariEditModal
          cari={editModalState.cari}
          isNew={editModalState.isNew}
          initialTab={editModalState.initialTab}
          onClose={() => setEditModalState((prev) => ({ ...prev, open: false }))}
          onSuccess={() => {
            setNotice({
              tone: "success",
              text: editModalState.isNew ? "Yeni cari hesap oluşturuldu." : "Cari kartı güncellendi.",
            });
            void handleRefreshAll();
          }}
        />
      )}

      {slipTarget && (
        <B2BSlipModal
          cariId={slipTarget.id}
          cariName={slipTarget.businessName}
          customPrices={slipTarget.customPrices}
          onClose={() => setSlipTarget(null)}
          onSuccess={() => {
            void handleRefreshAll();
          }}
        />
      )}

      {collectionTarget && (
        <B2BCollectionModal
          cariId={collectionTarget.id}
          cariName={collectionTarget.businessName}
          onClose={() => setCollectionTarget(null)}
          onSuccess={() => {
            void handleRefreshAll();
          }}
        />
      )}

      <B2BHotSaleModal
        open={hotSaleState.open}
        onClose={() => setHotSaleState({ open: false })}
        accounts={b2bCustomerAccounts}
        products={products}
        initialAccountId={hotSaleState.accountId}
        lockAccount={Boolean(hotSaleState.lock)}
        isAdmin={true}
        onCompleted={() => {
          void handleRefreshAll();
        }}
      />

      <CariQuickOrderModal
        open={Boolean(quickOrderTarget)}
        onClose={() => setQuickOrderTarget(null)}
        account={quickOrderTarget}
        products={products}
        couriers={assignableCouriers}
        isAdmin={true}
        onOrderCreated={({ orderNumber }) => {
          setNotice({
            tone: "success",
            text: `${quickOrderTarget?.businessName ?? "Cari"} için sipariş oluşturuldu (${orderNumber}).`,
          });
        }}
        onAccountUpdated={() => {
          void handleRefreshAll();
        }}
        onSavedAndNext={(currentAccountId) => {
          const idx = b2bCustomerAccounts.findIndex((c) => c.id === currentAccountId);
          const next = idx >= 0 && idx + 1 < b2bCustomerAccounts.length ? b2bCustomerAccounts[idx + 1] : null;
          if (next) {
            setQuickOrderTarget(next);
          } else {
            setQuickOrderTarget(null);
            setNotice({
              tone: "success",
              text: "Listedeki tüm aktif müşteri carileri için sipariş girişi tamamlandı.",
            });
          }
        }}
      />
    </div>
  );
}
