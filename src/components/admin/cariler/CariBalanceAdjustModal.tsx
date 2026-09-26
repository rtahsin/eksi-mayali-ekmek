"use client";

import React, { useState } from "react";
import { X, CheckCircle2, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CariAccount } from "@/types/admin";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cari: CariAccount;
  onSuccess: () => void;
}

export function CariBalanceAdjustModal({ isOpen, onClose, cari, onSuccess }: Props) {
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState<string>("Devir / Bakiye Düzeltme");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client error");

      const { data: res, error: rpcError } = await supabase.rpc("record_cari_transaction_atomic", {
        p_account_id: cari.id,
        p_amount: Math.abs(Number(amount)),
        p_type: Number(amount) >= 0 ? "devir" : "odeme",
        p_description: description,
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Kayıt hatası");
      }
      const result = res as { success?: boolean; error?: string } | null;
      if (!result?.success) {
        throw new Error(result?.error || "Kayıt hatası");
      }

      onSuccess();
      setAmount("");
      setDescription("Devir / Bakiye Düzeltme");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      alert("Hata: " + message);
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
            <DollarSign className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-stone-100 font-serif text-base">Bakiye Düzeltme / Devir</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs text-stone-400">
            <strong>Kural:</strong> Pozitif değer (+) girerseniz cari borçlanır (Bakiye artar). Negatif değer (-) girerseniz cari alacaklanır (Bakiye azalır).
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300">Tutar (₺)</label>
            <input
              type="number"
              required
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Örn: 500 veya -500"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-lg font-bold font-mono text-amber-400 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300">Açıklama</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold">
              Vazgeç
            </button>
            <button type="submit" disabled={submitting || amount === ""} className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? "Güncelleniyor..." : "Kaydet"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
