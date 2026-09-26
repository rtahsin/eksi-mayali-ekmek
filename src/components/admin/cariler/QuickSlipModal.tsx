"use client";

import React, { useState, useMemo } from "react";
import { Plus, Minus, X, CheckCircle2, Gift, Package, FileText } from "lucide-react";
import { Product } from "@/types";
import { CariAccount } from "@/types/admin";
import { createClient } from "@/lib/supabase/client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cari: CariAccount;
  activeProducts: Product[];
  onSuccess: (orderId: string, slipNumber: string) => void;
}

export function QuickSlipModal({ isOpen, onClose, cari, activeProducts, onSuccess }: Props) {
  const [slipQuantities, setSlipQuantities] = useState<Record<string, number>>({});
  const [slipFreeItems, setSlipFreeItems] = useState<Record<string, boolean>>({});
  const [slipStaleReturn, setSlipStaleReturn] = useState<number>(0);
  const [slipDiscount, setSlipDiscount] = useState<number>(0);
  const [slipPaymentCollected, setSlipPaymentCollected] = useState<number>(0);
  const [slipPaymentMethod, setSlipPaymentMethod] = useState<"nakit" | "kredi_karti" | "banka_havale">("nakit");
  const [slipDate, setSlipDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [slipCustomerName, setSlipCustomerName] = useState<string>(cari.businessName || "");
  const [slipCustomerAddress, setSlipCustomerAddress] = useState<string>(cari.address || "");
  const [submitting, setSubmitting] = useState(false);

  // Derived calculations
  const { quickSlipTotal, rawSlipSubtotal, hasAnyQuantity } = useMemo(() => {
    let subtotal = 0;
    let hasQty = false;

    activeProducts.forEach((prod) => {
      const qty = slipQuantities[prod.id] || 0;
      if (qty > 0) hasQty = true;

      const isFree = slipFreeItems[prod.id];
      if (!isFree) {
        const customPrice = cari?.customPrices?.[prod.id];
        const activePrice = customPrice !== undefined ? customPrice : prod.price;
        subtotal += qty * activePrice;
      }
    });

    const finalTotal = Math.max(0, subtotal - slipStaleReturn - slipDiscount);
    return { quickSlipTotal: finalTotal, rawSlipSubtotal: subtotal, hasAnyQuantity: hasQty };
  }, [slipQuantities, slipFreeItems, slipStaleReturn, slipDiscount, activeProducts, cari]);

  const updateQuantity = (productId: string, delta: number) => {
    setSlipQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const toggleFreeItem = (productId: string) => {
    setSlipFreeItems((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSlipTotal < 0) return alert("Toplam tutar 0'dan küçük olamaz.");
    if (!hasAnyQuantity) return alert("En az 1 ürün seçmelisiniz.");

    setSubmitting(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client error");

      const generatedOrderId = `ord_${Date.now()}`;
      const generatedSlipNumber = `FİŞ-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Prepare items array to save in description
      const slipItemsObj = activeProducts
        .filter((p) => (slipQuantities[p.id] || 0) > 0)
        .map((p) => {
          const qty = slipQuantities[p.id] || 0;
          const isFree = slipFreeItems[p.id];
          const cPrice = cari.customPrices?.[p.id];
          const activePrice = isFree ? 0 : cPrice !== undefined ? cPrice : p.price;
          return `${p.name} (x${qty}) = ${qty * activePrice} ₺`;
        });

      let descLines = [`Fiş: ${generatedSlipNumber}`];
      descLines.push(`Ürünler: ${slipItemsObj.join(", ")}`);
      if (slipStaleReturn > 0) descLines.push(`Bayat İade/Fire Düşüldü: -${slipStaleReturn} ₺`);
      if (slipDiscount > 0) descLines.push(`Genel İskonto/Yuvarlama: -${slipDiscount} ₺`);

      // 2. Adjust balance using Atomic RPC (Single Source of Truth)
      const { data: res, error: rpcError } = await supabase.rpc("record_cari_transaction_atomic", {
        p_account_id: cari.id,
        p_amount: quickSlipTotal,
        p_type: "satis",
        p_description: descLines.join(" | "),
        p_order_id: generatedOrderId,
        p_slip_number: generatedSlipNumber,
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Kayıt hatası");
      }
      const result = res as { success?: boolean; error?: string } | null;
      if (!result?.success) {
        throw new Error(result?.error || "Kayıt hatası");
      }

      // 3. (Optional) If payment is collected right away
      if (Number(slipPaymentCollected) > 0) {
        const { error: payRpcErr } = await supabase.rpc("record_cari_transaction_atomic", {
          p_account_id: cari.id,
          p_amount: Number(slipPaymentCollected),
          p_type: "tahsilat",
          p_description: `Teslimatta Anında Tahsilat - ${generatedSlipNumber} (${slipPaymentMethod})`,
          p_payment_method: slipPaymentMethod,
          p_order_id: generatedOrderId,
        });
        if (payRpcErr) {
          console.error("Tahsilat RPC hatası:", payRpcErr);
        }
      }

      // Success
      onSuccess(generatedOrderId, generatedSlipNumber);
      
      // Reset form
      setSlipQuantities({});
      setSlipFreeItems({});
      setSlipStaleReturn(0);
      setSlipDiscount(0);
      setSlipPaymentCollected(0);
      
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      alert("Hata: " + message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden">
      <div className="bg-stone-900 border border-stone-800 w-full max-w-2xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 font-serif text-lg leading-tight">
                Hızlı Fiş & Teslimat
              </h3>
              <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                Cari: {cari.businessName}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form id="quick-slip-form" onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">Tarih</label>
              <input
                type="date"
                required
                value={slipDate}
                onChange={(e) => setSlipDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-500 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">Teslim Alan / Şube</label>
              <input
                type="text"
                value={slipCustomerName}
                onChange={(e) => setSlipCustomerName(e.target.value)}
                placeholder="Örn: Mutfak Şefi Ahmet"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-stone-300 uppercase tracking-wider">Ekmek & Ürün Seçimi</span>
              <span className="text-[10px] text-amber-400 font-medium">Özel Fiyatlar Aktif</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {activeProducts.map((prod) => {
                const qty = slipQuantities[prod.id] || 0;
                const customPrice = cari.customPrices?.[prod.id];
                const activePrice = customPrice !== undefined ? customPrice : prod.price;
                const isFree = slipFreeItems[prod.id];

                return (
                  <div
                    key={prod.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      qty > 0 ? "bg-amber-500/10 border-amber-500/40" : "bg-stone-950/60 border-stone-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-stone-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-200 truncate">{prod.name}</div>
                        <div className="text-[10px] flex items-center gap-1.5 font-mono mt-0.5">
                          {isFree ? (
                            <span className="text-purple-400 font-bold">🎁 İkram</span>
                          ) : (
                            <><span className="text-amber-400 font-bold">{activePrice} ₺</span>
                              {customPrice !== undefined && <span className="text-stone-600 line-through">{prod.price}₺</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                      {qty > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleFreeItem(prod.id)}
                          className={`px-1.5 h-7 rounded-lg text-[10px] font-bold flex items-center gap-0.5 ${
                            isFree ? "bg-purple-600 text-white" : "bg-stone-800 text-stone-400"
                          }`}
                        >
                          <Gift className="w-2.5 h-2.5" />
                        </button>
                      )}
                      <button type="button" onClick={() => updateQuantity(prod.id, -1)} disabled={qty === 0} className="w-7 h-7 bg-stone-800 text-stone-300 rounded flex items-center justify-center disabled:opacity-30">
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qty || ""}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          if(val===0){
                             const copy = {...slipQuantities}; delete copy[prod.id]; setSlipQuantities(copy);
                          } else {
                             setSlipQuantities({...slipQuantities, [prod.id]: val});
                          }
                        }}
                        className="w-10 h-7 bg-stone-950 border border-stone-700 rounded text-center text-xs font-bold outline-none focus:border-amber-500"
                      />
                      <button type="button" onClick={() => updateQuantity(prod.id, 1)} className="w-7 h-7 bg-amber-500 text-stone-950 rounded flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-stone-950 border border-stone-800 rounded-xl">
            <div>
              <label className="text-[10px] font-semibold text-rose-400 mb-1 block">Bayat İadesi/Fire (-₺)</label>
              <input
                type="number"
                min="0"
                value={slipStaleReturn || ""}
                onChange={(e) => setSlipStaleReturn(Number(e.target.value) || 0)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs font-mono text-rose-400 outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-amber-400 mb-1 block">Genel İskonto (-₺)</label>
              <input
                type="number"
                min="0"
                value={slipDiscount || ""}
                onChange={(e) => setSlipDiscount(Number(e.target.value) || 0)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-400 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl space-y-2">
            <label className="text-[10px] font-semibold text-emerald-400 flex items-center justify-between">
              <span>Teslimatta Anında Yapılan Tahsilat (Opsiyonel)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={slipPaymentCollected || ""}
                onChange={(e) => setSlipPaymentCollected(Number(e.target.value) || 0)}
                placeholder="Örn: 200"
                className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 outline-none focus:border-emerald-500"
              />
              <select
                value={slipPaymentMethod}
                onChange={(e) => setSlipPaymentMethod(e.target.value as any)}
                className="w-28 bg-stone-900 border border-stone-800 rounded-lg px-2 py-2 text-xs text-stone-300 outline-none"
              >
                <option value="nakit">Nakit</option>
                <option value="kredi_karti">Kredi Kartı / POS</option>
                <option value="banka_havale">Havale / EFT</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer (Fixed at bottom) */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-stone-950 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-stone-400">Genel Toplam:</div>
            <div className="text-2xl font-black font-mono text-amber-400">{quickSlipTotal.toLocaleString("tr-TR")} ₺</div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-stone-800 text-stone-300 rounded-xl text-sm font-bold"
            >
              İptal
            </button>
            <button
              type="submit"
              form="quick-slip-form"
              disabled={submitting || !hasAnyQuantity || quickSlipTotal < 0}
              className="flex-[2] py-3 px-4 bg-amber-500 text-stone-950 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{submitting ? "Kaydediliyor..." : "Fişi Kaydet & Bakiyeye Ekle"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
