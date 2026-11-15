"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Copy,
  History,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  Repeat,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { addDays, formatTrDate, istanbulWeekday } from "@/lib/time/istanbul";
import type { CariAccount, CariStandingOrder } from "@/types/admin";
import type { Courier } from "@/types/courier";
import type { Product } from "@/types";

export interface CariQuickOrderModalProps {
  open: boolean;
  onClose: () => void;
  account: CariAccount | null;
  products: Product[];
  couriers: Courier[];
  isAdmin: boolean;
  onOrderCreated?: (result: { orderId: string; orderNumber: string; accountId: string }) => void;
  onAccountUpdated?: (updated: CariAccount) => void;
  onSavedAndNext?: (currentAccountId: string) => void;
}

interface CustomLineDraft {
  id: string;
  productName: string;
  unitPriceInput: string;
  quantity: number;
}

interface LastOrderResponse {
  items?: Array<{
    productId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  sourceDate?: string | null;
  sourceKind?: "order" | "ledger" | null;
  error?: string;
}

const WEEKDAY_TABS: Array<{ key: string; shortLabel: string; longLabel: string }> = [
  { key: "1", shortLabel: "Pzt", longLabel: "Pazartesi" },
  { key: "2", shortLabel: "Sal", longLabel: "Salı" },
  { key: "3", shortLabel: "Çar", longLabel: "Çarşamba" },
  { key: "4", shortLabel: "Per", longLabel: "Perşembe" },
  { key: "5", shortLabel: "Cum", longLabel: "Cuma" },
  { key: "6", shortLabel: "Cmt", longLabel: "Cumartesi" },
  { key: "7", shortLabel: "Paz", longLabel: "Pazar" },
];

const WORKDAY_KEYS = ["1", "2", "3", "4", "5", "6"] as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toIsoWeekday(isoDate: string): string {
  const wd = istanbulWeekday(isoDate);
  return String(wd === 0 ? 7 : wd);
}

function buildInitialSchedule(standing?: CariStandingOrder): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const day of WEEKDAY_TABS) {
    const src = standing?.schedule?.[day.key] ?? {};
    const dayMap: Record<string, number> = {};
    for (const [pid, qty] of Object.entries(src)) {
      const n = Math.trunc(Number(qty));
      if (Number.isFinite(n) && n > 0) {
        dayMap[pid] = n;
      }
    }
    out[day.key] = dayMap;
  }
  return out;
}

export function CariQuickOrderModal({
  open,
  onClose,
  account,
  products,
  couriers,
  isAdmin,
  onOrderCreated,
  onAccountUpdated,
  onSavedAndNext,
}: CariQuickOrderModalProps) {
  const today = useIstanbulToday();
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const dayAfter = useMemo(() => addDays(today, 2), [today]);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<"order" | "standing">("order");

  // ── Sekme 1: Sipariş Planla state ──
  const [deliveryDate, setDeliveryDate] = useState<string>(tomorrow);
  const [courierId, setCourierId] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [adminPrices, setAdminPrices] = useState<Record<string, string>>({});
  const [customLines, setCustomLines] = useState<CustomLineDraft[]>([]);
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [courierNotes, setCourierNotes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const [loadingLastOrder, setLoadingLastOrder] = useState(false);
  const [quickMessage, setQuickMessage] = useState<{ tone: "info" | "success" | "warn"; text: string } | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // ── Sekme 2: Haftalık Sabit Rutin state ──
  const [routineEnabled, setRoutineEnabled] = useState(false);
  const [routineCourierId, setRoutineCourierId] = useState("");
  const [routineNotes, setRoutineNotes] = useState("");
  const [routineSchedule, setRoutineSchedule] = useState<Record<string, Record<string, number>>>(() =>
    buildInitialSchedule(undefined),
  );
  const [activeWeekday, setActiveWeekday] = useState<string>("1");
  const [routineSearch, setRoutineSearch] = useState("");
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [routineMessage, setRoutineMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Open / close native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Reset form state whenever modal opens or target cari switches
  useEffect(() => {
    if (!open || !account) return;
    setActiveTab("order");
    setDeliveryDate(tomorrow);
    setCourierId(account.defaultCourierId ?? "");
    setProductSearch("");
    setQuantities({});
    setAdminPrices({});
    setCustomLines([]);
    setShowAddressEditor(false);
    setDeliveryAddress(account.address ?? "");
    setOrderNotes("");
    setCourierNotes("");
    setIdempotencyKey(crypto.randomUUID());
    setQuickMessage(null);
    setError(null);

    setRoutineEnabled(Boolean(account.standingOrder?.enabled));
    setRoutineCourierId(account.defaultCourierId ?? "");
    setRoutineNotes(account.standingOrder?.notes ?? "");
    setRoutineSchedule(buildInitialSchedule(account.standingOrder));
    setActiveWeekday(toIsoWeekday(tomorrow));
    setRoutineSearch("");
    setRoutineMessage(null);
  }, [open, account, tomorrow]);

  const activeProducts = useMemo(() => {
    return products.filter((p) => p.isActive !== false);
  }, [products]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of activeProducts) {
      map.set(p.id, p);
    }
    return map;
  }, [activeProducts]);

  const sortedOrderProducts = useMemo(() => {
    const customPrices = account?.customPrices ?? {};
    const q = productSearch.trim().toLocaleLowerCase("tr-TR");
    const filtered = activeProducts.filter((p) => {
      if (!q) return true;
      return p.name.toLocaleLowerCase("tr-TR").includes(q) || (p.category ?? "").toLocaleLowerCase("tr-TR").includes(q);
    });
    return [...filtered].sort((a, b) => {
      const aHasCustom = customPrices[a.id] !== undefined ? 1 : 0;
      const bHasCustom = customPrices[b.id] !== undefined ? 1 : 0;
      if (aHasCustom !== bHasCustom) return bHasCustom - aHasCustom;
      return a.name.localeCompare(b.name, "tr-TR");
    });
  }, [activeProducts, productSearch, account?.customPrices]);

  const sortedRoutineProducts = useMemo(() => {
    const customPrices = account?.customPrices ?? {};
    const q = routineSearch.trim().toLocaleLowerCase("tr-TR");
    const filtered = activeProducts.filter((p) => {
      if (!q) return true;
      return p.name.toLocaleLowerCase("tr-TR").includes(q) || (p.category ?? "").toLocaleLowerCase("tr-TR").includes(q);
    });
    return [...filtered].sort((a, b) => {
      const aHasCustom = customPrices[a.id] !== undefined ? 1 : 0;
      const bHasCustom = customPrices[b.id] !== undefined ? 1 : 0;
      if (aHasCustom !== bHasCustom) return bHasCustom - aHasCustom;
      return a.name.localeCompare(b.name, "tr-TR");
    });
  }, [activeProducts, routineSearch, account?.customPrices]);

  const getProductBasePrice = (prod: Product): { basePrice: number; isCustom: boolean } => {
    const custom = account?.customPrices?.[prod.id];
    if (typeof custom === "number" && Number.isFinite(custom) && custom >= 0) {
      return { basePrice: round2(custom), isCustom: true };
    }
    return { basePrice: round2(Number(prod.price) || 0), isCustom: false };
  };

  const getProductUnitPrice = (prod: Product): number => {
    const { basePrice } = getProductBasePrice(prod);
    if (isAdmin && adminPrices[prod.id] !== undefined && adminPrices[prod.id].trim() !== "") {
      const parsed = Number(adminPrices[prod.id].replace(",", "."));
      if (Number.isFinite(parsed) && parsed >= 0) {
        return round2(parsed);
      }
    }
    return basePrice;
  };

  const orderTotals = useMemo(() => {
    let totalCount = 0;
    let totalAmount = 0;

    for (const prod of activeProducts) {
      const qty = quantities[prod.id] ?? 0;
      if (qty > 0) {
        const unitPrice = getProductUnitPrice(prod);
        totalCount += qty;
        totalAmount = round2(totalAmount + qty * unitPrice);
      }
    }

    for (const line of customLines) {
      if (line.quantity > 0 && line.productName.trim()) {
        const parsed = Number(line.unitPriceInput.replace(",", "."));
        const unitPrice = Number.isFinite(parsed) && parsed >= 0 ? round2(parsed) : 0;
        totalCount += line.quantity;
        totalAmount = round2(totalAmount + line.quantity * unitPrice);
      }
    }

    const creditLimit = round2(account?.creditLimit ?? 0);
    const currentBalance = round2(account?.balance ?? 0);
    const projectedBalance = round2(currentBalance + totalAmount);
    const exceedsCreditLimit = creditLimit > 0 && totalAmount > 0 && projectedBalance > creditLimit;

    return {
      totalCount,
      totalAmount,
      creditLimit,
      currentBalance,
      projectedBalance,
      exceedsCreditLimit,
    };
  }, [activeProducts, quantities, adminPrices, customLines, account, isAdmin]);

  const selectedDayWeekday = useMemo(() => toIsoWeekday(deliveryDate), [deliveryDate]);

  const standingForSelectedDay = useMemo(() => {
    if (!account?.standingOrder?.enabled) return null;
    const sched = account.standingOrder.schedule?.[selectedDayWeekday];
    if (!sched) return null;
    const entries = Object.entries(sched).filter(([, qty]) => Number(qty) > 0);
    if (entries.length === 0) return null;
    return {
      entries,
      totalQty: entries.reduce((sum, [, qty]) => sum + Math.trunc(qty), 0),
    };
  }, [account?.standingOrder, selectedDayWeekday]);

  const adjustOrderQty = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(10000, (prev[productId] ?? 0) + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const setExactOrderQty = (productId: string, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    const n = cleaned ? parseInt(cleaned, 10) : 0;
    setQuantities((prev) => {
      if (!Number.isFinite(n) || n <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: Math.min(10000, n) };
    });
  };

  const adjustRoutineQty = (dayKey: string, productId: string, delta: number) => {
    setRoutineSchedule((prev) => {
      const dayMap = { ...(prev[dayKey] ?? {}) };
      const next = Math.max(0, Math.min(10000, (dayMap[productId] ?? 0) + delta));
      if (next === 0) {
        delete dayMap[productId];
      } else {
        dayMap[productId] = next;
      }
      return { ...prev, [dayKey]: dayMap };
    });
  };

  const setExactRoutineQty = (dayKey: string, productId: string, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    const n = cleaned ? parseInt(cleaned, 10) : 0;
    setRoutineSchedule((prev) => {
      const dayMap = { ...(prev[dayKey] ?? {}) };
      if (!Number.isFinite(n) || n <= 0) {
        delete dayMap[productId];
      } else {
        dayMap[productId] = Math.min(10000, n);
      }
      return { ...prev, [dayKey]: dayMap };
    });
  };

  const handleLoadLastOrder = async () => {
    if (!account) return;
    setLoadingLastOrder(true);
    setError(null);
    setQuickMessage(null);

    try {
      const res = await fetch(`/api/admin/cari/accounts/${encodeURIComponent(account.id)}/last-order`);
      const data = (await res.json().catch(() => null)) as LastOrderResponse | null;
      if (!res.ok) {
        throw new Error(data?.error || "Son sipariş bilgisi alınamadı.");
      }
      const items = Array.isArray(data?.items) ? data.items : [];
      if (items.length === 0) {
        setQuickMessage({ tone: "warn", text: "Bu cari için daha önce kayıtlı sipariş veya fiş bulunamadı." });
        return;
      }

      const nextQty: Record<string, number> = {};
      const nextAdminPrices: Record<string, string> = {};
      const nextCustom: CustomLineDraft[] = [];

      items.forEach((it, idx) => {
        if (it.productId && productById.has(it.productId)) {
          nextQty[it.productId] = (nextQty[it.productId] ?? 0) + Math.trunc(it.quantity);
          if (isAdmin && Number.isFinite(it.unitPrice) && it.unitPrice >= 0) {
            nextAdminPrices[it.productId] = String(it.unitPrice);
          }
        } else {
          nextCustom.push({
            id: `hist-${Date.now()}-${idx}`,
            productName: it.name,
            unitPriceInput: String(it.unitPrice),
            quantity: Math.trunc(it.quantity),
          });
        }
      });

      setQuantities(nextQty);
      if (isAdmin) {
        setAdminPrices(nextAdminPrices);
      }
      setCustomLines(nextCustom);

      const sourceLabel = data?.sourceKind === "ledger" ? "Teslimat Fişi" : "Sipariş";
      const dateLabel = data?.sourceDate ? formatTrDate(data.sourceDate, "short") : "";
      setQuickMessage({
        tone: "success",
        text: `${dateLabel ? `${dateLabel} · ` : ""}${sourceLabel} kalemleri (${items.length} satır) dolduruldu.`,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Son sipariş doldurulamadı.");
    } finally {
      setLoadingLastOrder(false);
    }
  };

  const handleApplyRoutine = () => {
    if (!standingForSelectedDay) return;
    const nextQty: Record<string, number> = {};
    let loadedLines = 0;
    for (const [pid, qty] of standingForSelectedDay.entries) {
      if (productById.has(pid) && qty > 0) {
        nextQty[pid] = Math.trunc(qty);
        loadedLines += 1;
      }
    }
    setQuantities(nextQty);
    setCustomLines([]);
    if (account?.standingOrder?.notes && !orderNotes.trim()) {
      setOrderNotes(account.standingOrder.notes);
    }
    const wdLabel = WEEKDAY_TABS.find((d) => d.key === selectedDayWeekday)?.longLabel ?? "";
    setQuickMessage({
      tone: "info",
      text: `${wdLabel} sabit rutini uygulandı (${loadedLines} ürün).`,
    });
  };

  const submitOrder = async (andAdvanceNext: boolean) => {
    if (!account) return;

    const catalogItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice?: number;
      imageUrl?: string;
      weight?: number;
    }> = [];

    for (const prod of activeProducts) {
      const qty = quantities[prod.id] ?? 0;
      if (qty <= 0) continue;

      const { basePrice } = getProductBasePrice(prod);
      let overridePrice: number | undefined;
      if (isAdmin && adminPrices[prod.id] !== undefined && adminPrices[prod.id].trim() !== "") {
        const parsed = Number(adminPrices[prod.id].replace(",", "."));
        if (!Number.isFinite(parsed) || parsed < 0) {
          setError(`${prod.name} için geçerli bir birim fiyat girin.`);
          return;
        }
        const rounded = round2(parsed);
        if (rounded !== basePrice) {
          overridePrice = rounded;
        }
      }

      catalogItems.push({
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        ...(overridePrice !== undefined ? { unitPrice: overridePrice } : {}),
        ...(prod.imageUrl ? { imageUrl: prod.imageUrl } : {}),
        ...(typeof prod.weight === "number" && prod.weight > 0 ? { weight: prod.weight } : {}),
      });
    }

    const freeItems: Array<{
      productId: null;
      productName: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const line of customLines) {
      const name = line.productName.trim();
      if (!name && line.quantity <= 0) continue;
      if (!name) {
        setError("Serbest kalem satırında ürün adı boş bırakılamaz.");
        return;
      }
      if (line.quantity <= 0) {
        setError(`"${name}" kalemi için en az 1 adet girin.`);
        return;
      }
      const parsedPrice = Number(line.unitPriceInput.replace(",", "."));
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setError(`"${name}" kalemi için geçerli birim fiyat girin.`);
        return;
      }
      freeItems.push({
        productId: null,
        productName: name,
        quantity: line.quantity,
        unitPrice: round2(parsedPrice),
      });
    }

    const items = [...catalogItems, ...freeItems];
    if (items.length === 0) {
      setError("Siparişi kaydetmek için en az 1 ürün seçin.");
      return;
    }

    setSubmittingOrder(true);
    setError(null);

    try {
      const neighborhood = account.neighborhood?.trim() || "Cumhuriyet";
      const district = account.district?.trim() || "Beylikdüzü";
      const resolvedAddress = deliveryAddress.trim() || account.address?.trim() || `${neighborhood} — ${account.businessName}`;

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          customerName: account.businessName,
          phone: account.phone || "",
          deliveryAddress: resolvedAddress,
          district,
          neighborhood,
          deliveryMethod: "courier",
          deliveryDate,
          items,
          shippingFee: 0,
          paymentMethod: "cari",
          source: "admin",
          status: "hazirlaniyor",
          cariId: account.id,
          courierId: courierId || null,
          courierNotes: courierNotes.trim() || undefined,
          orderNotes: orderNotes.trim(),
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        id?: string;
        orderNumber?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.id) {
        throw new Error(data?.error || "Sipariş kaydedilemedi.");
      }

      onOrderCreated?.({
        orderId: data.id,
        orderNumber: data.orderNumber ?? data.id,
        accountId: account.id,
      });

      if (andAdvanceNext && onSavedAndNext) {
        onSavedAndNext(account.id);
      } else {
        dialogRef.current?.close();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sipariş kaydedilemedi.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleCopyDayToWorkdays = () => {
    const sourceDay = { ...(routineSchedule[activeWeekday] ?? {}) };
    setRoutineSchedule((prev) => {
      const next = { ...prev };
      for (const wd of WORKDAY_KEYS) {
        next[wd] = { ...sourceDay };
      }
      return next;
    });
    const label = WEEKDAY_TABS.find((d) => d.key === activeWeekday)?.longLabel ?? "";
    setRoutineMessage({
      tone: "success",
      text: `${label} listesi tüm iş günlerine (Pzt–Cmt) kopyalandı.`,
    });
  };

  const handleSaveRoutine = async () => {
    if (!account) return;
    setSavingRoutine(true);
    setRoutineMessage(null);
    setError(null);

    try {
      const cleanedSchedule: Record<string, Record<string, number>> = {};
      for (const [dayKey, prodMap] of Object.entries(routineSchedule)) {
        const cleanDay: Record<string, number> = {};
        for (const [pid, qty] of Object.entries(prodMap)) {
          const n = Math.trunc(qty);
          if (n > 0) cleanDay[pid] = n;
        }
        if (Object.keys(cleanDay).length > 0) {
          cleanedSchedule[dayKey] = cleanDay;
        }
      }

      const standingOrderPayload: CariStandingOrder = {
        enabled: routineEnabled,
        schedule: cleanedSchedule,
        ...(routineNotes.trim() ? { notes: routineNotes.trim() } : {}),
      };

      const res = await fetch(`/api/admin/cari/accounts/${encodeURIComponent(account.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCourierId: routineCourierId || null,
          standingOrder: standingOrderPayload,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        account?: CariAccount;
        error?: string;
      } | null;

      if (!res.ok || !data?.account) {
        throw new Error(data?.error || "Haftalık rutin kaydedilemedi.");
      }

      onAccountUpdated?.(data.account);
      setCourierId(data.account.defaultCourierId ?? "");
      setRoutineMessage({
        tone: "success",
        text: routineEnabled
          ? "Haftalık sabit rutin ve varsayılan kurye kaydedildi."
          : "Rutin ayarları güncellendi (otomatik üretim şu an pasif).",
      });
    } catch (err: unknown) {
      setRoutineMessage({
        tone: "error",
        text: err instanceof Error ? err.message : "Rutin kaydedilemedi.",
      });
    } finally {
      setSavingRoutine(false);
    }
  };

  const handleDialogPointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    if (submittingOrder || savingRoutine) return;
    if ("closedBy" in HTMLDialogElement.prototype) return;
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) {
      dialogRef.current?.close();
    }
  };

  if (!account) {
    return (
      <dialog
        ref={dialogRef}
        {...({ closedby: "any" } as Record<string, string>)}
        className="hidden"
      />
    );
  }

  const activeDayQtyMap = routineSchedule[activeWeekday] ?? {};

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as Record<string, string>)}
      onPointerDown={handleDialogPointerDown}
      onCancel={(e) => {
        if (submittingOrder || savingRoutine) {
          e.preventDefault();
          return;
        }
        onClose();
      }}
      aria-labelledby="cari-quick-order-title"
      className="m-auto mb-0 w-full max-w-3xl rounded-t-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 sm:mb-auto sm:rounded-2xl"
    >
      <div ref={contentRef} className="flex max-h-[92dvh] flex-col overflow-hidden">
        {/* Başlık */}
        <div className="flex items-start justify-between gap-3 border-b border-[#E2D3BD] bg-[#F6EEDF] px-4 py-3.5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
              10 Saniyelik Cari Sipariş Matrisi · {account.district ? `${account.district} / ` : ""}
              {account.neighborhood}
            </p>
            <h2 id="cari-quick-order-title" className="truncate font-serif text-lg font-bold text-[#3B1E1A] sm:text-xl">
              {account.businessName}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={submittingOrder || savingRoutine}
            aria-label="Modalı kapat"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] transition hover:bg-[#F6EEDF] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sekme Çubuğu */}
        <div className="grid grid-cols-2 gap-2 border-b border-[#E2D3BD] bg-white px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab("order");
              setError(null);
            }}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition sm:text-sm ${
              activeTab === "order"
                ? "border-[#B4532A] bg-[#B4532A] text-white"
                : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] hover:bg-[#F6EEDF]"
            }`}
          >
            <Package className="h-4 w-4 shrink-0" />
            <span>Sipariş Planla (Üretim &amp; Kurye)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("standing");
              setError(null);
            }}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition sm:text-sm ${
              activeTab === "standing"
                ? "border-[#B4532A] bg-[#B4532A] text-white"
                : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] hover:bg-[#F6EEDF]"
            }`}
          >
            <Repeat className="h-4 w-4 shrink-0" />
            <span>Haftalık Sabit Rutin</span>
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              <p>{error}</p>
            </div>
          )}

          {activeTab === "order" ? (
            <div className="space-y-4">
              {/* Teslim Tarihi ve Kurye */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2D3BD] bg-white p-3.5 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#6E5148]">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Teslim Tarihi
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Bugün", val: today },
                      { label: "Yarın", val: tomorrow },
                      { label: "+2 Gün", val: dayAfter },
                    ].map((chip) => {
                      const active = deliveryDate === chip.val;
                      return (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => setDeliveryDate(chip.val)}
                          className={`min-h-11 rounded-xl border px-3 text-xs font-bold transition ${
                            active
                              ? "border-[#B4532A] bg-[#B4532A] text-white"
                              : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] hover:bg-[#F6EEDF]"
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                    <label className="sr-only" htmlFor="quick-order-date">
                      Özel teslim tarihi
                    </label>
                    <input
                      id="quick-order-date"
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => {
                        if (e.target.value) setDeliveryDate(e.target.value);
                      }}
                      className="min-h-11 flex-1 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="quick-order-courier" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#6E5148]">
                    <Truck className="h-3.5 w-3.5" />
                    Dağıtım Kuryesi
                  </label>
                  <select
                    id="quick-order-courier"
                    value={courierId}
                    onChange={(e) => setCourierId(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base font-medium text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  >
                    <option value="">Tezgahta Beklesin (Kurye yok)</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName} {c.isOnShift ? "· Mesai Açık" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Üst Hızlı Çubuk */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-[#E2D3BD] bg-white p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadLastOrder}
                    disabled={loadingLastOrder}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#B4532A]/40 bg-[#FBF6EC] px-3.5 text-xs font-bold text-[#8E3D1B] transition hover:bg-[#F6EEDF] disabled:opacity-50"
                  >
                    {loadingLastOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
                    Son Siparişi Doldur
                  </button>

                  {standingForSelectedDay && (
                    <button
                      type="button"
                      onClick={handleApplyRoutine}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-700/30 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100"
                    >
                      <CalendarDays className="h-4 w-4" />
                      Rutini Uygula ({standingForSelectedDay.totalQty} ad)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAddressEditor((v) => !v)}
                    className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-xs font-semibold text-[#6E5148] hover:text-[#3B1E1A]"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {showAddressEditor ? "Adres / Notu Gizle" : "Adres / Not Düzenle"}
                  </button>
                </div>

                {quickMessage && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                      quickMessage.tone === "success"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : quickMessage.tone === "warn"
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-[#E2D3BD] bg-[#F6EEDF] text-[#3B1E1A]"
                    }`}
                  >
                    {quickMessage.text}
                  </div>
                )}

                {showAddressEditor && (
                  <div className="grid grid-cols-1 gap-2.5 border-t border-[#E2D3BD] pt-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="quick-order-address" className="mb-1 block text-xs font-bold text-[#6E5148]">
                        Teslimat Adresi (Boşsa mahalle + işletme adı kullanılır)
                      </label>
                      <input
                        id="quick-order-address"
                        type="text"
                        maxLength={500}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder={`${account.neighborhood || "Merkez"} — ${account.businessName}`}
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="quick-order-notes" className="mb-1 block text-xs font-bold text-[#6E5148]">
                        Sipariş / Üretim Notu
                      </label>
                      <input
                        id="quick-order-notes"
                        type="text"
                        maxLength={500}
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Dilimli / susamsız vb."
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="quick-courier-notes" className="mb-1 block text-xs font-bold text-[#6E5148]">
                        Kurye Teslimat Notu
                      </label>
                      <input
                        id="quick-courier-notes"
                        type="text"
                        maxLength={300}
                        value={courierNotes}
                        onChange={(e) => setCourierNotes(e.target.value)}
                        placeholder="Arka kapı / saat bilgisi"
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] sm:text-sm"
                      />
                    </div>
                  </div>
                )}

                <search className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E5148]" />
                  <label htmlFor="quick-order-product-search" className="sr-only">
                    Ürün ara
                  </label>
                  <input
                    id="quick-order-product-search"
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Toptan ürün ara..."
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] pl-9 pr-3 text-base text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </search>
              </div>

              {/* Toptan Ürün Matrisi */}
              <div className="space-y-2 rounded-xl border border-[#E2D3BD] bg-white p-3.5">
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {sortedOrderProducts.map((prod) => {
                    const { basePrice, isCustom } = getProductBasePrice(prod);
                    const qty = quantities[prod.id] ?? 0;
                    const priceInputVal =
                      adminPrices[prod.id] !== undefined ? adminPrices[prod.id] : String(basePrice);

                    return (
                      <div
                        key={prod.id}
                        className={`flex flex-col gap-2.5 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
                          qty > 0 ? "border-[#B4532A] bg-[#FBF6EC]" : "border-[#E2D3BD] bg-white"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-[#3B1E1A]">{prod.name}</span>
                            {isCustom && (
                              <span className="rounded-md bg-[#B4532A] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Özel Fiyat
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6E5148]">
                            {isAdmin ? (
                              <label className="inline-flex items-center gap-1">
                                <span className="sr-only">{prod.name} birim fiyat</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={priceInputVal}
                                  onChange={(e) =>
                                    setAdminPrices((prev) => ({
                                      ...prev,
                                      [prod.id]: e.target.value,
                                    }))
                                  }
                                  className="min-h-9 w-20 rounded-lg border border-[#E2D3BD] bg-[#FBF6EC] px-2 font-mono text-base font-semibold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-xs"
                                />
                                <span className="font-semibold text-[#3B1E1A]">₺</span>
                              </label>
                            ) : (
                              <span className="font-mono font-semibold tabular-nums text-[#3B1E1A]">
                                {formatMoney(basePrice)} ₺
                              </span>
                            )}
                            {isCustom && (
                              <span className="font-mono line-through opacity-75">
                                {formatMoney(Number(prod.price) || 0)} ₺
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => adjustOrderQty(prod.id, -1)}
                            disabled={qty === 0}
                            aria-label={`${prod.name} adet azalt`}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] disabled:opacity-35"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <label htmlFor={`quick-qty-${prod.id}`} className="sr-only">
                            {prod.name} adedi
                          </label>
                          <input
                            id={`quick-qty-${prod.id}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            enterKeyHint="next"
                            value={qty === 0 ? "" : String(qty)}
                            placeholder="0"
                            onChange={(e) => setExactOrderQty(prod.id, e.target.value)}
                            className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => adjustOrderQty(prod.id, 1)}
                            aria-label={`${prod.name} adet artır`}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#B4532A] text-white hover:bg-[#9C4421]"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustOrderQty(prod.id, 5)}
                            className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#F6EEDF] px-2.5 font-mono text-xs font-bold text-[#3B1E1A] hover:bg-[#E2D3BD]/60"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustOrderQty(prod.id, 10)}
                            className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#F6EEDF] px-2.5 font-mono text-xs font-bold text-[#3B1E1A] hover:bg-[#E2D3BD]/60"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Serbest Kalem Ekle */}
                <div className="border-t border-[#E2D3BD] pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#6E5148]">Serbest Kalemler</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomLines((prev) => [
                          ...prev,
                          { id: `free-${Date.now()}-${prev.length}`, productName: "", unitPriceInput: "", quantity: 1 },
                        ])
                      }
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#B4532A]/40 bg-[#FBF6EC] px-3 text-xs font-bold text-[#8E3D1B] hover:bg-[#F6EEDF]"
                    >
                      <Plus className="h-4 w-4" />
                      Serbest Kalem Ekle
                    </button>
                  </div>

                  {customLines.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      {customLines.map((line, idx) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-1 gap-2 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-2.5 sm:grid-cols-12 sm:items-center"
                        >
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              maxLength={160}
                              aria-label={`Serbest kalem adı #${idx + 1}`}
                              value={line.productName}
                              onChange={(e) =>
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id ? { ...row, productName: e.target.value } : row,
                                  ),
                                )
                              }
                              placeholder="Ürün veya kalem adı..."
                              className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] sm:text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-1 sm:col-span-3">
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Serbest kalem birim fiyatı #${idx + 1}`}
                              value={line.unitPriceInput}
                              onChange={(e) =>
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id ? { ...row, unitPriceInput: e.target.value } : row,
                                  ),
                                )
                              }
                              placeholder="Fiyat ₺"
                              className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-2.5 font-mono text-base font-semibold tabular-nums text-[#3B1E1A]"
                            />
                            <span className="text-xs font-bold text-[#6E5148]">₺</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 sm:col-span-4 sm:justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row,
                                  ),
                                )
                              }
                              aria-label="Serbest kalem azalt"
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A]"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              enterKeyHint="next"
                              aria-label={`Serbest kalem adedi #${idx + 1}`}
                              value={line.quantity === 0 ? "" : String(line.quantity)}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value.replace(/\D/g, ""), 10);
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id
                                      ? { ...row, quantity: Number.isFinite(parsed) && parsed > 0 ? Math.min(10000, parsed) : 0 }
                                      : row,
                                  ),
                                );
                              }}
                              className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id ? { ...row, quantity: Math.min(10000, row.quantity + 1) } : row,
                                  ),
                                )
                              }
                              aria-label="Serbest kalem artır"
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#B4532A] text-white"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomLines((prev) => prev.filter((row) => row.id !== line.id))}
                              aria-label={`Serbest kalemi sil #${idx + 1}`}
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {orderTotals.exceedsCreditLimit && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <p>
                    Bu sipariş teslim edildiğinde tahmini cari bakiye{" "}
                    <strong className="font-mono">{formatMoney(orderTotals.projectedBalance)} ₺</strong> ile tanımlı{" "}
                    <strong className="font-mono">{formatMoney(orderTotals.creditLimit)} ₺</strong> kredi limitini aşacak.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ── SEKME 2: HAFTALIK SABİT RUTİN ── */
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2D3BD] bg-white p-4 sm:grid-cols-2">
                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 py-2">
                  <div>
                    <span className="block text-sm font-bold text-[#3B1E1A]">Haftalık Rutin Aktif</span>
                    <span className="text-xs text-[#6E5148]">Otomatik üretimde bu cari dahil edilir</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={routineEnabled}
                    onChange={(e) => setRoutineEnabled(e.target.checked)}
                    className="h-5 w-5 accent-[#B4532A]"
                  />
                </label>

                <div>
                  <label htmlFor="routine-default-courier" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Varsayılan Dağıtım Kuryesi
                  </label>
                  <select
                    id="routine-default-courier"
                    value={routineCourierId}
                    onChange={(e) => setRoutineCourierId(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] sm:text-sm"
                  >
                    <option value="">Otomatik Atama Yok</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="routine-notes" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Sabit Rutin Notu (Opsiyonel)
                  </label>
                  <input
                    id="routine-notes"
                    type="text"
                    maxLength={500}
                    value={routineNotes}
                    onChange={(e) => setRoutineNotes(e.target.value)}
                    placeholder="Örn. Her sabah 07:30 arka mutfak girişine bırakılacak"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] sm:text-sm"
                  />
                </div>
              </div>

              {routineMessage && (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
                    routineMessage.tone === "success"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-red-300 bg-red-50 text-red-900"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{routineMessage.text}</span>
                </div>
              )}

              {/* Gün Sekmeleri */}
              <div className="rounded-xl border border-[#E2D3BD] bg-white p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_TABS.map((day) => {
                      const active = activeWeekday === day.key;
                      const dayTotal = Object.values(routineSchedule[day.key] ?? {}).reduce((s, q) => s + q, 0);
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => setActiveWeekday(day.key)}
                          className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
                            active
                              ? "border-[#B4532A] bg-[#B4532A] text-white"
                              : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] hover:bg-[#F6EEDF]"
                          }`}
                        >
                          <span>{day.shortLabel}</span>
                          {dayTotal > 0 && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                                active ? "bg-white/20 text-white" : "bg-[#E2D3BD]/70 text-[#3B1E1A]"
                              }`}
                            >
                              {dayTotal}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyDayToWorkdays}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#B4532A]/40 bg-[#FBF6EC] px-3 text-xs font-bold text-[#8E3D1B] hover:bg-[#F6EEDF]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Bu Günü Tüm İş Günlerine (Pzt–Cmt) Kopyala
                  </button>
                </div>

                <search className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E5148]" />
                  <label htmlFor="routine-product-search" className="sr-only">
                    Rutin ürünü ara
                  </label>
                  <input
                    id="routine-product-search"
                    type="search"
                    value={routineSearch}
                    onChange={(e) => setRoutineSearch(e.target.value)}
                    placeholder="Rutin ürünü ara..."
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] pl-9 pr-3 text-base text-[#3B1E1A] sm:text-sm"
                  />
                </search>

                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {sortedRoutineProducts.map((prod) => {
                    const { basePrice, isCustom } = getProductBasePrice(prod);
                    const qty = activeDayQtyMap[prod.id] ?? 0;
                    return (
                      <div
                        key={`rt-${prod.id}`}
                        className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
                          qty > 0 ? "border-[#B4532A] bg-[#FBF6EC]" : "border-[#E2D3BD] bg-white"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-[#3B1E1A]">{prod.name}</span>
                            {isCustom && (
                              <span className="rounded-md bg-[#B4532A] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                Özel Fiyat
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs tabular-nums text-[#6E5148]">
                            {formatMoney(basePrice)} ₺
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => adjustRoutineQty(activeWeekday, prod.id, -1)}
                            disabled={qty === 0}
                            aria-label={`${prod.name} rutin azalt`}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] disabled:opacity-35"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            enterKeyHint="next"
                            aria-label={`${prod.name} rutin adedi`}
                            value={qty === 0 ? "" : String(qty)}
                            placeholder="0"
                            onChange={(e) => setExactRoutineQty(activeWeekday, prod.id, e.target.value)}
                            className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A]"
                          />
                          <button
                            type="button"
                            onClick={() => adjustRoutineQty(activeWeekday, prod.id, 1)}
                            aria-label={`${prod.name} rutin artır`}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#B4532A] text-white"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustRoutineQty(activeWeekday, prod.id, 5)}
                            className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#F6EEDF] px-2.5 font-mono text-xs font-bold text-[#3B1E1A]"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustRoutineQty(activeWeekday, prod.id, 10)}
                            className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#F6EEDF] px-2.5 font-mono text-xs font-bold text-[#3B1E1A]"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alt Aksiyon Çubuğu */}
        <div className="border-t border-[#E2D3BD] bg-[#F6EEDF] px-4 py-3 sm:px-6">
          {activeTab === "order" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg border border-[#E2D3BD] bg-white px-2.5 py-1 font-mono font-bold tabular-nums text-[#3B1E1A]">
                  {orderTotals.totalCount} adet
                </span>
                <span className="font-mono text-base font-bold tabular-nums text-[#3B1E1A]">
                  Toplam: {formatMoney(orderTotals.totalAmount)} ₺
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => submitOrder(false)}
                  disabled={submittingOrder || orderTotals.totalCount === 0}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#B4532A] bg-white px-4 text-sm font-bold text-[#8E3D1B] transition hover:bg-[#FBF6EC] disabled:opacity-50"
                >
                  {submittingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Siparişi Kaydet
                </button>
                {onSavedAndNext && (
                  <button
                    type="button"
                    onClick={() => submitOrder(true)}
                    disabled={submittingOrder || orderTotals.totalCount === 0}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#B4532A] px-4 text-sm font-bold text-white transition hover:bg-[#9C4421] disabled:opacity-50"
                  >
                    {submittingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span>Kaydet &amp; Sonraki Cari</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[#6E5148]">
                {routineEnabled ? "Otomatik yarınki üretim listesine dahil" : "Şimdilik taslak / pasif"}
              </span>
              <button
                type="button"
                onClick={handleSaveRoutine}
                disabled={savingRoutine}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#B4532A] px-5 text-sm font-bold text-white transition hover:bg-[#9C4421] disabled:opacity-50"
              >
                {savingRoutine ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Haftalık Rutini Kaydet
              </button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
