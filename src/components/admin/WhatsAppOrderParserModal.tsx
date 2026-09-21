"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Sparkles,
  X,
  Check,
  Package,
  User,
  Phone,
  MapPin,
  DollarSign,
  AlertCircle,
  Copy,
} from "lucide-react";
import { BEYLIKDUZU_NEIGHBORHOODS, AdminPaymentMethod, AdminOrder } from "@/types/admin";
import { Product } from "@/types";

interface ParsedResult {
  customerName?: string;
  phone?: string;
  neighborhood?: string;
  deliveryAddress?: string;
  paymentMethod?: AdminPaymentMethod;
  quantities: Record<string, number>;
  orderNotes?: string;
  matchedItemsSummary: string[];
}

interface WhatsAppOrderParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  allOrders: AdminOrder[];
  onApply: (parsed: {
    customerName?: string;
    phone?: string;
    neighborhood?: string;
    deliveryAddress?: string;
    paymentMethod?: AdminPaymentMethod;
    quantities: Record<string, number>;
    orderNotes?: string;
  }) => void;
}

function normalizeTurkish(str: string): string {
  return str
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

export function WhatsAppOrderParserModal({
  isOpen,
  onClose,
  products,
  allOrders,
  onApply,
}: WhatsAppOrderParserModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) return;
    
    setIsParsing(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/orders/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Yapay Zeka ayrıştırma hatası");
      }

      const aiData = data.parsedOrder;
      
      // Match AI extracted items to our database products
      const matchedQuantities: Record<string, number> = {};
      const summary: string[] = [];

      if (Array.isArray(aiData.items)) {
        for (const item of aiData.items) {
          const aiName = item.productName || "";
          const qty = item.quantity || 1;
          
          if (!aiName) continue;
          
          // Find closest product in database
          const normAi = normalizeTurkish(aiName);
          let bestMatch: Product | null = null;
          
          for (const prod of products) {
            const normProd = normalizeTurkish(prod.name);
            if (normProd.includes(normAi) || normAi.includes(normProd)) {
              bestMatch = prod;
              break;
            }
          }
          
          if (bestMatch) {
            matchedQuantities[bestMatch.id] = (matchedQuantities[bestMatch.id] || 0) + qty;
            summary.push(`${qty}x ${bestMatch.name}`);
          } else {
            summary.push(`⚠️ Bulunamadı: ${qty}x ${aiName}`);
          }
        }
      }

      // Look up existing customer by AI parsed phone
      let knownAddress = aiData.addressDetail || "";
      let knownNeighborhood = aiData.neighborhood || "";
      let finalName = aiData.customerName || "";

      if (aiData.phone) {
        const cleanPhone = aiData.phone.replace(/\D/g, "");
        const formattedPhone = cleanPhone.startsWith("90")
          ? "0" + cleanPhone.substring(2)
          : cleanPhone.startsWith("0")
          ? cleanPhone
          : "0" + cleanPhone;

        const existingOrder = allOrders.find(
          (o) => (o.phone || "").replace(/\D/g, "") === formattedPhone.replace(/\D/g, "")
        );
        if (existingOrder) {
          if (!finalName) finalName = existingOrder.customerName;
          if (!knownAddress) knownAddress = existingOrder.deliveryAddress;
          if (!knownNeighborhood) knownNeighborhood = existingOrder.neighborhood;
        }
      }

      // Ensure neighborhood is strictly one of BEYLIKDUZU_NEIGHBORHOODS if mapped
      let strictNeighborhood = "";
      for (const n of BEYLIKDUZU_NEIGHBORHOODS) {
        if (normalizeTurkish(knownNeighborhood).includes(normalizeTurkish(n))) {
          strictNeighborhood = n;
          break;
        }
      }

      setParsed({
        customerName: finalName,
        phone: aiData.phone || "",
        deliveryAddress: knownAddress,
        neighborhood: strictNeighborhood,
        orderNotes: aiData.note || "",
        quantities: matchedQuantities,
        matchedItemsSummary: summary,
      });

    } catch (err: any) {
      console.error("AI Parse Error:", err);
      setErrorMsg(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleApply = () => {
    if (!parsed) return;
    onApply(parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-stone-100 text-lg flex items-center gap-2">
                <span>WhatsApp Sipariş Ayrıştırıcı</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-sans font-bold">
                  Akıllı
                </span>
              </h2>
              <p className="text-stone-400 text-xs">
                Müşteriden gelen ham mesajı yapıştırın, form alanları otomatik dolsun.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
            <span>WhatsApp Mesajını Buraya Yapıştırın:</span>
            <span className="text-[11px] text-stone-500 font-mono font-normal">
              İsim, tel, adres, ürün ve ödeme bilgisi otomatik algılanır
            </span>
          </label>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Örnek:\nSelam Tahsin Usta,\n2 karakılçık, 1 cevizli ekmek rica ediyorum.\nAdnan Kahveci Mah. Ihlamur Cad. No:14 D:6 Beylikdüzü\nKapıda nakit ödeyeceğim.\nAyşe Yılmaz 0532 123 45 67`}
            className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>

        {/* Action Button: Parse */}
        <div>
          <button
            onClick={handleParse}
            disabled={!rawText.trim() || isParsing}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 text-xs"
          >
            {isParsing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
                <span>Yapay Zeka Düşünüyor...</span>
              </span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Akıllı Yapıştır (AI)</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Parsed Preview Card */}
        {parsed && (
          <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Tespit Edilen Sipariş Bilgileri</span>
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                {Object.keys(parsed.quantities).length} Çeşit Ürün
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-0.5">
                <span className="text-[10px] text-stone-500 font-mono uppercase">Müşteri Adı:</span>
                <div className="font-bold text-stone-200">{parsed.customerName || "—"}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-0.5">
                <span className="text-[10px] text-stone-500 font-mono uppercase">Telefon:</span>
                <div className="font-mono text-stone-200">{parsed.phone || "—"}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-0.5">
                <span className="text-[10px] text-stone-500 font-mono uppercase">Mahalle:</span>
                <div className="font-bold text-amber-400">{parsed.neighborhood || "—"}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-0.5">
                <span className="text-[10px] text-stone-500 font-mono uppercase">Ödeme Türü:</span>
                <div className="font-bold text-stone-200">
                  {parsed.paymentMethod === "cash_on_delivery"
                    ? "💵 Kapıda Nakit"
                    : parsed.paymentMethod === "pos_at_door"
                    ? "💳 Kapıda POS"
                    : "🏦 Havale / EFT"}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-0.5 text-xs">
              <span className="text-[10px] text-stone-500 font-mono uppercase">Adres:</span>
              <div className="text-stone-300">{parsed.deliveryAddress || "—"}</div>
            </div>

            {/* Matched Items */}
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1 text-xs">
              <span className="text-[10px] text-stone-500 font-mono uppercase">
                Tespit Edilen Ürünler:
              </span>
              {parsed.matchedItemsSummary.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {parsed.matchedItemsSummary.map((sum, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] border border-amber-500/30"
                    >
                      {sum}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-stone-500 text-[11px]">Ürün adı tespit edilemedi.</div>
              )}
            </div>

            {parsed.orderNotes && (
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 text-[11px] italic">
                <strong>Notlar:</strong> {parsed.orderNotes}
              </div>
            )}

            {/* Apply Button */}
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Bu Bilgilerle Formu Otomatik Doldur</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
