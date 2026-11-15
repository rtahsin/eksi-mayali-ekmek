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
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import type {
  HotSaleAccountOption,
  HotSaleProductOption,
} from "@/components/admin/cariler/B2BHotSaleModal";
import { formatTrDate } from "@/lib/time/istanbul";
import { CONTACT, whatsappLink } from "@/lib/site";
import type {
  B2BHotSaleAccountSummary,
  B2BHotSaleItem,
  B2BHotSalePaymentMethod,
  B2BHotSaleTransactionSummary,
} from "@/types/admin";

export interface B2BFlexibleStopItem {
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export interface B2BFlexibleStop {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  neighborhood: string;
  district?: string;
  deliveryNote: string;
  items: B2BFlexibleStopItem[];
  totalAmount: number;
  cariId: string | null;
  cariName: string | null;
}

export interface B2BFlexibleDeliveryResult {
  success: true;
  already?: boolean;
  orderId: string;
  orderNumber: string;
  saleTransaction: B2BHotSaleTransactionSummary | null;
  paymentTransaction: B2BHotSaleTransactionSummary | null;
  balanceAfter: number;
  signedSlipUrl: string;
  account: B2BHotSaleAccountSummary;
  items: B2BHotSaleItem[];
  grossTotal: number;
  returnTotal: number;
  netAmount: number;
  collectedAmount: number;
  paymentMethod?: B2BHotSalePaymentMethod;
  date: string;
  description: string;
}

export interface B2BFlexibleDeliveryModalProps {
  stop: B2BFlexibleStop | null;
  onClose: () => void;
  accounts: HotSaleAccountOption[];
  products: HotSaleProductOption[];
  isAdmin: boolean;
  onCompleted?: (result: B2BFlexibleDeliveryResult) => void;
}

interface EditableDeliveryLine {
  key: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  priceOverrideInput: string;
  unit: string;
}

type CourierFlexPaymentMethod = "cash" | "pos" | "transfer";

const PAYMENT_OPTIONS: Array<{ id: CourierFlexPaymentMethod; label: string }> = [
  { id: "cash", label: "Nakit" },
  { id: "pos", label: "POS / Kart" },
  { id: "transfer", label: "Havale / EFT" },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function slipPaymentLabel(m?: B2BHotSalePaymentMethod): string {
  if (m === "kredi_karti") return "Kart (POS)";
  if (m === "havale") return "Havale / EFT";
  return "Nakit";
}

export function B2BFlexibleDeliveryModal({
  stop,
  onClose,
  accounts,
  products,
  isAdmin,
  onCompleted,
}: B2BFlexibleDeliveryModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  const [lines, setLines] = useState<EditableDeliveryLine[]>([]);
  const [addProductId, setAddProductId] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [showReturns, setShowReturns] = useState(false);

  const [collectedAmountInput, setCollectedAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CourierFlexPaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [allowOverLimit, setAllowOverLimit] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<B2BFlexibleDeliveryResult | null>(null);

  const open = Boolean(stop);

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

  // Stop değiştiğinde formu başlat
  useEffect(() => {
    if (!stop) return;
    setLines(
      stop.items.map((it, idx) => {
        const pid = it.productId && it.productId.trim() ? it.productId.trim() : null;
        return {
          key: pid ? `pid:${pid}:${idx}` : `free:${idx}`,
          productId: pid,
          productName: it.productName,
          quantity: Math.max(0, Math.trunc(Number(it.quantity) || 0)),
          unitPrice: round2(Number(it.unitPrice) || 0),
          priceOverrideInput: String(round2(Number(it.unitPrice) || 0)),
          unit: it.unit || "adet",
        };
      }),
    );
    setAddProductId("");
    setReturnQuantities({});
    setShowReturns(false);
    setCollectedAmountInput("");
    setPaymentMethod("cash");
    setNote("");
    setAllowOverLimit(false);
    setError(null);
    setResult(null);
  }, [stop]);

  const account = useMemo(
    () => (stop?.cariId ? accounts.find((a) => a.id === stop.cariId) ?? null : null),
    [accounts, stop?.cariId],
  );

  const returnCatalog = useMemo(() => {
    const customPrices = account?.customPrices ?? {};
    const orderPidPrices = new Map<string, number>();
    for (const l of lines) {
      if (l.productId) {
        orderPidPrices.set(l.productId, l.unitPrice);
      }
    }
    return [...products]
      .filter((p) => p.price >= 0)
      .map((prod) => {
        const custom = customPrices[prod.id];
        const ordPrice = orderPidPrices.get(prod.id);
        const unitPrice =
          ordPrice !== undefined
            ? ordPrice
            : typeof custom === "number" && Number.isFinite(custom) && custom >= 0
              ? round2(custom)
              : round2(prod.price);
        return { ...prod, effectivePrice: unitPrice };
      })
      .sort((a, b) => {
        const aInOrder = orderPidPrices.has(a.id) ? 1 : 0;
        const bInOrder = orderPidPrices.has(b.id) ? 1 : 0;
        if (aInOrder !== bInOrder) return bInOrder - aInOrder;
        const aCust = customPrices[a.id] !== undefined ? 1 : 0;
        const bCust = customPrices[b.id] !== undefined ? 1 : 0;
        if (aCust !== bCust) return bCust - aCust;
        return a.name.localeCompare(b.name, "tr-TR");
      });
  }, [products, account?.customPrices, lines]);

  const addableProducts = useMemo(() => {
    const existingPids = new Set(lines.map((l) => l.productId).filter((pid): pid is string => Boolean(pid)));
    return returnCatalog.filter((p) => !existingPids.has(p.id));
  }, [returnCatalog, lines]);

  const totals = useMemo(() => {
    let grossTotal = 0;
    let deliveredCount = 0;
    for (const l of lines) {
      if (l.quantity <= 0) continue;
      let price = l.unitPrice;
      if (isAdmin && l.priceOverrideInput.trim() !== "") {
        const parsed = Number(l.priceOverrideInput.replace(",", "."));
        if (Number.isFinite(parsed) && parsed >= 0) price = round2(parsed);
      }
      grossTotal = round2(grossTotal + l.quantity * price);
      deliveredCount += l.quantity;
    }

    let returnTotal = 0;
    let returnCount = 0;
    for (const prod of returnCatalog) {
      const rq = returnQuantities[prod.id] ?? 0;
      if (rq > 0) {
        returnTotal = round2(returnTotal + rq * prod.effectivePrice);
        returnCount += rq;
      }
    }

    const netAmount = Math.max(round2(grossTotal - returnTotal), 0);
    const parsedCollected = Number(collectedAmountInput.replace(",", "."));
    const collected = Number.isFinite(parsedCollected) && parsedCollected > 0 ? round2(parsedCollected) : 0;
    const currentBalance = round2(account?.balance ?? 0);
    const creditLimit = round2(account?.creditLimit ?? 0);
    const projectedBalance = round2(currentBalance + netAmount - collected);
    const exceedsCreditLimit = creditLimit > 0 && projectedBalance > creditLimit;

    return {
      grossTotal,
      returnTotal,
      netAmount,
      deliveredCount,
      returnCount,
      collected,
      currentBalance,
      creditLimit,
      projectedBalance,
      exceedsCreditLimit,
    };
  }, [lines, returnCatalog, returnQuantities, collectedAmountInput, account, isAdmin]);

  const updateLineQty = (key: string, nextQty: number) => {
    const clamped = Math.max(0, Math.min(5000, Math.trunc(nextQty)));
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: clamped } : l)));
  };

  const handleAddCatalogProduct = (productId: string) => {
    if (!productId) return;
    const prod = returnCatalog.find((p) => p.id === productId);
    if (!prod) return;
    setLines((prev) => [
      ...prev,
      {
        key: `pid:${prod.id}:extra`,
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        unitPrice: prod.effectivePrice,
        priceOverrideInput: String(prod.effectivePrice),
        unit: prod.unitLabel || "adet",
      },
    ]);
    setAddProductId("");
  };

  const adjustReturnQty = (productId: string, delta: number) => {
    setReturnQuantities((prev) => {
      const next = Math.max(0, Math.min(5000, (prev[productId] ?? 0) + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const setExactReturnQty = (productId: string, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    const n = cleaned ? parseInt(cleaned, 10) : 0;
    setReturnQuantities((prev) => {
      if (!Number.isFinite(n) || n <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: Math.min(5000, n) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stop) return;

    const deliveredItems = lines
      .filter((l) => l.quantity > 0)
      .map((l) => {
        let unitPrice: number | undefined;
        if (isAdmin && l.priceOverrideInput.trim() !== "") {
          const parsed = Number(l.priceOverrideInput.replace(",", "."));
          if (Number.isFinite(parsed) && parsed >= 0) {
            unitPrice = round2(parsed);
          }
        }
        return {
          productId: l.productId,
          productName: l.productName,
          quantity: l.quantity,
          ...(unitPrice !== undefined ? { unitPrice } : {}),
        };
      });

    const returnItems = Object.entries(returnQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const prod = returnCatalog.find((p) => p.id === productId);
        return {
          productId,
          productName: prod?.name ?? productId,
          quantity,
        };
      });

    if (deliveredItems.length === 0 && returnItems.length === 0) {
      setError("En az 1 teslim edilen ürün veya bayat/fire iade kalemi girin.");
      return;
    }

    if (totals.exceedsCreditLimit && !allowOverLimit) {
      setError(
        isAdmin
          ? "Cari kredi limiti aşılıyor. Tahsilat alın veya limit aşım onayını işaretleyin."
          : "Cari kredi limiti aşılıyor. Kapıda tahsilat alın veya merkez onayı isteyin.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(stop.id)}/deliver-b2b`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveredItems,
          returnItems,
          collectedAmount: totals.collected,
          paymentMethod: totals.collected > 0 ? paymentMethod : null,
          note: note.trim() || undefined,
          allowOverLimit: isAdmin ? allowOverLimit : false,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | (B2BFlexibleDeliveryResult & { error?: undefined })
        | { error?: string; code?: string }
        | null;

      if (!res.ok || !data || !("success" in data) || !data.success) {
        const msg =
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Esnek B2B teslimat kaydedilemedi.";
        throw new Error(msg);
      }

      setResult(data);
      onCompleted?.(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Teslimat sırasında bir hata oluştu.");
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
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const slipSlug = (result.saleTransaction?.slipNumber || result.orderNumber || "irsaliye").replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `EkmekLab-${slipSlug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fiş görseli oluşturulamadı.");
    } finally {
      setDownloadingPng(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!result) return;
    const slipNo = result.saleTransaction?.slipNumber || result.orderNumber;
    const linesText = [
      `*EkmekLab — Sevk İrsaliyesi & Teslimat Fişi*`,
      `Cari: ${result.account.companyTitle || result.account.businessName}`,
      `Belge No: *${slipNo}* (${result.orderNumber})`,
      `Tarih: ${formatTrDate(result.date)}`,
      ``,
      `Net Teslimat: *${formatMoney(result.netAmount)} ₺*`,
      ...(result.returnTotal > 0 ? [`Bayat/Fire İade Düşümü: -${formatMoney(result.returnTotal)} ₺`] : []),
      ...(result.collectedAmount > 0
        ? [`Kapıda Tahsilat (${slipPaymentLabel(result.paymentMethod)}): -${formatMoney(result.collectedAmount)} ₺`]
        : []),
      `Güncel Bakiye: *${formatMoney(result.balanceAfter)} ₺*`,
      ...(result.signedSlipUrl ? [``, `Dijital Fiş & Kalemler:`, result.signedSlipUrl] : []),
    ];
    const message = linesText.join("\n");
    const digits = result.account.phone.replace(/\D/g, "");
    const e164 =
      digits.startsWith("0") && digits.length === 11
        ? `9${digits}`
        : digits.length === 10
          ? `90${digits}`
          : digits;
    const targetUrl = e164 ? whatsappLink(message, e164) : whatsappLink(message);
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleDialogPointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    if (submitting) return;
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

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as Record<string, string>)}
      onPointerDown={handleDialogPointerDown}
      onCancel={(e) => {
        if (submitting) {
          e.preventDefault();
          return;
        }
        onClose();
      }}
      aria-labelledby="b2b-flex-deliver-title"
      className="m-auto mb-0 w-full max-w-3xl rounded-t-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 sm:mb-auto sm:rounded-2xl print:static print:m-0 print:max-h-none print:w-full print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:bg-white print:shadow-none print:backdrop:hidden"
    >
      {stop && (
        <div
          ref={contentRef}
          className="flex max-h-[92dvh] flex-col overflow-hidden print:max-h-none print:overflow-visible"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[#E2D3BD] bg-[#F6EEDF] px-4 py-3.5 sm:px-6 print:hidden">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                {stop.orderNumber} · Kapıda Esnek B2B Teslimat
              </p>
              <h2 id="b2b-flex-deliver-title" className="truncate font-serif text-lg font-bold text-[#3B1E1A] sm:text-xl">
                {result
                  ? `Teslim Edildi · ${result.saleTransaction?.slipNumber || result.orderNumber}`
                  : stop.cariName || stop.customerName}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={submitting}
              aria-label="Modalı kapat"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] transition hover:bg-[#F6EEDF] disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0">
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 print:hidden"
              >
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                <p>{error}</p>
              </div>
            )}

            {!result ? (
              <form id="b2b-flex-deliver-form" onSubmit={handleSubmit} className="space-y-4 print:hidden">
                {account && (
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#E2D3BD] bg-white p-3 text-xs sm:grid-cols-3">
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[#6E5148]">Cari Hesap</span>
                      <p className="font-bold text-[#3B1E1A]">{account.businessName}</p>
                    </div>
                    <div>
                      <span className="text-[#6E5148]">Mevcut Bakiye</span>
                      <p className="font-mono font-bold tabular-nums text-[#3B1E1A]">
                        {formatMoney(account.balance)} ₺
                      </p>
                    </div>
                    <div>
                      <span className="text-[#6E5148]">Kredi Limiti</span>
                      <p className="font-mono font-bold tabular-nums text-[#3B1E1A]">
                        {account.creditLimit && account.creditLimit > 0
                          ? `${formatMoney(account.creditLimit)} ₺`
                          : "Limitsiz"}
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. Gerçek Teslim Edilen Kalemler */}
                <section className="rounded-xl border border-[#E2D3BD] bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#3B1E1A]">1. Teslim Edilen Adetler</h3>
                      <p className="text-xs text-[#6E5148]">
                        Kapıda gerçekte bırakılan miktarı düzenleyin veya ekstra ürün ekleyin.
                      </p>
                    </div>
                    <span className="rounded-lg bg-[#F6EEDF] px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-[#3B1E1A]">
                      {totals.deliveredCount} adet · {formatMoney(totals.grossTotal)} ₺
                    </span>
                  </div>

                  <div className="space-y-2">
                    {lines.map((line) => (
                      <div
                        key={line.key}
                        className={`flex flex-wrap items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 ${
                          line.quantity > 0 ? "border-[#B4532A] bg-[#FBF6EC]" : "border-[#E2D3BD] bg-white opacity-70"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#3B1E1A]">{line.productName}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-[#6E5148]">
                            {isAdmin ? (
                              <label className="inline-flex items-center gap-1">
                                <span className="sr-only">{line.productName} birim fiyat</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={line.priceOverrideInput}
                                  onChange={(e) =>
                                    setLines((prev) =>
                                      prev.map((row) =>
                                        row.key === line.key ? { ...row, priceOverrideInput: e.target.value } : row,
                                      ),
                                    )
                                  }
                                  className="min-h-9 w-20 rounded-lg border border-[#E2D3BD] bg-white px-2 font-mono text-base font-semibold tabular-nums text-[#3B1E1A] sm:text-xs"
                                />
                                <span>₺</span>
                              </label>
                            ) : (
                              <span className="font-mono font-semibold tabular-nums text-[#3B1E1A]">
                                {formatMoney(line.unitPrice)} ₺
                              </span>
                            )}
                            <span>· {line.unit}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateLineQty(line.key, line.quantity - 1)}
                            disabled={line.quantity === 0}
                            aria-label={`${line.productName} azalt`}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] disabled:opacity-35"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            enterKeyHint="next"
                            aria-label={`${line.productName} teslim edilen adedi`}
                            value={line.quantity === 0 ? "" : String(line.quantity)}
                            placeholder="0"
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\D/g, "");
                              const parsed = cleaned ? parseInt(cleaned, 10) : 0;
                              updateLineQty(line.key, Number.isFinite(parsed) ? parsed : 0);
                            }}
                            className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateLineQty(line.key, line.quantity + 1)}
                            aria-label={`${line.productName} artır`}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#B4532A] text-white hover:bg-[#9C4421]"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {addableProducts.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-[#E2D3BD] pt-3 sm:flex-row sm:items-center">
                      <label htmlFor="flex-add-product" className="text-xs font-bold text-[#6E5148]">
                        Araçtan Ek Ürün Ekle:
                      </label>
                      <select
                        id="flex-add-product"
                        value={addProductId}
                        onChange={(e) => handleAddCatalogProduct(e.target.value)}
                        className="min-h-11 flex-1 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] sm:text-sm"
                      >
                        <option value="">Katalogdan ürün seçip ekle...</option>
                        {addableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatMoney(p.effectivePrice)} ₺)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </section>

                {/* 2. Bayat / Fire İade */}
                <section className="rounded-xl border border-[#E2D3BD] bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#3B1E1A]">2. Bayat / Fire İade Al (Opsiyonel)</h3>
                      <p className="text-xs text-[#6E5148]">
                        Mutabakat gereği geri alınan bayat ürünler fatura tutarından düşülür.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReturns((v) => !v)}
                      aria-expanded={showReturns}
                      className="min-h-11 shrink-0 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 text-xs font-bold text-[#3B1E1A] hover:bg-[#F6EEDF]"
                    >
                      {showReturns
                        ? "Gizle"
                        : totals.returnCount > 0
                          ? `İade Düzenle (${totals.returnCount})`
                          : "İade Ekle"}
                    </button>
                  </div>

                  {showReturns && (
                    <div className="mt-3 max-h-52 space-y-2 overflow-y-auto border-t border-[#E2D3BD] pt-3 pr-1">
                      {returnCatalog.map((prod) => {
                        const rq = returnQuantities[prod.id] ?? 0;
                        return (
                          <div
                            key={`ret-${prod.id}`}
                            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                              rq > 0 ? "border-amber-400 bg-amber-50" : "border-[#E2D3BD] bg-[#FBF6EC]/60"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[#3B1E1A]">{prod.name}</p>
                              <p className="font-mono text-xs tabular-nums text-[#6E5148]">
                                İade Birimi: −{formatMoney(prod.effectivePrice)} ₺
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => adjustReturnQty(prod.id, -1)}
                                disabled={rq === 0}
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
                                value={rq === 0 ? "" : String(rq)}
                                placeholder="0"
                                onChange={(e) => setExactReturnQty(prod.id, e.target.value)}
                                className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A]"
                              />
                              <button
                                type="button"
                                onClick={() => adjustReturnQty(prod.id, 1)}
                                aria-label={`${prod.name} iade artır`}
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200"
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

                {/* 3. Kapıda Tahsilat & Not */}
                <section className="rounded-xl border border-[#E2D3BD] bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[#B4532A]" />
                    <h3 className="text-sm font-bold text-[#3B1E1A]">3. Kapıda Kısmi / Tam Tahsilat &amp; Not</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="flex-collected" className="mb-1.5 block text-xs font-bold text-[#6E5148]">
                        Alınan Tahsilat (₺)
                      </label>
                      <input
                        id="flex-collected"
                        type="text"
                        inputMode="decimal"
                        value={collectedAmountInput}
                        onChange={(e) => setCollectedAmountInput(e.target.value)}
                        placeholder="0.00"
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setCollectedAmountInput("0")}
                          className="min-h-9 rounded-lg border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 text-xs font-semibold text-[#6E5148]"
                        >
                          Veresiye (0 ₺)
                        </button>
                        {totals.netAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => setCollectedAmountInput(totals.netAmount.toFixed(2))}
                            className="min-h-9 rounded-lg border border-[#B4532A]/40 bg-[#F6EEDF] px-2.5 text-xs font-bold text-[#8E3D1B]"
                          >
                            Net Tutarı Al ({formatMoney(totals.netAmount)} ₺)
                          </button>
                        )}
                      </div>
                    </div>

                    <fieldset>
                      <legend className="mb-1.5 block text-xs font-bold text-[#6E5148]">Ödeme Yöntemi</legend>
                      <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_OPTIONS.map((opt) => {
                          const active = paymentMethod === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setPaymentMethod(opt.id)}
                              className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition ${
                                active
                                  ? "border-[#B4532A] bg-[#B4532A] text-white"
                                  : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] hover:bg-[#F6EEDF]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  </div>

                  <div>
                    <label htmlFor="flex-note" className="mb-1 block text-xs font-bold text-[#6E5148]">
                      Teslimat Notu (Opsiyonel)
                    </label>
                    <input
                      id="flex-note"
                      type="text"
                      maxLength={300}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Örn. 2 bayat düşüldü, 500 TL nakit alındı"
                      className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] sm:text-sm"
                    />
                  </div>
                </section>

                {/* 4. Mali Özet */}
                <section className="rounded-xl border border-[#E2D3BD] bg-[#F6EEDF] p-4 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-lg border border-[#E2D3BD] bg-white p-2.5">
                      <span className="text-[#6E5148]">Teslimat Brüt</span>
                      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#3B1E1A]">
                        {formatMoney(totals.grossTotal)} ₺
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#E2D3BD] bg-white p-2.5">
                      <span className="text-[#6E5148]">Bayat/Fire İade</span>
                      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-amber-800">
                        −{formatMoney(totals.returnTotal)} ₺
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#E2D3BD] bg-white p-2.5">
                      <span className="text-[#6E5148]">Net Satış</span>
                      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#8E3D1B]">
                        {formatMoney(totals.netAmount)} ₺
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#E2D3BD] bg-white p-2.5">
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
                        Kredi Limiti Aşılıyor ({formatMoney(totals.projectedBalance)} ₺ &gt;{" "}
                        {formatMoney(totals.creditLimit)} ₺)
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
                        <p className="mt-1">
                          Kurye yetkisiyle limit üstü teslimat yapılamaz; en az{" "}
                          <strong className="font-mono">
                            {formatMoney(Math.max(0, totals.projectedBalance - totals.creditLimit))} ₺
                          </strong>{" "}
                          tahsilat alın veya merkez onayı isteyin.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </form>
            ) : (
              /* STAGE 2: Sevk İrsaliyesi */
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 print:hidden">
                  <div className="flex items-center gap-2 text-emerald-950">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                    <span className="text-sm font-bold">Esnek B2B teslimat ve cari kaydı tamamlandı.</span>
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
                      className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-3.5 text-xs font-bold text-[#3B1E1A] hover:bg-[#F6EEDF] disabled:opacity-50"
                    >
                      {downloadingPng ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      PNG İndir
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#B4532A] px-3.5 text-xs font-bold text-white hover:bg-[#9C4421]"
                    >
                      <Printer className="h-4 w-4" />
                      Sevk İrsaliyesi Yazdır
                    </button>
                  </div>
                </div>

                {/* Baskı & PNG Kartı — overflow-visible & pb-1 korunur */}
                <div
                  ref={receiptRef}
                  className="overflow-visible rounded-xl border border-[#E2D3BD] bg-white p-5 text-[#3B1E1A] sm:p-7 print:border-0 print:p-4"
                >
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
                        {result.saleTransaction?.slipNumber || result.orderNumber}
                      </p>
                      <p className="text-xs text-[#6E5148] pb-1 leading-normal">
                        Sipariş: <span className="font-mono font-semibold text-[#3B1E1A]">{result.orderNumber}</span> ·{" "}
                        {formatTrDate(result.date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-4 text-xs sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">Alıcı Cari</p>
                      <p className="mt-1 text-sm font-bold text-[#3B1E1A] pb-1 leading-normal">
                        {result.account.companyTitle || result.account.businessName}
                      </p>
                      {result.account.companyTitle && (
                        <p className="text-[#6E5148]">İşletme: {result.account.businessName}</p>
                      )}
                      {result.account.phone && <p className="text-[#6E5148]">Tel: {result.account.phone}</p>}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">Sevk Adresi</p>
                      {(result.account.taxNumber || result.account.taxOffice) && (
                        <p className="mt-1 font-mono font-semibold text-[#3B1E1A] pb-1 leading-normal">
                          {result.account.taxOffice ? `${result.account.taxOffice} · ` : ""}
                          {result.account.taxNumber ? `VKN/TCKN: ${result.account.taxNumber}` : ""}
                        </p>
                      )}
                      <p className="mt-1 text-[#3B1E1A] leading-relaxed">
                        {result.account.address || stop.address}
                        {result.account.neighborhood ? `, ${result.account.neighborhood}` : ""}
                        {result.account.district ? ` / ${result.account.district}` : ""}
                      </p>
                    </div>
                  </div>

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
                            key={`${item.productId ?? "custom"}-${item.isReturn ? "ret" : "del"}-${idx}`}
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
                            Kapıda Tahsilat ({slipPaymentLabel(result.paymentMethod)})
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
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#E2D3BD] bg-[#F6EEDF] px-4 py-3 sm:px-6 print:hidden">
            {!result ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold text-[#6E5148]">
                  Net Tutar: <strong className="font-mono text-[#3B1E1A]">{formatMoney(totals.netAmount)} ₺</strong>
                  {totals.collected > 0 ? ` · Tahsilat: ${formatMoney(totals.collected)} ₺` : " · Cariye yazılacak"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    disabled={submitting}
                    className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-bold text-[#3B1E1A]"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    form="b2b-flex-deliver-form"
                    disabled={submitting}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#245A38] px-5 text-sm font-bold text-white transition hover:bg-[#1B452B] disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    {submitting ? "Kaydediliyor..." : "Teslimatı Onayla & İrsaliye Kes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="min-h-11 rounded-xl bg-[#3B1E1A] px-6 text-sm font-bold text-white"
                >
                  Dağıtım Listesine Dön
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
