"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Receipt,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { CariAccount, CariTransaction } from "@/types/admin";

interface B2BSlipEditModalProps {
  tx: CariTransaction;
  cari: CariAccount;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditSlipItem {
  id: string;
  productId?: string;
  name: string;
  qty: number;
  price: number;
}

export default function B2BSlipEditModal({
  tx,
  cari,
  onClose,
  onSuccess,
}: B2BSlipEditModalProps) {
  const { allProducts } = useProducts();

  // Extract slip number
  const slipMatch = tx.description?.match(/\[(FİŞ-[^\]]+)\]/i);
  const slipNumber = tx.slipNumber || (slipMatch ? slipMatch[1] : "");

  // Parse notes and items
  const initialData = useMemo(() => {
    let cleanDesc = (tx.description || "")
      .replace(/\[FİŞ-[^\]]+\]\s*/gi, "")
      .replace(/^(Fiş|Sipariş):\s*/i, "")
      .trim();

    let noteText = "";
    if (cleanDesc.includes("| Not:")) {
      const parts = cleanDesc.split("| Not:");
      cleanDesc = parts[0].trim();
      noteText = parts[1].trim();
    }

    const itemStrings = cleanDesc.split(/,\s*(?=\d+x)/);
    const parsedItems: EditSlipItem[] = [];

    for (const raw of itemStrings) {
      const m = raw.trim().match(/^(\d+)x\s+(.*?)(?:\s*\(([\d.,]+)[₺TL\s]*\))?$/i);
      if (m) {
        const q = parseInt(m[1], 10);
        const n = m[2].trim();
        const p = m[3] ? parseFloat(m[3].replace(",", ".")) : (q > 0 ? Number(tx.amount) / q : Number(tx.amount));
        const matchedProd = allProducts.find(
          (prod) => prod.name.trim().toLowerCase() === n.toLowerCase()
        );

        parsedItems.push({
          id: Math.random().toString(36).substring(2, 9),
          productId: matchedProd?.id,
          name: n,
          qty: q,
          price: p,
        });
      }
    }

    if (parsedItems.length === 0) {
      parsedItems.push({
        id: "1",
        name: cleanDesc || "Toptan Satış",
        qty: 1,
        price: Number(tx.amount) || 0,
      });
    }

    return {
      items: parsedItems,
      note: noteText,
      date: tx.date ? new Date(tx.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    };
  }, [tx, allProducts]);

  const [items, setItems] = useState<EditSlipItem[]>(initialData.items);
  const [notes, setNotes] = useState<string>(initialData.note);
  const [date, setDate] = useState<string>(initialData.date);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  }, [items]);

  const oldAmount = Number(tx.amount) || 0;
  const diff = totalAmount - oldAmount;

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
    if (!selectedProductId || selectedProductId === "__manual__") {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, productId: undefined } : i
        )
      );
      return;
    }

    const foundProd = allProducts.find((p) => p.id === selectedProductId);
    if (!foundProd) return;

    // Check if there is an agreed custom price
    const customPrice = cari.customPrices?.[foundProd.id];
    const finalPrice = customPrice !== undefined ? customPrice : foundProd.price;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              productId: foundProd.id,
              name: foundProd.name,
              price: finalPrice,
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
        if (field === "price") return { ...i, price: Number(value) };
        return { ...i, name: String(value) };
      })
    );
  };

  // Submit Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(
      (i) => i.name.trim() !== "" && (Number(i.qty) || 0) > 0 && (Number(i.price) || 0) >= 0
    );

    if (validItems.length === 0) {
      setError("Lütfen en az bir geçerli ürün kalemi ekleyin.");
      return;
    }

    if (totalAmount <= 0) {
      setError("Fiş tutarı 0'dan büyük olmalıdır.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const itemsText = validItems
        .map((i) => `${i.qty}x ${i.name} (${i.price}₺)`)
        .join(", ");
      const finalDesc = notes.trim() ? `${itemsText} | Not: ${notes.trim()}` : itemsText;

      const res = await fetch("/api/admin/finans/transaction", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: tx.id,
          accountId: cari.id,
          amount: totalAmount,
          description: finalDesc,
          date,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Fiş güncellenemedi.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fiş güncellenemedi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Cancel / Delete Slip
  const handleDelete = async () => {
    const isConfirmed = window.confirm(
      `Bu fişi (${slipNumber || "Seçili fiş"}) tamamen iptal edip silmek istediğinize emin misiniz?\n\nFiş tutarı olan ${oldAmount.toLocaleString("tr-TR")} ₺ cari bakiyesinden eksiksiz geri alınacaktır.`
    );
    if (!isConfirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/finans/transaction?transactionId=${tx.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Fiş silinemedi.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fiş silinemedi.";
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-[#140F0B] border border-[#2E2219] w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative z-10 my-0 sm:my-8 max-h-[92vh] flex flex-col animate-slideUp">
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-5 border-b border-[#261E17] flex justify-between items-center bg-[#18130F] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-100 font-serif text-base sm:text-lg">
                  Fişi Düzenle
                </h3>
                {slipNumber && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    {slipNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">{cari.businessName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-stone-900 rounded-xl text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form View */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Fiş / Teslimat Tarihi</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Line Items */}
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
                <Plus className="w-3.5 h-3.5" />
                <span>Kalem Ekle</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 bg-stone-950 border border-stone-800 rounded-2xl space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs font-mono font-bold text-stone-500">
                      {idx + 1}.
                    </span>

                    {/* Product Selection */}
                    <div className="flex-1">
                      <select
                        value={item.productId || (item.name ? "__manual__" : "")}
                        onChange={(e) => handleProductSelect(item.id, e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 font-semibold focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="">Ürün Seçiniz...</option>
                        {allProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                        <option value="__manual__">✍️ Elle Özel Kalem Yaz</option>
                      </select>
                    </div>
                  </div>

                  {/* Manual Name (if manual) */}
                  {(!item.productId || item.productId === "__manual__") && (
                    <div className="pl-7">
                      <input
                        type="text"
                        placeholder="Ürün adı / açıklaması..."
                        value={item.name}
                        onChange={(e) => updateItemField(item.id, "name", e.target.value)}
                        className="w-full bg-stone-900/60 border border-stone-800/80 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  )}

                  {/* Quantity, Unit Price and Total */}
                  <div className="flex items-center gap-2 pl-7">
                    <div className="w-20 space-y-1">
                      <label className="text-[10px] text-stone-500 uppercase font-bold">Adet</label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty || ""}
                        onChange={(e) => updateItemField(item.id, "qty", e.target.value)}
                        className="w-full bg-stone-900/80 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-center font-mono font-bold text-stone-100 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>

                    <div className="text-stone-600 text-xs pt-4 font-bold">x</div>

                    <div className="w-24 space-y-1">
                      <label className="text-[10px] text-stone-500 uppercase font-bold">Fiyat (₺)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.price || ""}
                        onChange={(e) => updateItemField(item.id, "price", e.target.value)}
                        className="w-full bg-stone-900/80 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-right font-mono font-bold text-stone-100 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>

                    <div className="text-stone-600 text-xs pt-4 font-bold">=</div>

                    <div className="w-24 space-y-1">
                      <label className="text-[10px] text-stone-500 uppercase font-bold">Tutar</label>
                      <div className="w-full bg-stone-900/60 border border-stone-800/80 rounded-xl px-2 py-1.5 text-xs text-right font-mono font-bold text-amber-400">
                        {((Number(item.qty) || 0) * (Number(item.price) || 0)).toLocaleString("tr-TR")} ₺
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="p-2 text-stone-500 hover:text-rose-400 disabled:opacity-20 transition-colors pt-4"
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
              placeholder="Örn: Sabah teslimatı..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Amount Comparison Box */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs text-stone-400">
              <span>Eski Fiş Tutarı:</span>
              <span className="font-mono text-stone-300 font-bold">{oldAmount.toLocaleString("tr-TR")} ₺</span>
            </div>

            <div className="flex justify-between items-center text-sm font-bold text-stone-100 pt-1 border-t border-stone-800/80">
              <span>Yeni Fiş Tutarı:</span>
              <span className="text-xl font-black font-mono text-amber-400">
                {totalAmount.toLocaleString("tr-TR")} ₺
              </span>
            </div>

            {diff !== 0 && (
              <div className="text-[11px] pt-1 text-right font-mono">
                <span className="text-stone-400">Cari Bakiye Farkı: </span>
                <span className={`font-bold ${diff > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {diff > 0 ? `+${diff.toLocaleString("tr-TR")} ₺ (Borç Artacak)` : `${diff.toLocaleString("tr-TR")} ₺ (Borç Düşecek)`}
                </span>
              </div>
            )}
          </div>

          {/* Actions: Save & Cancel & Delete */}
          <div className="space-y-2 pt-2">
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || deleting}
                className="flex-1 py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs sm:text-sm font-bold transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={loading || deleting || totalAmount <= 0}
                className="flex-2 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 rounded-xl text-xs sm:text-sm font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Değişiklikleri Kaydet</span>
                  </>
                )}
              </button>
            </div>

            {/* Delete / Cancel Button */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Bu Fişi İptal Et ve Sil (Bakiyeden Geri Al)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
