"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Receipt,
  Plus,
  Trash2,
  Loader2,
  Tag,
} from "lucide-react";
import { useCariler } from "@/hooks/useCariler";
import { useProducts } from "@/hooks/useProducts";
import { CariTransaction } from "@/types/admin";
import { istanbulToday } from "@/lib/time/istanbul";

interface B2BSlipModalProps {
  cariId: string;
  cariName: string;
  customPrices?: Record<string, number>;
  onClose: () => void;
  onSuccess?: (createdTx?: CariTransaction) => void;
}

interface SlipItem {
  id: string;
  productId?: string;
  name: string;
  qty: number;
  price: number;
  isCustomPrice?: boolean;
}

export default function B2BSlipModal({
  cariId,
  cariName,
  customPrices,
  onClose,
  onSuccess,
}: B2BSlipModalProps) {
  const { cariler, addTransaction } = useCariler();
  const { allProducts } = useProducts();

  // Find cari if props are omitted
  const currentCari = useMemo(() => cariler.find((c) => c.id === cariId), [cariler, cariId]);
  const effectiveCustomPrices = customPrices || currentCari?.customPrices || {};

  const [items, setItems] = useState<SlipItem[]>([
    { id: "1", name: "", qty: 1, price: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  }, [items]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), name: "", qty: 1, price: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleProductSelect = (itemId: string, selectedProductId: string) => {
    if (!selectedProductId) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, productId: undefined, name: "", price: 0, isCustomPrice: false }
            : i
        )
      );
      return;
    }

    if (selectedProductId === "__manual__") {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, productId: undefined, name: "", isCustomPrice: false }
            : i
        )
      );
      return;
    }

    const foundProd = allProducts.find((p) => p.id === selectedProductId);
    if (!foundProd) return;

    // Check if there is a custom price for this client
    const hasCustom = effectiveCustomPrices[foundProd.id] !== undefined;
    const finalPrice = hasCustom
      ? effectiveCustomPrices[foundProd.id]
      : foundProd.price;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              productId: foundProd.id,
              name: foundProd.name,
              price: finalPrice,
              isCustomPrice: hasCustom,
            }
          : i
      )
    );
  };

  const updateItemField = (
    id: string,
    field: "name" | "qty" | "price",
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (field === "qty") return { ...i, qty: Number(value) };
        if (field === "price") return { ...i, price: Number(value), isCustomPrice: false };
        return { ...i, name: String(value) };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter(
      (i) => i.name.trim() !== "" && (Number(i.qty) || 0) > 0 && (Number(i.price) || 0) >= 0
    );

    if (validItems.length === 0) {
      setError("Lütfen en az bir geçerli ürün kalemi ekleyin.");
      return;
    }

    // Sunucu yalnız geçerli kalemleri toplar ve kuruşa yuvarlar; makbuz da aynı tutarı göstersin
    const slipTotal = Math.round(validItems.reduce((sum, i) => sum + Number(i.qty) * Number(i.price), 0) * 100) / 100;
    if (slipTotal <= 0) {
      setError("Fiş toplam tutarı 0'dan büyük olmalıdır.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await addTransaction(cariId, {
        kind: "satis",
        items: validItems.map((i) => ({
          name: i.name.trim(),
          quantity: Number(i.qty),
          unitPrice: Number(i.price),
          ...(i.productId ? { productId: i.productId } : {}),
        })),
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
        items: validItems.map((v) => ({ name: v.name.trim(), quantity: Number(v.qty), unitPrice: Number(v.price) })),
        createdAt: new Date().toISOString(),
      };

      if (onSuccess) onSuccess(createdTx);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fiş kesilemedi.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-stone-900 border border-stone-800 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative z-10 my-0 sm:my-8 max-h-[92vh] flex flex-col animate-slideUp">
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 font-serif text-base sm:text-lg">
                B2B Satış / Teslimat Fişi
              </h3>
              <p className="text-xs text-stone-400">{cariName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 bg-stone-800 rounded-xl text-stone-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Teslim Edilen Ürünler
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 py-1 px-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Kalem Ekle
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 bg-stone-950 rounded-2xl border border-stone-800 space-y-2.5"
                  >
                    {/* Product Selector Dropdown */}
                    <div className="space-y-1">
                      <select
                        value={item.productId || (item.name ? "__manual__" : "")}
                        onChange={(e) => handleProductSelect(item.id, e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500/50 appearance-none font-medium"
                      >
                        <option value="">Fırından Ürün Seçiniz...</option>
                        {allProducts.map((p) => {
                          const hasCustom = effectiveCustomPrices[p.id] !== undefined;
                          const pr = hasCustom ? effectiveCustomPrices[p.id] : p.price;
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} — {pr} ₺ {hasCustom ? "(Özel Fiyat)" : ""}
                            </option>
                          );
                        })}
                        <option value="__manual__">✍️ Listede Olmayan Özel Ürün Yaz...</option>
                      </select>

                      {/* Manual input if custom product or no product selected */}
                      {(!item.productId || item.productId === "__manual__") && (
                        <input
                          type="text"
                          placeholder="Ürün adı (Örn: Ekşi Mayalı Köy Ekmeği)"
                          value={item.name}
                          onChange={(e) => updateItemField(item.id, "name", e.target.value)}
                          className="w-full bg-stone-900/60 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50 mt-1.5"
                          required
                        />
                      )}
                    </div>

                    {/* Quantity, Unit Price, Total & Delete Row */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-stone-500 uppercase font-bold">Adet</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty || ""}
                          onChange={(e) => updateItemField(item.id, "qty", e.target.value)}
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm text-center font-mono font-bold text-stone-100 focus:outline-none focus:border-amber-500/50"
                          required
                        />
                      </div>

                      <div className="text-stone-600 text-xs pt-4 font-bold">×</div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-stone-500 uppercase font-bold">
                            Birim ₺
                          </label>
                          {item.isCustomPrice && (
                            <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5" /> Özel
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.price !== undefined ? item.price : ""}
                          onChange={(e) => updateItemField(item.id, "price", e.target.value)}
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm text-center font-mono font-bold text-stone-100 focus:outline-none focus:border-amber-500/50"
                          required
                        />
                      </div>

                      <div className="text-stone-600 text-xs pt-4 font-bold">=</div>

                      <div className="w-24 space-y-1">
                        <label className="text-[10px] text-stone-500 uppercase font-bold">Tutar</label>
                        <div className="w-full bg-stone-900/60 border border-stone-800/80 rounded-xl px-2 py-2 text-sm text-right font-mono font-bold text-amber-400">
                          {((Number(item.qty) || 0) * (Number(item.price) || 0)).toLocaleString("tr-TR")} ₺
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="p-2 text-stone-500 hover:text-rose-400 disabled:opacity-20 transition-colors pt-5"
                        title="Kalemi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400">Fiş Notu (Opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: Sabah 08:30 teslimatı..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Total Box */}
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <div className="text-xs text-stone-400 font-bold">Toplam Fiş Tutarı</div>
                <div className="text-[10px] text-stone-500">Müşteri borcuna eklenecektir</div>
              </div>
              <div className="text-2xl font-black font-mono text-amber-400">
                {totalAmount.toLocaleString("tr-TR")} ₺
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-sm font-bold transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={loading || totalAmount <= 0}
                className="flex-2 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 rounded-xl text-sm font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Receipt className="w-4 h-4" />
                    <span>Fişi Kes ve Borçlandır</span>
                  </>
                )}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
