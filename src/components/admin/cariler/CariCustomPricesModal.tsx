"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CariAccount } from "@/types/admin";
import { Product } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cari: CariAccount;
  activeProducts: Product[];
  onSuccess: () => void;
  initialProductId?: string;
  initialPrice?: number;
}

export function CariCustomPricesModal({
  isOpen,
  onClose,
  cari,
  activeProducts,
  onSuccess,
  initialProductId = "",
  initialPrice,
}: Props) {
  const [selectedProduct, setSelectedProduct] = useState<string>(initialProductId);
  const [customPrice, setCustomPrice] = useState<number | "">(initialPrice ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || customPrice === "") return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client error");

      const newPrices = {
        ...(cari.customPrices || {}),
        [selectedProduct]: Number(customPrice),
      };

      const { error } = await supabase
        .from("current_accounts")
        .update({ custom_prices: newPrices })
        .eq("id", cari.id);

      if (error) throw error;

      onSuccess();
    } catch (err: any) {
      alert("Fiyat güncellenirken hata oluştu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
        <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-stone-100 font-serif text-base">Özel Fiyat Tanımla</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300">Ürün Seçin</label>
            <select
              required
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="" disabled>Ürün seçiniz...</option>
              {activeProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Perakende: {p.price} ₺)</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300">Özel Toptan Birim Fiyatı (₺)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Örn: 90"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-lg font-bold font-mono text-amber-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold">
              Vazgeç
            </button>
            <button type="submit" disabled={submitting || !selectedProduct || customPrice === ""} className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? "Kaydediliyor..." : "Kaydet"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
