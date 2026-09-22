"use client";

import React, { useState } from "react";
import { X, Wallet, Loader2 } from "lucide-react";
import { useCariler } from "@/hooks/useCariler";

interface B2BCollectionModalProps {
  cariId: string;
  cariName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function B2BCollectionModal({ cariId, cariName, onClose, onSuccess }: B2BCollectionModalProps) {
  const { addTransaction } = useCariler();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"nakit" | "banka_havale" | "kredi_karti">("banka_havale");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Geçerli bir tutar girin.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await addTransaction(cariId, {
        type: "tahsilat",
        amount: Number(amount),
        description: desc || "Tahsilat Alındı",
        paymentMethod: paymentMethod,
      });

      if (!res.success) {
        throw new Error(res.error || "Bir hata oluştu");
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-stone-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative border border-stone-800 animate-slideUp">
        <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 font-serif">Tahsilat Al</h3>
              <p className="text-[10px] text-stone-400">{cariName}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">{error}</div>}
          
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Tahsilat Tutarı (₺)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-2xl font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Ödeme Yöntemi</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "banka_havale", label: "Havale/EFT" },
                { id: "nakit", label: "Nakit" },
                { id: "kredi_karti", label: "Kredi Kartı" }
              ].map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id as any)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                    paymentMethod === pm.id 
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                      : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Açıklama / Not</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Örn: Ekim ayı faturasına istinaden"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-emerald-500 transition-colors min-h-[80px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-black rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tahsilatı Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}
