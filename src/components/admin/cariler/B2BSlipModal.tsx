"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Receipt, ShieldAlert, Trash2, X } from "lucide-react";
import { useCariler } from "@/hooks/useCariler";
import { useProducts } from "@/hooks/useProducts";
import { istanbulToday } from "@/lib/time/istanbul";
import type { CariTransaction } from "@/types/admin";

interface B2BSlipModalProps {
  cariId: string;
  cariName: string;
  customPrices?: Record<string, number>;
  onClose: () => void;
  onSuccess?: (createdTx?: CariTransaction) => void;
}

interface SlipItemRow {
  rowId: string;
  productId?: string;
  name: string;
  isCustomName: boolean;
  qty: string;
  price: string;
}

function makeEmptyRow(): SlipItemRow {
  return {
    rowId: crypto.randomUUID(),
    productId: undefined,
    name: "",
    isCustomName: false,
    qty: "1",
    price: "",
  };
}

export default function B2BSlipModal({
  cariId,
  cariName,
  customPrices,
  onClose,
  onSuccess,
}: B2BSlipModalProps) {
  const { cariler, addTransaction } = useCariler();
  const { products } = useProducts();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const effectiveCustomPrices = useMemo(() => {
    if (customPrices && Object.keys(customPrices).length > 0) return customPrices;
    return cariler.find((c) => c.id === cariId)?.customPrices ?? {};
  }, [customPrices, cariler, cariId]);

  const [items, setItems] = useState<SlipItemRow[]>(() => [makeEmptyRow()]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const activeProducts = useMemo(
    () =>
      products
        .filter((p) => p.price > 0)
        .sort((a, b) => a.name.localeCompare(b.name, "tr-TR")),
    [products],
  );

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const q = Number(item.qty.replace(",", ".")) || 0;
      const p = Number(item.price.replace(",", ".")) || 0;
      if (q > 0 && p >= 0) {
        return Math.round((sum + q * p) * 100) / 100;
      }
      return sum;
    }, 0);
  }, [items]);

  const handleSelectProduct = (rowId: string, selectedValue: string) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        if (selectedValue === "__custom__") {
          return { ...row, productId: undefined, name: "", isCustomName: true, price: row.price };
        }
        const prod = activeProducts.find((p) => p.id === selectedValue);
        if (!prod) {
          return { ...row, productId: undefined, name: "", isCustomName: false, price: "" };
        }
        const customPrice = effectiveCustomPrices[prod.id];
        const unitPrice = typeof customPrice === "number" && customPrice > 0 ? customPrice : prod.price;
        return {
          ...row,
          productId: prod.id,
          name: prod.name,
          isCustomName: false,
          price: String(unitPrice),
        };
      }),
    );
  };

  const updateRow = (rowId: string, patch: Partial<SlipItemRow>) => {
    setItems((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };

  const removeRow = (rowId: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((i) => {
      const q = Number(i.qty.replace(",", "."));
      const p = Number(i.price.replace(",", "."));
      return i.name.trim() !== "" && Number.isFinite(q) && q > 0 && Number.isFinite(p) && p >= 0;
    });

    if (validItems.length === 0) {
      setError("Lütfen en az bir geçerli ürün kalemi ekleyin.");
      return;
    }

    const slipTotal =
      Math.round(
        validItems.reduce(
          (sum, i) => sum + Number(i.qty.replace(",", ".")) * Number(i.price.replace(",", ".")),
          0,
        ) * 100,
      ) / 100;

    if (slipTotal <= 0) {
      setError("Fiş toplam tutarı 0'dan büyük olmalıdır.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const normalized = validItems.map((i) => ({
        name: i.name.trim(),
        quantity: Number(i.qty.replace(",", ".")),
        unitPrice: Number(i.price.replace(",", ".")),
        ...(i.productId ? { productId: i.productId } : {}),
      }));

      const res = await addTransaction(cariId, {
        kind: "satis",
        items: normalized,
        description: notes.trim() || undefined,
      });

      if (!res.success || !res.transactionId) {
        throw new Error(res.error || "Fiş kesilemedi.");
      }

      const createdTx: CariTransaction = {
        id: res.transactionId,
        cariId,
        date: istanbulToday(),
        type: "satis",
        amount: slipTotal,
        delta: slipTotal,
        description: notes.trim(),
        slipNumber: res.slipNumber,
        balanceAfter: res.balanceAfter,
        items: normalized.map((v) => ({
          name: v.name,
          quantity: v.quantity,
          unitPrice: v.unitPrice,
          ...(v.productId ? { productId: v.productId } : {}),
        })),
        createdAt: new Date().toISOString(),
      };

      onSuccess?.(createdTx);
      dialogRef.current?.close();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fiş kesilemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="closerequest"
      onCancel={(e) => {
        if (loading) e.preventDefault();
      }}
      aria-labelledby="b2b-slip-title"
      className="m-auto mb-0 w-full max-w-xl rounded-t-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 sm:mb-auto sm:rounded-2xl"
    >
      <div className="flex max-h-[92dvh] flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E2D3BD] bg-[#F6EEDF] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#B4532A]">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="b2b-slip-title" className="font-serif text-lg font-bold text-[#3B1E1A]">
                Teslimat Fişi Kes
              </h2>
              <p className="truncate text-xs text-[#6E5148]">{cariName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={loading}
            aria-label="Kapat"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] transition hover:bg-[#F6EEDF] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form id="b2b-slip-form" onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6E5148]">
                Teslim Edilen Ürünler
              </span>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, makeEmptyRow()])}
                className="flex min-h-10 items-center gap-1 rounded-xl border border-[#E2D3BD] bg-white px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
              >
                <Plus className="h-3.5 w-3.5 text-[#B4532A]" />
                Satır Ekle
              </button>
            </div>

            {items.map((item, index) => {
              const q = Number(item.qty.replace(",", ".")) || 0;
              const p = Number(item.price.replace(",", ".")) || 0;
              const lineTotal = Math.round(q * p * 100) / 100;
              const hasCustom = Boolean(item.productId && (effectiveCustomPrices[item.productId] ?? 0) > 0);

              return (
                <div key={item.rowId} className="space-y-2.5 rounded-xl border border-[#E2D3BD] bg-white p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label htmlFor={`slip-prod-${item.rowId}`} className="sr-only">
                        {index + 1}. ürün seçimi
                      </label>
                      <select
                        id={`slip-prod-${item.rowId}`}
                        value={item.isCustomName ? "__custom__" : item.productId ?? ""}
                        onChange={(e) => handleSelectProduct(item.rowId, e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base font-medium text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                      >
                        <option value="">Ürün seçin...</option>
                        {activeProducts.map((prod) => {
                          const custom = effectiveCustomPrices[prod.id];
                          const eff = typeof custom === "number" && custom > 0 ? custom : prod.price;
                          return (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} ({eff} ₺{custom ? " · Özel" : ""})
                            </option>
                          );
                        })}
                        <option value="__custom__">+ Serbest / Özel Kalem Yaz</option>
                      </select>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(item.rowId)}
                        aria-label="Satırı sil"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {item.isCustomName && (
                    <div>
                      <label htmlFor={`slip-name-${item.rowId}`} className="sr-only">
                        Özel kalem adı
                      </label>
                      <input
                        id={`slip-name-${item.rowId}`}
                        type="text"
                        value={item.name}
                        onChange={(e) => updateRow(item.rowId, { name: e.target.value })}
                        placeholder="Özel ürün veya hizmet adı..."
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor={`slip-qty-${item.rowId}`} className="mb-1 block text-[11px] font-bold text-[#6E5148]">
                        Adet
                      </label>
                      <input
                        id={`slip-qty-${item.rowId}`}
                        type="text"
                        inputMode="decimal"
                        value={item.qty}
                        onChange={(e) => updateRow(item.rowId, { qty: e.target.value })}
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`slip-price-${item.rowId}`} className="mb-1 block text-[11px] font-bold text-[#6E5148]">
                        Birim Fiyat {hasCustom ? "(Özel)" : ""}
                      </label>
                      <input
                        id={`slip-price-${item.rowId}`}
                        type="text"
                        inputMode="decimal"
                        value={item.price}
                        onChange={(e) => updateRow(item.rowId, { price: e.target.value })}
                        placeholder="0.00"
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 text-right font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-[11px] font-bold text-[#6E5148]">Satır Tutarı</span>
                      <div className="flex min-h-11 items-center justify-end rounded-xl border border-[#E2D3BD] bg-[#F6EEDF] px-2.5 font-mono text-sm font-bold tabular-nums text-[#3B1E1A]">
                        {lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label htmlFor="slip-notes" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6E5148]">
              Fiş Açıklaması (Opsiyonel)
            </label>
            <textarea
              id="slip-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn. Haftalık sevkiyat teslimatı..."
              className="w-full rounded-xl border border-[#E2D3BD] bg-white p-3 text-base text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:border-[#B4532A] focus:outline-none sm:text-sm"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#E2D3BD] bg-[#F6EEDF] px-5 py-3.5">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">Fiş Toplamı</span>
            <span className="font-mono text-xl font-bold tabular-nums text-[#8E3D1B]">
              {totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={loading}
              className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-semibold text-[#3B1E1A] transition hover:bg-[#FBF6EC] disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              form="b2b-slip-form"
              disabled={loading}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-[#B4532A] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#9C4421] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Kesiliyor..." : "Fişi Kes"}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
