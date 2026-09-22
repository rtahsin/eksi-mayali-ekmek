"use client";

import React, { useState, useMemo } from "react";
import { X, Receipt, Plus, Trash2, Loader2 } from "lucide-react";
import { useCariler } from "@/hooks/useCariler";

interface B2BSlipModalProps {
  cariId: string;
  cariName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SlipItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export default function B2BSlipModal({ cariId, cariName, onClose, onSuccess }: B2BSlipModalProps) {
  const { addTransaction } = useCariler();
  const [items, setItems] = useState<SlipItem[]>([
    { id: "1", name: "", qty: 1, price: 0 }
  ]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  }, [items]);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), name: "", qty: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof SlipItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validItems = items.filter(i => i.name.trim() !== "" && i.qty > 0 && i.price > 0);
    if (validItems.length === 0) {
      setError("En az bir geçerli kalem girmelisiniz (isim, adet ve fiyat dolu olmalı).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Format description for the transaction
      const itemsText = validItems.map(i => `${i.qty}x ${i.name} (${i.price}₺)`).join(", ");
      const finalDesc = notes ? `${itemsText} | Not: ${notes}` : itemsText;

      const res = await addTransaction(cariId, {
        type: "satis", // Satis = Borçlandırma (Bakiye artar)
        amount: totalAmount,
        description: finalDesc,
        paymentMethod: "diger" // It's a slip, no cash involved yet
      });

      if (!res.success) {
        throw new Error(res.error || "Fiş kesilemedi");
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-stone-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative border border-stone-800 my-8">
        <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-artisan-terracotta/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-artisan-terracotta" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 font-serif">B2B Fiş Kes / Satış</h3>
              <p className="text-[10px] text-stone-400">{cariName}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">{error}</div>}
          
          <div className="space-y-3">
            <div className="flex justify-between items-end mb-2">
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Satış Kalemleri</label>
              <button type="button" onClick={addItem} className="text-xs text-artisan-terracotta hover:text-white flex items-center gap-1 font-bold">
                <Plus className="w-3 h-3" /> Kalem Ekle
              </button>
            </div>
            
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center bg-stone-950 p-2 rounded-xl border border-stone-800">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Ürün (Örn: Ekşi Mayalı Ekmek)"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      className="w-full bg-transparent text-sm text-stone-200 focus:outline-none px-2 py-1"
                      required
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      placeholder="Adet"
                      value={item.qty || ""}
                      onChange={(e) => updateItem(item.id, "qty", Number(e.target.value))}
                      className="w-full bg-stone-900 border border-stone-800 rounded text-sm text-stone-200 text-center focus:outline-none focus:border-stone-600 py-1"
                      min="1"
                      required
                    />
                  </div>
                  <div className="text-stone-500 text-xs">x</div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Fiyat ₺"
                      value={item.price || ""}
                      onChange={(e) => updateItem(item.id, "price", Number(e.target.value))}
                      className="w-full bg-stone-900 border border-stone-800 rounded text-sm text-stone-200 text-center focus:outline-none focus:border-stone-600 py-1"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="p-1.5 text-stone-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Genel Not</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Fiş ile ilgili notlar..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-artisan-terracotta transition-colors min-h-[60px]"
            />
          </div>

          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex justify-between items-center mt-4">
            <div className="text-sm font-bold text-stone-400">Genel Toplam:</div>
            <div className="text-2xl font-black font-mono text-stone-100">{totalAmount.toLocaleString("tr-TR")} ₺</div>
          </div>

          <button
            type="submit"
            disabled={loading || totalAmount <= 0}
            className="w-full py-4 bg-artisan-terracotta hover:bg-orange-600 disabled:bg-stone-800 disabled:text-stone-500 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Fişi Kes ve Borçlandır"}
          </button>
        </form>
      </div>
    </div>
  );
}
