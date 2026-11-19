"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  Store,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { submitB2BHotSaleClient } from "@/lib/cari/client";
import { formatTrDate } from "@/lib/time/istanbul";
import { CONTACT, whatsappLink } from "@/lib/site";
import type { B2BHotSalePaymentMethod, B2BHotSaleResult } from "@/types/admin";

export interface HotSaleAccountOption {
  id: string;
  businessName: string;
  companyTitle?: string;
  contactPerson?: string;
  phone: string;
  address: string;
  district?: string;
  neighborhood: string;
  taxNumber?: string;
  taxOffice?: string;
  balance: number;
  creditLimit?: number;
  customPrices?: Record<string, number>;
}

export interface HotSaleProductOption {
  id: string;
  name: string;
  price: number;
  category?: string;
  weight?: number | null;
  weightUnit?: string | null;
  unitLabel?: string | null;
  isAvailable?: boolean;
}

export interface B2BHotSaleModalProps {
  open: boolean;
  onClose: () => void;
  accounts: HotSaleAccountOption[];
  products: HotSaleProductOption[];
  initialAccountId?: string;
  lockAccount?: boolean;
  isAdmin?: boolean;
  delivererName?: string;
  onCompleted?: (result: B2BHotSaleResult) => void;
}

const PAYMENT_METHOD_CHOICES: Array<{ id: B2BHotSalePaymentMethod; label: string }> = [
  { id: "nakit", label: "Nakit" },
  { id: "kredi_karti", label: "Kart (POS)" },
  { id: "havale", label: "Havale / EFT" },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function B2BHotSaleModal({
  open,
  onClose,
  accounts,
  products,
  initialAccountId,
  lockAccount = false,
  isAdmin = false,
  delivererName,
  onCompleted,
}: B2BHotSaleModalProps) {
  const today = useIstanbulToday();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  const [accountSearch, setAccountSearch] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId ?? accounts[0]?.id ?? "");
  const [productSearch, setProductSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [customLines, setCustomLines] = useState<
    Array<{ id: string; customName: string; unitPriceInput: string; quantity: number }>
  >([]);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [showReturns, setShowReturns] = useState(false);

  const [collectedAmountInput, setCollectedAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<B2BHotSalePaymentMethod>("nakit");
  const [description, setDescription] = useState("");
  const [saleDate, setSaleDate] = useState(today);
  const [allowOverLimit, setAllowOverLimit] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<B2BHotSaleResult | null>(null);

  // Open/close native <dialog> via showModal()
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

  // Sync initial account & date when opening fresh
  useEffect(() => {
    if (!open) return;
    setSaleDate((prev) => prev || today);
    if (initialAccountId) {
      setSelectedAccountId(initialAccountId);
    } else if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [open, initialAccountId, accounts, selectedAccountId, today]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLocaleLowerCase("tr-TR");
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.businessName.toLocaleLowerCase("tr-TR").includes(q) ||
        (a.companyTitle ?? "").toLocaleLowerCase("tr-TR").includes(q) ||
        a.neighborhood.toLocaleLowerCase("tr-TR").includes(q) ||
        (a.district ?? "").toLocaleLowerCase("tr-TR").includes(q),
    );
  }, [accounts, accountSearch]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null,
    [accounts, selectedAccountId],
  );

  const sortedProducts = useMemo(() => {
    const customPrices = selectedAccount?.customPrices ?? {};
    const q = productSearch.trim().toLocaleLowerCase("tr-TR");
    const list = products.filter((p) => {
      if (p.price <= 0) return false;
      if (!q) return true;
      return p.name.toLocaleLowerCase("tr-TR").includes(q) || (p.category ?? "").toLocaleLowerCase("tr-TR").includes(q);
    });
    return [...list].sort((a, b) => {
      const aCustom = (customPrices[a.id] ?? 0) > 0 ? 1 : 0;
      const bCustom = (customPrices[b.id] ?? 0) > 0 ? 1 : 0;
      if (aCustom !== bCustom) return bCustom - aCustom;
      return a.name.localeCompare(b.name, "tr-TR");
    });
  }, [products, productSearch, selectedAccount?.customPrices]);

  const getEffectivePrice = (prod: HotSaleProductOption): { unitPrice: number; isCustom: boolean; isOverridden: boolean } => {
    const custom = selectedAccount?.customPrices?.[prod.id];
    const hasCustom = typeof custom === "number" && Number.isFinite(custom) && custom > 0;
    const basePrice = hasCustom ? round2(custom) : round2(prod.price);
    if (isAdmin && priceOverrides[prod.id] !== undefined && priceOverrides[prod.id].trim() !== "") {
      const parsed = Number(priceOverrides[prod.id].replace(",", "."));
      if (Number.isFinite(parsed) && parsed >= 0) {
        return { unitPrice: round2(parsed), isCustom: hasCustom, isOverridden: round2(parsed) !== basePrice };
      }
    }
    return { unitPrice: basePrice, isCustom: hasCustom, isOverridden: false };
  };

  const totals = useMemo(() => {
    let grossTotal = 0;
    let returnTotal = 0;
    let deliveredCount = 0;
    let returnCount = 0;

    for (const prod of products) {
      const qty = quantities[prod.id] ?? 0;
      const retQty = returnQuantities[prod.id] ?? 0;
      const custom = selectedAccount?.customPrices?.[prod.id];
      const basePrice =
        typeof custom === "number" && Number.isFinite(custom) && custom > 0 ? round2(custom) : round2(prod.price);
      let unitPrice = basePrice;
      if (isAdmin && priceOverrides[prod.id] !== undefined && priceOverrides[prod.id].trim() !== "") {
        const parsedOverride = Number(priceOverrides[prod.id].replace(",", "."));
        if (Number.isFinite(parsedOverride) && parsedOverride >= 0) {
          unitPrice = round2(parsedOverride);
        }
      }

      if (qty > 0) {
        grossTotal = round2(grossTotal + qty * unitPrice);
        deliveredCount += qty;
      }
      if (retQty > 0) {
        returnTotal = round2(returnTotal + retQty * unitPrice);
        returnCount += retQty;
      }
    }

    for (const line of customLines) {
      if (line.quantity > 0 && line.customName.trim()) {
        const parsed = Number(line.unitPriceInput.replace(",", "."));
        const price = Number.isFinite(parsed) && parsed >= 0 ? round2(parsed) : 0;
        grossTotal = round2(grossTotal + line.quantity * price);
        deliveredCount += line.quantity;
      }
    }

    const netAmount = round2(grossTotal - returnTotal);
    const parsedCollected = Number(collectedAmountInput.replace(",", "."));
    const collected = Number.isFinite(parsedCollected) && parsedCollected > 0 ? round2(parsedCollected) : 0;
    const currentBalance = round2(selectedAccount?.balance ?? 0);
    const creditLimit = round2(selectedAccount?.creditLimit ?? 0);
    const projectedBalance = round2(currentBalance + netAmount - collected);
    const remainingLimit = creditLimit > 0 ? round2(creditLimit - currentBalance) : null;
    const exceedsCreditLimit = creditLimit > 0 && projectedBalance > creditLimit;

    return {
      grossTotal,
      returnTotal,
      netAmount,
      collected,
      deliveredCount,
      returnCount,
      currentBalance,
      creditLimit,
      projectedBalance,
      remainingLimit,
      exceedsCreditLimit,
    };
  }, [products, quantities, priceOverrides, customLines, returnQuantities, selectedAccount, collectedAmountInput, isAdmin]);

  const resetForm = (keepAccount = true) => {
    setQuantities({});
    setPriceOverrides({});
    setCustomLines([]);
    setReturnQuantities({});
    setShowReturns(false);
    setCollectedAmountInput("");
    setPaymentMethod("nakit");
    setDescription("");
    setAllowOverLimit(false);
    setError(null);
    setResult(null);
    if (!keepAccount && accounts.length > 0) {
      setSelectedAccountId(initialAccountId ?? accounts[0].id);
    }
  };

  const adjustQty = (mapSetter: React.Dispatch<React.SetStateAction<Record<string, number>>>, productId: string, delta: number) => {
    mapSetter((prev) => {
      const next = Math.max(0, Math.min(10000, (prev[productId] ?? 0) + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const setExactQty = (mapSetter: React.Dispatch<React.SetStateAction<Record<string, number>>>, productId: string, raw: string) => {
    const n = parseInt(raw, 10);
    mapSetter((prev) => {
      if (!Number.isFinite(n) || n <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: Math.min(10000, n) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) {
      setError("Lütfen bir cari hesap seçin.");
      return;
    }

    const catalogItems = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const rawOverride = priceOverrides[productId];
        if (isAdmin && rawOverride !== undefined && rawOverride.trim() !== "") {
          const parsedOverride = Number(rawOverride.replace(",", "."));
          if (Number.isFinite(parsedOverride) && parsedOverride >= 0) {
            return { productId, quantity, unitPriceOverride: round2(parsedOverride) };
          }
        }
        return { productId, quantity };
      });

    const freeformItems: Array<{ productId: null; customName: string; unitPrice: number; quantity: number }> = [];
    for (const line of customLines) {
      const name = line.customName.trim();
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
        setError(`"${name}" kalemi için geçerli bir birim fiyat girin.`);
        return;
      }
      freeformItems.push({
        productId: null,
        customName: name,
        unitPrice: round2(parsedPrice),
        quantity: line.quantity,
      });
    }

    const items = [...catalogItems, ...freeformItems];

    if (items.length === 0) {
      setError("En az 1 teslimat ürünü veya serbest kalem seçmelisiniz.");
      return;
    }

    if (totals.netAmount <= 0) {
      setError("İade toplamı teslimat toplamını aşamaz; net fiş tutarı pozitif olmalıdır.");
      return;
    }

    if (totals.exceedsCreditLimit && !allowOverLimit) {
      setError(
        isAdmin
          ? "Cari kredi limiti aşılıyor. Tahsilat alın veya 'Kredi limit aşımına izin ver' onayını işaretleyin."
          : "Cari kredi limiti aşılıyor. Kapıda tahsilat alın veya yönetici onayı talep edin.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const returnItems = Object.entries(returnQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId, quantity }));

      const data = await submitB2BHotSaleClient({
        accountId: selectedAccount.id,
        items,
        returnItems,
        collectedAmount: totals.collected,
        paymentMethod: totals.collected > 0 ? paymentMethod : undefined,
        description: description.trim() || undefined,
        date: saleDate,
        allowOverLimit: isAdmin ? allowOverLimit : false,
      });

      setResult(data);
      onCompleted?.(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sıcak satış sırasında bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!receiptRef.current || !result) return;
    setDownloadingPng(true);
    setError(null);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${result.saleTransaction.slipNumber || "teslimat-fisi"}.png`;
      link.href = url;
      link.click();
    } catch {
      setError("Fiş görseli oluşturulurken bir hata oluştu. Lütfen yazdırmayı deneyin.");
    } finally {
      setDownloadingPng(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!result) return;
    const methodLabel =
      result.paymentMethod === "kredi_karti"
        ? "Kart (POS)"
        : result.paymentMethod === "havale"
          ? "Havale / EFT"
          : "Nakit";

    const lines = [
      `*EKMEKLAB — TESLİMAT FİŞİ (${result.saleTransaction.slipNumber})*`,
      `Cari: *${result.account.companyTitle || result.account.businessName}*`,
      `Tarih: ${formatTrDate(result.date)}`,
      ``,
      `Teslimat Tutarı: ${formatMoney(result.grossTotal)} ₺`,
      ...(result.returnTotal > 0 ? [`Bayat / Fire İade: -${formatMoney(result.returnTotal)} ₺`] : []),
      `Net Fiş Tutarı: *${formatMoney(result.netAmount)} ₺*`,
      ...(result.collectedAmount > 0
        ? [`Kapıda Tahsilat (${methodLabel}): -${formatMoney(result.collectedAmount)} ₺`]
        : []),
      `Güncel Kalan Bakiye: *${formatMoney(result.balanceAfter)} ₺*`,
      ``,
      `Dijital Fiş & Kalemler:`,
      result.signedSlipUrl,
    ];
    const message = lines.join("\n");
    const digits = result.account.phone.replace(/\D/g, "");
    const e164 = digits.startsWith("0") && digits.length === 11
      ? `9${digits}`
      : digits.length === 10
        ? `90${digits}`
        : digits;
    const targetUrl = e164 ? whatsappLink(message, e164) : whatsappLink(message);
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDialogPointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    // Only allow backdrop tap dismiss once receipt is completed (avoid losing unsaved hot-sale draft)
    if (!result || submitting) return;
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

  const handleCloseClick = () => {
    dialogRef.current?.close();
  };

  const paymentLabel = (m?: B2BHotSalePaymentMethod) =>
    PAYMENT_METHOD_CHOICES.find((c) => c.id === m)?.label ?? "Nakit";

  return (
    <dialog
      ref={dialogRef}
      closedby={result ? "any" : "closerequest"}
      onPointerDown={handleDialogPointerDown}
      onCancel={(e) => {
        if (submitting) {
          e.preventDefault();
          return;
        }
        onClose();
      }}
      aria-labelledby="hot-sale-modal-title"
      className="m-auto mb-0 w-full max-w-3xl rounded-t-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 sm:mb-auto sm:rounded-2xl print:static print:m-0 print:max-h-none print:w-full print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:bg-white print:shadow-none print:backdrop:hidden"
    >
      <div
        ref={contentRef}
        className="flex max-h-[92dvh] flex-col overflow-hidden print:max-h-none print:overflow-visible"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E2D3BD] bg-[#F6EEDF] px-4 py-3.5 sm:px-6 print:hidden">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
              B2B Araçtan Sıcak Satış &amp; Sevk İrsaliyesi
            </p>
            <h2 id="hot-sale-modal-title" className="truncate font-serif text-lg font-bold text-[#3B1E1A] sm:text-xl">
              {result ? `Fiş Kesildi · ${result.saleTransaction.slipNumber}` : "Sıcak Satış Fişi Kes"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCloseClick}
            disabled={submitting}
            aria-label="Modalı kapat"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] transition hover:bg-[#F6EEDF] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 print:hidden"
            >
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              <p className="leading-snug">{error}</p>
            </div>
          )}

          {!result ? (
            <form id="b2b-hot-sale-form" onSubmit={handleSubmit} className="space-y-5 print:hidden">
              {/* 1. Cari Seçimi */}
              <section className="rounded-xl border border-[#E2D3BD] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-[#B4532A]" />
                    <h3 className="text-sm font-bold text-[#3B1E1A]">1. Kurumsal Cari Hesap</h3>
                  </div>
                  {selectedAccount && (
                    <span className="font-mono text-xs font-bold tabular-nums text-[#6E5148]">
                      Bakiye: {formatMoney(selectedAccount.balance)} ₺
                    </span>
                  )}
                </div>

                {!lockAccount && (
                  <div className="space-y-2.5">
                    <search className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E5148]" />
                      <label htmlFor="hot-sale-cari-search" className="sr-only">
                        Cari ara
                      </label>
                      <input
                        id="hot-sale-cari-search"
                        type="search"
                        value={accountSearch}
                        onChange={(e) => setAccountSearch(e.target.value)}
                        placeholder="İşletme, resmi unvan, ilçe veya mahalle ara..."
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] pl-9 pr-3 text-base text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:border-[#B4532A] focus:outline-none sm:text-sm"
                      />
                    </search>
                    <div>
                      <label htmlFor="hot-sale-account-select" className="sr-only">
                        Cari hesap seçin
                      </label>
                      <select
                        id="hot-sale-account-select"
                        value={selectedAccount?.id ?? ""}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base font-medium text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                      >
                        {filteredAccounts.length === 0 ? (
                          <option value="">Eşleşen cari bulunamadı</option>
                        ) : (
                          filteredAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.businessName} · {(acc.district ? `${acc.district} / ` : "") + acc.neighborhood} (
                              {formatMoney(acc.balance)} ₺)
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {selectedAccount && (
                  <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-3 text-xs sm:grid-cols-3">
                    <div>
                      <p className="font-bold text-[#3B1E1A]">
                        {selectedAccount.companyTitle || selectedAccount.businessName}
                      </p>
                      <p className="text-[#6E5148]">
                        {selectedAccount.district ? `${selectedAccount.district} · ` : ""}
                        {selectedAccount.neighborhood}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#6E5148]">Mevcut Borç:</span>
                      <p className="font-mono text-sm font-bold tabular-nums text-[#3B1E1A]">
                        {formatMoney(selectedAccount.balance)} ₺
                      </p>
                    </div>
                    <div>
                      <span className="text-[#6E5148]">Kredi Limiti:</span>
                      <p className="font-mono text-sm font-bold tabular-nums text-[#3B1E1A]">
                        {(selectedAccount.creditLimit ?? 0) > 0
                          ? `${formatMoney(selectedAccount.creditLimit ?? 0)} ₺ (Kalan: ${formatMoney(totals.remainingLimit ?? 0)} ₺)`
                          : "Limitsiz"}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* 2. Teslimat Ürünleri */}
              <section className="rounded-xl border border-[#E2D3BD] bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#3B1E1A]">2. Teslim Edilen Ürünler</h3>
                    <p className="text-xs text-[#6E5148]">
                      Carinin özel anlaşmalı fiyatları otomatik önceliklidir; son fiyat sunucuda doğrulanır.
                    </p>
                  </div>
                  <span className="rounded-lg bg-[#F6EEDF] px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-[#3B1E1A]">
                    {totals.deliveredCount} adet · {formatMoney(totals.grossTotal)} ₺
                  </span>
                </div>

                <search className="relative mb-3 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E5148]" />
                  <label htmlFor="hot-sale-product-search" className="sr-only">
                    Ürün ara
                  </label>
                  <input
                    id="hot-sale-product-search"
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Ürün ara..."
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] pl-9 pr-3 text-base text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </search>

                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {sortedProducts.map((prod) => {
                    const { unitPrice, isCustom, isOverridden } = getEffectivePrice(prod);
                    const qty = quantities[prod.id] ?? 0;
                    const priceInputVal =
                      priceOverrides[prod.id] !== undefined ? priceOverrides[prod.id] : String(unitPrice);
                    return (
                      <div
                        key={prod.id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${
                          qty > 0
                            ? "border-[#B4532A] bg-[#FBF6EC]"
                            : "border-[#E2D3BD] bg-white"
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
                            {isOverridden && (
                              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                Düzenlendi
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6E5148]">
                            {isAdmin ? (
                              <label className="inline-flex items-center gap-1">
                                <span className="sr-only">{prod.name} birim fiyatı</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={priceInputVal}
                                  onChange={(e) =>
                                    setPriceOverrides((prev) => ({
                                      ...prev,
                                      [prod.id]: e.target.value,
                                    }))
                                  }
                                  aria-label={`${prod.name} birim fiyatı (₺)`}
                                  className="min-h-9 w-20 rounded-lg border border-[#E2D3BD] bg-[#FBF6EC] px-2 font-mono text-base font-semibold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-xs"
                                />
                                <span className="font-semibold text-[#3B1E1A]">₺</span>
                              </label>
                            ) : (
                              <span className="font-mono font-semibold tabular-nums text-[#3B1E1A]">
                                {formatMoney(unitPrice)} ₺
                              </span>
                            )}
                            {isCustom && (
                              <span className="font-mono line-through opacity-75">{formatMoney(prod.price)} ₺</span>
                            )}
                            {prod.unitLabel && <span>· {prod.unitLabel}</span>}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => adjustQty(setQuantities, prod.id, -1)}
                            disabled={qty === 0}
                            aria-label={`${prod.name} adet azalt`}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] transition hover:bg-[#E2D3BD]/50 disabled:opacity-35"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <label htmlFor={`qty-${prod.id}`} className="sr-only">
                            {prod.name} adet
                          </label>
                          <input
                            id={`qty-${prod.id}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            enterKeyHint="next"
                            value={qty === 0 ? "" : String(qty)}
                            placeholder="0"
                            onChange={(e) => setExactQty(setQuantities, prod.id, e.target.value)}
                            className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => adjustQty(setQuantities, prod.id, 1)}
                            aria-label={`${prod.name} adet artır`}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#B4532A] text-white transition hover:bg-[#9C4421]"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Serbest Kalemler */}
                <div className="mt-4 border-t border-[#E2D3BD] pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#6E5148]">
                      Katalog Dışı / Serbest Kalemler
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomLines((prev) => [
                          ...prev,
                          {
                            id: `free-${Date.now()}-${prev.length}`,
                            customName: "",
                            unitPriceInput: "",
                            quantity: 1,
                          },
                        ])
                      }
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#B4532A]/40 bg-[#FBF6EC] px-3 text-xs font-bold text-[#8E3D1B] transition hover:bg-[#F6EEDF]"
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
                            <label htmlFor={`hot-free-name-${line.id}`} className="sr-only">
                              Serbest kalem adı #{idx + 1}
                            </label>
                            <input
                              id={`hot-free-name-${line.id}`}
                              type="text"
                              maxLength={120}
                              value={line.customName}
                              onChange={(e) =>
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id ? { ...row, customName: e.target.value } : row,
                                  ),
                                )
                              }
                              placeholder="Ürün veya kalem adı..."
                              className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:border-[#B4532A] focus:outline-none sm:text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 sm:col-span-3">
                            <label htmlFor={`hot-free-price-${line.id}`} className="sr-only">
                              Birim fiyat #{idx + 1}
                            </label>
                            <input
                              id={`hot-free-price-${line.id}`}
                              type="text"
                              inputMode="decimal"
                              value={line.unitPriceInput}
                              onChange={(e) =>
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id ? { ...row, unitPriceInput: e.target.value } : row,
                                  ),
                                )
                              }
                              placeholder="Fiyat ₺"
                              className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-2.5 font-mono text-base font-semibold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none"
                            />
                            <span className="text-xs font-bold text-[#6E5148]">₺</span>
                          </div>
                          <div className="flex items-center justify-between gap-1.5 sm:col-span-4 sm:justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id
                                      ? { ...row, quantity: Math.max(1, row.quantity - 1) }
                                      : row,
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
                              value={String(line.quantity)}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value, 10);
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id
                                      ? { ...row, quantity: Number.isFinite(parsed) && parsed > 0 ? Math.min(5000, parsed) : 0 }
                                      : row,
                                  ),
                                );
                              }}
                              className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setCustomLines((prev) =>
                                  prev.map((row) =>
                                    row.id === line.id
                                      ? { ...row, quantity: Math.min(5000, row.quantity + 1) }
                                      : row,
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
                              onClick={() =>
                                setCustomLines((prev) => prev.filter((row) => row.id !== line.id))
                              }
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
              </section>

              {/* 3. Bayat / Fire İade Düş */}
              <section className="rounded-xl border border-[#E2D3BD] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#3B1E1A]">3. Bayat / Fire İade Düş (Opsiyonel)</h3>
                    <p className="text-xs text-[#6E5148]">
                      Araçtan geri alınan bayat/hasarlı ekmekleri fiyattan otomatik düşer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReturns((v) => !v)}
                    aria-expanded={showReturns}
                    className="min-h-11 shrink-0 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
                  >
                    {showReturns
                      ? "Gizle"
                      : totals.returnCount > 0
                        ? `İade Düzenle (${totals.returnCount})`
                        : "İade Ekle"}
                  </button>
                </div>

                {showReturns && (
                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto border-t border-[#E2D3BD] pt-3 pr-1">
                    {sortedProducts.map((prod) => {
                      const { unitPrice } = getEffectivePrice(prod);
                      const retQty = returnQuantities[prod.id] ?? 0;
                      return (
                        <div
                          key={`ret-${prod.id}`}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                            retQty > 0 ? "border-amber-400 bg-amber-50" : "border-[#E2D3BD] bg-[#FBF6EC]/60"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#3B1E1A]">{prod.name}</p>
                            <p className="font-mono text-xs tabular-nums text-[#6E5148]">
                              İade Birimi: −{formatMoney(unitPrice)} ₺
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => adjustQty(setReturnQuantities, prod.id, -1)}
                              disabled={retQty === 0}
                              aria-label={`${prod.name} iade azalt`}
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] disabled:opacity-35"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              enterKeyHint="next"
                              aria-label={`${prod.name} iade adedi`}
                              value={retQty === 0 ? "" : String(retQty)}
                              placeholder="0"
                              onChange={(e) => setExactQty(setReturnQuantities, prod.id, e.target.value)}
                              className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A]"
                            />
                            <button
                              type="button"
                              onClick={() => adjustQty(setReturnQuantities, prod.id, 1)}
                              aria-label={`${prod.name} iade artır`}
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-amber-400 bg-amber-100 text-amber-950 transition hover:bg-amber-200"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 4. Kapıda Tahsilat & Not */}
              <section className="rounded-xl border border-[#E2D3BD] bg-white p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#B4532A]" />
                  <h3 className="text-sm font-bold text-[#3B1E1A]">4. Kapıda Tahsilat &amp; Fiş Detayı</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="hot-sale-collected" className="mb-1.5 block text-xs font-bold text-[#6E5148]">
                      Kapıda Alınan Tahsilat (₺)
                    </label>
                    <input
                      id="hot-sale-collected"
                      type="text"
                      inputMode="decimal"
                      value={collectedAmountInput}
                      onChange={(e) => setCollectedAmountInput(e.target.value)}
                      placeholder="0.00"
                      className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCollectedAmountInput("0")}
                        className="min-h-9 rounded-lg border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 text-xs font-semibold text-[#6E5148] hover:text-[#3B1E1A]"
                      >
                        Tamamı Veresiye (0 ₺)
                      </button>
                      {totals.netAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => setCollectedAmountInput(totals.netAmount.toFixed(2))}
                          className="min-h-9 rounded-lg border border-[#B4532A]/40 bg-[#F6EEDF] px-2.5 text-xs font-bold text-[#8E3D1B] hover:bg-[#E2D3BD]/40"
                        >
                          Net Tutarı Tahsil Et ({formatMoney(totals.netAmount)} ₺)
                        </button>
                      )}
                    </div>
                  </div>

                  <fieldset>
                    <legend className="mb-1.5 block text-xs font-bold text-[#6E5148]">Ödeme Yöntemi</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHOD_CHOICES.map((choice) => {
                        const active = paymentMethod === choice.id;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => setPaymentMethod(choice.id)}
                            className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition ${
                              active
                                ? "border-[#B4532A] bg-[#B4532A] text-white"
                                : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] hover:bg-[#F6EEDF]"
                            }`}
                          >
                            {choice.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="hot-sale-date" className="mb-1.5 block text-xs font-bold text-[#6E5148]">
                      Fiş Tarihi
                    </label>
                    <input
                      id="hot-sale-date"
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="hot-sale-desc" className="mb-1.5 block text-xs font-bold text-[#6E5148]">
                      Teslimat Notu (Opsiyonel)
                    </label>
                    <input
                      id="hot-sale-desc"
                      type="text"
                      maxLength={300}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Örn. Sabah sevkiyatı · Tezgah teslim"
                      className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:border-[#B4532A] focus:outline-none sm:text-sm"
                    />
                  </div>
                </div>
              </section>

              {/* 5. Mali Özet ve Kredi Limiti */}
              <section className="rounded-xl border border-[#E2D3BD] bg-[#F6EEDF] p-4 space-y-2.5">
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-lg bg-white p-2.5 border border-[#E2D3BD]">
                    <span className="text-[#6E5148]">Teslimat Toplamı</span>
                    <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#3B1E1A]">
                      {formatMoney(totals.grossTotal)} ₺
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-[#E2D3BD]">
                    <span className="text-[#6E5148]">Bayat/Fire İade</span>
                    <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-amber-800">
                      −{formatMoney(totals.returnTotal)} ₺
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-[#E2D3BD]">
                    <span className="text-[#6E5148]">Net Satış Tutarı</span>
                    <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#8E3D1B]">
                      {formatMoney(totals.netAmount)} ₺
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-[#E2D3BD]">
                    <span className="text-[#6E5148]">Tahmini Bakiye</span>
                    <p
                      className={`mt-0.5 font-mono text-sm font-bold tabular-nums ${
                        totals.exceedsCreditLimit ? "text-red-700" : "text-[#3B1E1A]"
                      }`}
                    >
                      {formatMoney(totals.projectedBalance)} ₺
                    </p>
                  </div>
                </div>

                {totals.exceedsCreditLimit && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                    <p className="font-bold">
                      Kredi Limiti Aşılıyor ({formatMoney(totals.projectedBalance)} ₺ &gt; {formatMoney(totals.creditLimit)} ₺)
                    </p>
                    {isAdmin ? (
                      <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-[#3B1E1A]">
                        <input
                          type="checkbox"
                          checked={allowOverLimit}
                          onChange={(e) => setAllowOverLimit(e.target.checked)}
                          className="h-5 w-5 rounded border-[#E2D3BD] accent-[#B4532A]"
                        />
                        Yönetici onayıyla kredi limit aşımına izin ver
                      </label>
                    ) : (
                      <p className="mt-1 leading-relaxed">
                        Kurye yetkisiyle limit üstü fiş kesilemez. En az{" "}
                        <strong className="font-mono">
                          {formatMoney(Math.max(0, totals.projectedBalance - totals.creditLimit))} ₺
                        </strong>{" "}
                        tahsilat alın veya merkezden onay isteyin.
                      </p>
                    )}
                  </div>
                )}
              </section>
            </form>
          ) : (
            /* STAGE 2: Teslimat Fişi & Sevk İrsaliyesi Önizleme */
            <div className="space-y-4">
              {/* Actions Toolbar (Admin/Kurye) */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 print:hidden">
                <div className="flex items-center gap-2 text-emerald-950">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                  <span className="text-sm font-bold">Sıcak satış atomik olarak işlendi.</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-bold text-white transition hover:bg-emerald-800"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp Paylaş
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadPng()}
                    disabled={downloadingPng}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-3.5 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F6EEDF] disabled:opacity-50"
                  >
                    {downloadingPng ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    PNG İndir
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#B4532A] px-3.5 text-xs font-bold text-white transition hover:bg-[#9C4421]"
                  >
                    <Printer className="h-4 w-4" />
                    Sevk İrsaliyesi Yazdır
                  </button>
                </div>
              </div>

              {/* Printable / Exportable Sevk İrsaliyesi & Teslimat Fişi Kağıdı (overflow-visible & pb-1 korunur!) */}
              <div
                ref={receiptRef}
                className="overflow-visible rounded-xl border border-[#E2D3BD] bg-white p-5 text-[#3B1E1A] sm:p-7 print:border-0 print:p-4"
              >
                {/* Başlık Bandı */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#3B1E1A] pb-4">
                  <div>
                    <p className="font-serif text-2xl font-bold tracking-tight text-[#3B1E1A] pb-1 leading-normal">
                      EkmekLab
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#6E5148]">
                      Taş Fırın Ekşi Maya · B2B Dağıtım
                    </p>
                    <p className="mt-1 text-xs text-[#6E5148]">
                      {CONTACT.area} · {CONTACT.phoneDisplay}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="inline-block rounded-lg border border-[#B4532A]/40 bg-[#F6EEDF] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#8E3D1B] pb-1 leading-normal">
                      SEVK İRSALİYESİ / TESLİMAT FİŞİ
                    </span>
                    <p className="mt-2 font-mono text-base font-bold tabular-nums text-[#3B1E1A] pb-1 leading-normal">
                      {result.saleTransaction.slipNumber}
                    </p>
                    <p className="text-xs text-[#6E5148] pb-1 leading-normal">
                      Tarih: <span className="font-semibold text-[#3B1E1A]">{formatTrDate(result.date)}</span>
                    </p>
                  </div>
                </div>

                {/* Alıcı / Kurumsal Unvan Bilgileri */}
                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-4 text-xs sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">Alıcı Cari / Resmi Unvan</p>
                    <p className="mt-1 text-sm font-bold text-[#3B1E1A] pb-1 leading-normal">
                      {result.account.companyTitle || result.account.businessName}
                    </p>
                    {result.account.companyTitle && (
                      <p className="text-[#6E5148]">İşletme: {result.account.businessName}</p>
                    )}
                    {result.account.contactPerson && (
                      <p className="text-[#6E5148]">Yetkili: {result.account.contactPerson}</p>
                    )}
                    <p className="text-[#6E5148]">Tel: {result.account.phone}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">Vergi &amp; Sevk Adresi</p>
                    {(result.account.taxNumber || result.account.taxOffice) && (
                      <p className="mt-1 font-mono font-semibold text-[#3B1E1A] pb-1 leading-normal">
                        {result.account.taxOffice ? `${result.account.taxOffice} · ` : ""}
                        {result.account.taxNumber ? `VKN/TCKN: ${result.account.taxNumber}` : ""}
                      </p>
                    )}
                    <p className="mt-1 text-[#3B1E1A] leading-relaxed">
                      {result.account.address}
                      {result.account.neighborhood ? `, ${result.account.neighborhood}` : ""}
                      {result.account.district ? ` / ${result.account.district}` : ""}
                    </p>
                  </div>
                </div>

                {/* Kalemler Tablosu */}
                <div className="mt-4 overflow-visible">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E2D3BD] text-[11px] uppercase tracking-wider text-[#6E5148]">
                        <th className="py-2 pr-2 font-bold">Ürün / Açıklama</th>
                        <th className="py-2 px-2 text-right font-bold">Miktar</th>
                        <th className="py-2 px-2 text-right font-bold">Birim Fiyat</th>
                        <th className="py-2 pl-2 text-right font-bold">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2D3BD]/70">
                      {result.items.map((item, idx) => (
                        <tr
                          key={`${item.productId}-${item.isReturn ? "ret" : "del"}-${idx}`}
                          className={item.isReturn ? "bg-amber-50/70" : ""}
                        >
                          <td className="py-2.5 pr-2 font-medium text-[#3B1E1A] pb-1 leading-normal">
                            <span>{item.name}</span>
                            {item.isReturn && (
                              <span className="ml-2 inline-block rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                                Bayat / Fire İade
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#3B1E1A] pb-1 leading-normal">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#6E5148] pb-1 leading-normal">
                            {formatMoney(item.unitPrice)} ₺
                          </td>
                          <td
                            className={`py-2.5 pl-2 text-right font-mono font-bold tabular-nums pb-1 leading-normal ${
                              item.isReturn ? "text-amber-900" : "text-[#3B1E1A]"
                            }`}
                          >
                            {item.lineTotal < 0
                              ? `−${formatMoney(Math.abs(item.lineTotal))} ₺`
                              : `${formatMoney(item.lineTotal)} ₺`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Finansal Alt Toplamlar */}
                <div className="mt-4 flex flex-col items-end border-t border-[#E2D3BD] pt-3 text-xs">
                  <div className="w-full max-w-xs space-y-1.5">
                    <div className="flex justify-between text-[#6E5148]">
                      <span>Teslimat Brüt Toplamı</span>
                      <span className="font-mono font-semibold tabular-nums pb-1 leading-normal">
                        {formatMoney(result.grossTotal)} ₺
                      </span>
                    </div>
                    {result.returnTotal > 0 && (
                      <div className="flex justify-between text-amber-900">
                        <span>Bayat / Fire İade Düşümü</span>
                        <span className="font-mono font-semibold tabular-nums pb-1 leading-normal">
                          −{formatMoney(result.returnTotal)} ₺
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#E2D3BD] pt-1.5 text-sm font-bold text-[#3B1E1A]">
                      <span>Net Teslimat Tutarı</span>
                      <span className="font-mono tabular-nums text-[#8E3D1B] pb-1 leading-normal">
                        {formatMoney(result.netAmount)} ₺
                      </span>
                    </div>
                    {result.collectedAmount > 0 && (
                      <div className="flex justify-between text-emerald-800">
                        <span>
                          Kapıda Tahsilat ({paymentLabel(result.paymentMethod)})
                          {result.paymentTransaction?.slipNumber ? ` · ${result.paymentTransaction.slipNumber}` : ""}
                        </span>
                        <span className="font-mono font-bold tabular-nums pb-1 leading-normal">
                          −{formatMoney(result.collectedAmount)} ₺
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between rounded-lg bg-[#F6EEDF] px-3 py-2 text-sm font-bold text-[#3B1E1A]">
                      <span>İşlem Sonrası Bakiye</span>
                      <span className="font-mono tabular-nums pb-1 leading-normal">
                        {formatMoney(result.balanceAfter)} ₺
                      </span>
                    </div>
                  </div>
                </div>

                {/* Teslim Eden / Teslim Alan İmza Kutuları */}
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-dashed border-[#E2D3BD] pt-4 text-xs">
                  <div className="rounded-lg border border-[#E2D3BD] p-3">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-[#6E5148]">Teslim Eden (EkmekLab)</p>
                    <p className="mt-1 font-semibold text-[#3B1E1A]">{delivererName || "EkmekLab Dağıtım"}</p>
                    <div className="mt-6 border-t border-[#E2D3BD] pt-1 text-[10px] text-[#6E5148]">İmza / Kaşe</div>
                  </div>
                  <div className="rounded-lg border border-[#E2D3BD] p-3">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-[#6E5148]">Teslim Alan (Müşteri)</p>
                    <p className="mt-1 font-semibold text-[#3B1E1A]">
                      {result.account.contactPerson || result.account.businessName}
                    </p>
                    <div className="mt-6 border-t border-[#E2D3BD] pt-1 text-[10px] text-[#6E5148]">Ad Soyad / İmza</div>
                  </div>
                </div>

                <p className="mt-4 text-center text-[10px] text-[#6E5148]">
                  Bu belge cari hesap teslimat fişi ve sevk bilgi dökümüdür; e-Fatura / e-Arşiv yerine geçmez.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2D3BD] bg-[#F6EEDF] px-4 py-3 sm:px-6 print:hidden">
          {!result ? (
            <>
              <div className="text-xs">
                <span className="text-[#6E5148]">Net Fiş:</span>{" "}
                <strong className="font-mono text-base tabular-nums text-[#3B1E1A]">
                  {formatMoney(totals.netAmount)} ₺
                </strong>
                {totals.collected > 0 && (
                  <span className="ml-2 text-emerald-800 font-semibold">
                    (−{formatMoney(totals.collected)} ₺ tahsil)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseClick}
                  disabled={submitting}
                  className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-semibold text-[#3B1E1A] transition hover:bg-[#FBF6EC] disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  form="b2b-hot-sale-form"
                  disabled={submitting || !selectedAccount || totals.deliveredCount === 0}
                  className="flex min-h-12 items-center gap-2 rounded-xl bg-[#B4532A] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#9C4421] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Kaydediliyor..." : "Fiş & İrsaliye Kes"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => resetForm(true)}
                className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-4 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#FBF6EC]"
              >
                <RotateCcw className="h-4 w-4" />
                Yeni Fiş Kes
              </button>
              <button
                type="button"
                onClick={handleCloseClick}
                className="min-h-11 rounded-xl bg-[#3B1E1A] px-5 text-sm font-bold text-white transition hover:bg-[#3B1E1A]/90"
              >
                Tamam
              </button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
