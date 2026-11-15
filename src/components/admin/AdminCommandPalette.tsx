"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Flame,
  Loader2,
  PlusCircle,
  Printer,
  Search,
  Truck,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCouriers } from "@/hooks/useCouriers";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { useProducts } from "@/hooks/useProducts";
import { addDays, formatTrDate } from "@/lib/time/istanbul";
import { hasCapability } from "@/lib/security/capabilities";
import { getErrorMessage } from "@/lib/utils/error";
import { B2BHotSaleModal } from "@/components/admin/cariler/B2BHotSaleModal";
import { CariQuickOrderModal } from "@/components/admin/cariler/CariQuickOrderModal";
import type { B2BHotSaleResult, CariAccount } from "@/types/admin";

export interface AdminCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onActionCompleted?: () => void;
}

type PaletteView =
  | "actions"
  | "pick_cari_order"
  | "pick_hot_sale"
  | "confirm_standing";

interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  keywords: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

interface StandingGenerateResponse {
  createdCount?: number;
  skippedExisting?: number;
  deliveryDate?: string;
  error?: string;
}

function CommandPaletteCariModals({
  accounts,
  quickOrderTarget,
  hotSaleAccountId,
  hotSaleOpen,
  onCloseQuickOrder,
  onCloseHotSale,
  onCompletedNotice,
}: {
  accounts: CariAccount[];
  quickOrderTarget: CariAccount | null;
  hotSaleAccountId?: string;
  hotSaleOpen: boolean;
  onCloseQuickOrder: () => void;
  onCloseHotSale: () => void;
  onCompletedNotice: (text: string) => void;
}) {
  const { products } = useProducts();
  const { assignableCouriers } = useCouriers();

  const b2bCustomerAccounts = useMemo(
    () => accounts.filter((a) => !a.archivedAt && a.accountType !== "gider"),
    [accounts]
  );

  return (
    <>
      <CariQuickOrderModal
        open={Boolean(quickOrderTarget)}
        onClose={onCloseQuickOrder}
        account={quickOrderTarget}
        products={products}
        couriers={assignableCouriers}
        isAdmin={true}
        onOrderCreated={({ orderNumber }) => {
          onCompletedNotice(`Planlı cari sipariş (${orderNumber}) oluşturuldu.`);
        }}
      />
      <B2BHotSaleModal
        open={hotSaleOpen}
        onClose={onCloseHotSale}
        accounts={b2bCustomerAccounts}
        products={products}
        initialAccountId={hotSaleAccountId}
        lockAccount={Boolean(hotSaleAccountId)}
        isAdmin={true}
        onCompleted={(res: B2BHotSaleResult) => {
          onCompletedNotice(
            `${res.account.businessName} için ${res.saleTransaction.slipNumber} numaralı araç satışı işlendi.`
          );
        }}
      />
    </>
  );
}

/**
 * Evrensel ⚡ Hızlı İşlem (Cmd/Ctrl+K) Komut Paleti:
 * Native <dialog> + Light Enterprise Atölye Kremi. `staff` rolüne finans/cari aksiyonları gizlenir.
 */
export function AdminCommandPalette({
  open,
  onClose,
  onActionCompleted,
}: AdminCommandPaletteProps) {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const today = useIstanbulToday();
  const tomorrow = useMemo(() => addDays(today, 1), [today]);

  const role = adminUser?.role ?? null;
  const canCreateOrders = hasCapability(role, "orders.ops");
  const canReadOrders = hasCapability(role, "orders.read");
  const canReadCari = hasCapability(role, "cari.read");
  const canWriteCari = hasCapability(role, "cari.write");
  const canManageTeam = hasCapability(role, "team.manage");
  const canProduction = hasCapability(role, "production.ops");

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pointerDownTargetRef = useRef<EventTarget | null>(null);
  const titleId = useId();

  const [view, setView] = useState<PaletteView>("actions");
  const [query, setQuery] = useState("");
  const [cariList, setCariList] = useState<CariAccount[]>([]);
  const [cariLoading, setCariLoading] = useState(false);
  const [cariError, setCariError] = useState<string | null>(null);

  const [standingBusy, setStandingBusy] = useState(false);
  const [standingError, setStandingError] = useState<string | null>(null);
  const [standingResult, setStandingResult] = useState<string | null>(null);

  const [quickOrderTarget, setQuickOrderTarget] = useState<CariAccount | null>(null);
  const [hotSaleState, setHotSaleState] = useState<{ open: boolean; accountId?: string }>({
    open: false,
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadCariAccounts = useCallback(async () => {
    if (!canReadCari) return;
    setCariLoading(true);
    setCariError(null);
    try {
      const res = await fetch("/api/admin/cari/accounts", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        accounts?: CariAccount[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setCariList(Array.isArray(body.accounts) ? body.accounts : []);
    } catch (err: unknown) {
      setCariError(getErrorMessage(err) || "Cari listesi yüklenemedi.");
    } finally {
      setCariLoading(false);
    }
  }, [canReadCari]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      setView("actions");
      setQuery("");
      setStandingError(null);
      setStandingResult(null);
      setCariError(null);
      if (!dialog.open) {
        dialog.showModal();
      }
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleDialogClose = () => {
    const dialog = dialogRef.current;
    if (dialog) dialog.returnValue = "";
    onClose();
  };

  const navigateAndClose = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  const openCariPicker = useCallback(
    (targetView: "pick_cari_order" | "pick_hot_sale") => {
      if (!canReadCari) return;
      setView(targetView);
      setQuery("");
      if (cariList.length === 0) {
        void loadCariAccounts();
      }
      requestAnimationFrame(() => searchInputRef.current?.focus());
    },
    [canReadCari, cariList.length, loadCariAccounts]
  );

  const actions = useMemo<QuickActionItem[]>(() => {
    const items: QuickActionItem[] = [];
    if (canCreateOrders) {
      items.push({
        id: "new-retail",
        label: "Yeni Perakende Sipariş",
        description: "Telefon, WhatsApp veya dükkân siparişi gir",
        keywords: "yeni perakende siparis telefon whatsapp ekle",
        badge: "Sipariş",
        icon: PlusCircle,
        onSelect: () => navigateAndClose("/admin/siparisler/yeni"),
      });
    }
    if (canReadCari && canCreateOrders) {
      items.push({
        id: "planned-cari",
        label: "Planlı Cari Sipariş Gir",
        description: "Cari seçerek teslim tarihi ve sabit rutin planla",
        keywords: "planli cari b2b siparis sarkuteri restoran rutin",
        badge: "B2B",
        icon: Building2,
        onSelect: () => openCariPicker("pick_cari_order"),
      });
    }
    if (canReadCari && canWriteCari) {
      items.push({
        id: "hot-sale",
        label: "Araçtan Sıcak Satış (İrsaliye)",
        description: "Cari seçip anında teslimat, iade ve kapıda tahsilat kes",
        keywords: "aractan sicak satis irsaliye fis anlik teslimat",
        badge: "Sıcak Satış",
        icon: Zap,
        onSelect: () => openCariPicker("pick_hot_sale"),
      });
      items.push({
        id: "standing-generate",
        label: "Yarınki Rutin Siparişleri Oluştur",
        description: `${formatTrDate(tomorrow)} teslimatı için sabit cari rutinlerini üret`,
        keywords: "yarinki sabit rutin cari siparisleri olustur aktar",
        badge: "Rutin",
        icon: CalendarPlus,
        onSelect: () => {
          setView("confirm_standing");
          setStandingError(null);
          setStandingResult(null);
        },
      });
    }
    if (canReadOrders) {
      items.push({
        id: "courier-dispatch",
        label: "Kurye Dağıtım & Mahalle Kümeleri",
        description: "Günlük sipariş akışı, mahalle grupları ve kurye atama",
        keywords: "kurye dagitim mahalle kume siparisler rota",
        icon: Truck,
        onSelect: () => navigateAndClose("/admin/siparisler"),
      });
    }
    if (canManageTeam) {
      items.push({
        id: "team-reconcile",
        label: "Ekip, Kurye & Kasa Mutabakatı",
        description: "Kurye vardiyaları, açık zimmet ve günlük nakit/POS teslimi",
        keywords: "ekip kurye kasa mutabakat zimmet vardiya",
        icon: Users,
        onSelect: () => navigateAndClose("/admin/ekip"),
      });
    }
    if (canProduction) {
      items.push({
        id: "production",
        label: "Üretim & Hamurhane",
        description: "Perakende, B2B somun dökümü, hamur reçetesi ve fırından çıktı",
        keywords: "uretim hamurhane firin somun ekmek cikti",
        icon: Flame,
        onSelect: () => navigateAndClose("/admin/uretim"),
      });
      items.push({
        id: "print-labels",
        label: "Etiket Baskı Merkezi",
        description: "50×70mm termal raf, poşet ve üretim adedi etiketleri",
        keywords: "etiket baski termal qr yazdir",
        icon: Printer,
        onSelect: () => navigateAndClose("/admin/baski"),
      });
    }
    if (canReadCari) {
      items.push({
        id: "cari-list",
        label: "Cariler & Tahsilat",
        description: "B2B cari bakiyeleri, ekstreler ve ödeme kayıtları",
        keywords: "cari b2b tahsilat bakiye ekstre",
        icon: Wallet,
        onSelect: () => navigateAndClose("/admin/cariler"),
      });
    }
    return items;
  }, [
    canCreateOrders,
    canManageTeam,
    canProduction,
    canReadCari,
    canReadOrders,
    canWriteCari,
    navigateAndClose,
    openCariPicker,
    tomorrow,
  ]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLocaleLowerCase("tr-TR").includes(q) ||
        a.description.toLocaleLowerCase("tr-TR").includes(q) ||
        a.keywords.includes(q)
    );
  }, [actions, query]);

  const activeCustomers = useMemo(() => {
    const base = cariList.filter((a) => !a.archivedAt && a.accountType !== "gider");
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return base;
    return base.filter(
      (a) =>
        a.businessName.toLocaleLowerCase("tr-TR").includes(q) ||
        (a.contactPerson || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (a.neighborhood || "").toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [cariList, query]);

  const runStandingGenerate = async () => {
    if (!canWriteCari || standingBusy) return;
    setStandingBusy(true);
    setStandingError(null);
    setStandingResult(null);
    try {
      const res = await fetch("/api/admin/cari/standing-orders/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryDate: tomorrow }),
      });
      const body = (await res.json().catch(() => ({}))) as StandingGenerateResponse;
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      const created = body.createdCount ?? 0;
      const skipped = body.skippedExisting ?? 0;
      setStandingResult(
        `${formatTrDate(tomorrow)} için ${created} rutin cari siparişi oluşturuldu${
          skipped > 0 ? ` (${skipped} mevcut sipariş atlandı)` : ""
        }.`
      );
      onActionCompleted?.();
    } catch (err: unknown) {
      setStandingError(getErrorMessage(err) || "Rutin siparişler oluşturulamadı.");
    } finally {
      setStandingBusy(false);
    }
  };

  const handleSelectCari = (acc: CariAccount) => {
    if (view === "pick_cari_order") {
      onClose();
      setQuickOrderTarget(acc);
    } else if (view === "pick_hot_sale") {
      onClose();
      setHotSaleState({ open: true, accountId: acc.id });
    }
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={handleDialogClose}
        onPointerDown={(e) => {
          if ("closedBy" in HTMLDialogElement.prototype) return;
          pointerDownTargetRef.current = e.target;
        }}
        onClick={(e) => {
          if ("closedBy" in HTMLDialogElement.prototype) return;
          const dialog = dialogRef.current;
          if (e.target === dialog && pointerDownTargetRef.current === dialog) {
            dialog.close("dismiss");
          }
          pointerDownTargetRef.current = null;
        }}
        {...({ closedby: "any" } as Record<string, string>)}
        className="m-auto w-[calc(100%-1.5rem)] max-w-xl rounded-3xl border border-[#E2D3BD] bg-[#FFFFFF] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-xs"
      >
        <div className="flex flex-col max-h-[82vh]">
          {/* Üst Başlık */}
          <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 bg-[#FBF6EC] border-b border-[#E2D3BD]">
            <div className="flex items-center gap-2 min-w-0">
              {view !== "actions" && (
                <button
                  type="button"
                  onClick={() => {
                    setView("actions");
                    setQuery("");
                    requestAnimationFrame(() => searchInputRef.current?.focus());
                  }}
                  aria-label="İşlemlere dön"
                  className="min-w-11 min-h-11 rounded-xl bg-[#FFFFFF] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-[#3B1E1A] inline-flex items-center justify-center shrink-0 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <div className="min-w-0">
                <h2 id={titleId} className="font-serif text-base sm:text-lg font-bold text-[#3B1E1A] truncate">
                  {view === "actions"
                    ? "⚡ Hızlı İşlem"
                    : view === "pick_cari_order"
                      ? "Cari Seç — Planlı Sipariş"
                      : view === "pick_hot_sale"
                        ? "Cari Seç — Araçtan Sıcak Satış"
                        : "Yarınki Rutin Siparişleri Oluştur"}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close("cancel")}
              aria-label="Komut paletini kapat"
              className="min-w-11 min-h-11 rounded-xl bg-[#FFFFFF] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A] inline-flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Arama Çubuğu (<search>) */}
          {(view === "actions" || view === "pick_cari_order" || view === "pick_hot_sale") && (
            <div className="p-3 sm:p-4 border-b border-[#E2D3BD] bg-[#FFFFFF]">
              <search>
                <div className="relative flex items-center">
                  <Search
                    className="w-4 h-4 text-[#6E5148] absolute left-3.5 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label={view === "actions" ? "Hızlı işlem ara" : "Cari hesap ara"}
                    placeholder={
                      view === "actions"
                        ? "İşlem veya sayfa ara (ör. sıcak satış, rutin, kurye)…"
                        : "Cari adı, yetkili veya mahalle ara…"
                    }
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] text-base text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
                  />
                </div>
              </search>
            </div>
          )}

          {/* Gövde */}
          <div className="overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-2">
            {view === "actions" && (
              <>
                {filteredActions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#6E5148]">
                    Aramanızla eşleşen hızlı işlem bulunamadı.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {filteredActions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={item.onSelect}
                            className="w-full min-h-[56px] px-3.5 py-2.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#FBF6EC] border border-[#E2D3BD] hover:border-[#B4532A]/60 text-left flex items-center gap-3 transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-[#F6EEDF] border border-[#E2D3BD] text-[#B4532A] flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-[#3B1E1A]">{item.label}</span>
                                {item.badge && (
                                  <span className="px-2 py-0.5 rounded-md bg-[#F3E2D4] text-[#8E3D1B] text-[10px] font-bold">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#6E5148] truncate mt-0.5">{item.description}</p>
                            </div>
                            <ArrowRight
                              className="w-4 h-4 text-[#6E5148] group-hover:text-[#B4532A] shrink-0 transition-colors"
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {(view === "pick_cari_order" || view === "pick_hot_sale") && (
              <>
                {view === "pick_hot_sale" && !cariLoading && activeCustomers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setHotSaleState({ open: true, accountId: undefined });
                    }}
                    className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-[#F3E2D4]/70 hover:bg-[#F3E2D4] border border-[#DFB99F] text-[#8E3D1B] text-xs font-bold flex items-center justify-between gap-2 transition-colors"
                  >
                    <span>Sıcak Satış Modalında Cari Seç</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}

                {cariError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs text-[#7D2114] flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{cariError}</span>
                  </div>
                )}

                {cariLoading ? (
                  <div className="py-10 flex items-center justify-center gap-2 text-sm text-[#6E5148]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" />
                    <span>Cari hesaplar yükleniyor…</span>
                  </div>
                ) : activeCustomers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#6E5148]">Eşleşen aktif B2B cari hesap yok.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {activeCustomers.map((acc) => (
                      <li key={acc.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectCari(acc)}
                          className="flex-1 min-h-[52px] px-3.5 py-2.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#FBF6EC] border border-[#E2D3BD] hover:border-[#B4532A]/60 text-left flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[#3B1E1A] truncate">{acc.businessName}</div>
                            <div className="text-xs text-[#6E5148] truncate">
                              {acc.contactPerson || "Yetkili"} · {acc.neighborhood || "Mahalle"}
                            </div>
                          </div>
                          <span className="font-mono tabular-nums text-xs font-bold text-[#8E3D1B] shrink-0">
                            {acc.balance.toLocaleString("tr-TR")} ₺
                          </span>
                        </button>
                        {view === "pick_cari_order" && (
                          <button
                            type="button"
                            onClick={() =>
                              navigateAndClose(`/admin/siparisler/yeni?cariId=${encodeURIComponent(acc.id)}`)
                            }
                            aria-label={`${acc.businessName} için tam sipariş formunu aç`}
                            className="min-h-[52px] px-3 rounded-2xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] shrink-0 transition-colors"
                          >
                            Tam Form
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {view === "confirm_standing" && (
              <div className="p-2 space-y-4">
                <div className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] p-4 space-y-2">
                  <p className="text-sm font-semibold text-[#3B1E1A]">
                    {formatTrDate(tomorrow, "long")} teslimatı için tüm aktif sabit rutin cari siparişleri oluşturulsun mu?
                  </p>
                  <p className="text-xs text-[#6E5148] leading-relaxed">
                    Yarınki günün takviminde kayıtlı haftalık B2B rutinler kontrol edilir; aynı gün için zaten oluşturulmuş cari siparişleri tekrarlanmaz.
                  </p>
                </div>

                {standingError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs text-[#7D2114] flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{standingError}</span>
                  </div>
                )}

                {standingResult ? (
                  <div className="space-y-3">
                    <div
                      role="status"
                      className="p-3.5 rounded-xl bg-[#E5EFE7] border border-[#B4D3BC] text-xs font-semibold text-[#1D5130] flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{standingResult}</span>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigateAndClose("/admin/uretim")}
                        className="min-h-11 px-4 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] transition-colors"
                      >
                        Üretim Planına Git
                      </button>
                      <button
                        type="button"
                        onClick={() => dialogRef.current?.close("done")}
                        className="min-h-11 px-4 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold transition-colors"
                      >
                        Tamam
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setView("actions")}
                      disabled={standingBusy}
                      className="min-h-11 px-4 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] hover:bg-[#F3E2D4] text-sm font-semibold text-[#3B1E1A] transition-colors"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={() => void runStandingGenerate()}
                      disabled={standingBusy}
                      className="min-h-11 px-4 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {standingBusy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                      <span>Evet, Rutin Siparişleri Oluştur</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 bg-[#FBF6EC] border-t border-[#E2D3BD] flex items-center justify-between text-[11px] text-[#6E5148]">
            <span>Atölye Komut Paleti · Esc ile kapat</span>
            <span className="font-mono">⌘K / Ctrl+K</span>
          </div>
        </div>
      </dialog>

      {/* Sıfır sayfa yenilemeli cari modalları: yalnızca yetkili kullanıcı açtığında bağlanır */}
      {canReadCari && (quickOrderTarget !== null || hotSaleState.open) && (
        <CommandPaletteCariModals
          accounts={cariList}
          quickOrderTarget={quickOrderTarget}
          hotSaleAccountId={hotSaleState.accountId}
          hotSaleOpen={hotSaleState.open}
          onCloseQuickOrder={() => setQuickOrderTarget(null)}
          onCloseHotSale={() => setHotSaleState({ open: false })}
          onCompletedNotice={(text) => {
            setToastMsg(text);
            onActionCompleted?.();
          }}
        />
      )}

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-5 right-4 z-50 max-w-sm rounded-2xl bg-[#FFFFFF] border border-[#B4D3BC] shadow-lg px-4 py-3 flex items-center gap-2.5 text-xs font-semibold text-[#1D5130]"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            aria-label="Bildirimi kapat"
            className="min-w-11 min-h-11 rounded-lg hover:bg-[#E5EFE7] inline-flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
