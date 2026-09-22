"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ArrowDownRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CariAccount } from "@/types/admin";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cari: CariAccount;
  onSuccess: () => void;
}

export function CariCollectionModal({ isOpen, onClose, cari, onSuccess }: Props) {
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState<string>("Banka Havalesi");
  const [type, setType] = useState<"tahsilat" | "odeme">("tahsilat");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client error");

      const { data: res, error: rpcError } = await supabase.rpc("adjust_cari_balance", {
        p_account_id: cari.id,
        p_amount: Number(amount),
        p_type: type,
        p_description: description,
      });

      if (rpcError || !res?.success) {
        throw new Error(rpcError?.message || res?.error || "Kayıt hatası");
      }

      onSuccess();
      setAmount("");
      setDescription("Banka Havalesi");
      setType("tahsilat");
    } catch (err: any) {
      alert("Hata: " + err.message);
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
            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-stone-100 font-serif text-base">Tahsilat / Müşteriye Ödeme</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300">İşlem Yönü</label>
            <div className="flex bg-stone-950 rounded-xl p-1 border border-stone-800">
              <button
                type="button"
                onClick={() => setType("tahsilat")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  type === "tahsilat" ? "bg-emerald-500 text-stone-950" : "text-stone-400 hover:text-stone-300"
                }`}
              >
                Biz Tahsil Ettik (Bakiye Düşer)
              </button>
              <button
                type="button"
                onClick={() => setType("odeme")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  type === "odeme" ? "bg-rose-500 text-stone-950" : "text-stone-400 hover:text-stone-300"
                }`}
              >
                Biz Ödeme Yaptık (İade vb.)
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300">Tutar (₺)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Örn: 1500"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-lg font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300">Açıklama / Ödeme Yöntemi</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold">
              Vazgeç
            </button>
            <button type="submit" disabled={submitting || amount === ""} className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs transition-all disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? "Kaydediliyor..." : "Kaydet"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
