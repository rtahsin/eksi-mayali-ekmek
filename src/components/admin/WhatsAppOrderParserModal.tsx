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

  if (!isOpen) return null;

  const handleParse = () => {
    if (!rawText.trim()) return;

    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const normFull = normalizeTurkish(rawText);

    // 1. Phone number extraction
    let extractedPhone = "";
    const phoneRegex = /(?:(?:\+?90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2})|(?:(?:\+?90|0)?5\d{9})/g;
    const phoneMatch = rawText.match(phoneRegex);
    if (phoneMatch && phoneMatch.length > 0) {
      const clean = phoneMatch[0].replace(/\D/g, "");
      extractedPhone = clean.startsWith("90")
        ? "0" + clean.substring(2)
        : clean.startsWith("0")
        ? clean
        : "0" + clean;
    }

    // 2. Neighborhood extraction
    let extractedNeighborhood = "";
    for (const n of BEYLIKDUZU_NEIGHBORHOODS) {
      if (normFull.includes(normalizeTurkish(n))) {
        extractedNeighborhood = n;
        break;
      }
    }

    // 3. Payment Method
    let extractedPayment: AdminPaymentMethod = "cash_on_delivery";
    if (normFull.includes("pos") || normFull.includes("kart") || normFull.includes("kredi")) {
      extractedPayment = "pos_at_door";
    } else if (normFull.includes("havale") || normFull.includes("eft") || normFull.includes("iban")) {
      extractedPayment = "transfer";
    } else if (normFull.includes("nakit")) {
      extractedPayment = "cash_on_delivery";
    }

    // 4. Products & Quantities extraction
    const extractedQuantities: Record<string, number> = {};
    const matchedSummaries: string[] = [];

    products.forEach((prod) => {
      const pNorm = normalizeTurkish(prod.name);
      // Keywords for this product
      const keywords: string[] = [];

      if (pNorm.includes("karakilcik")) keywords.push("karakilcik");
      else if (pNorm.includes("ceviz")) keywords.push("cevizli", "ceviz");
      else if (pNorm.includes("zeytin")) keywords.push("zeytinli", "zeytin");
      else if (pNorm.includes("siyez")) keywords.push("siyez");
      else if (pNorm.includes("cavdar")) keywords.push("cavdar");
      else if (pNorm.includes("koy")) keywords.push("koy ekmegi", "koy");
      else if (pNorm.includes("focaccia")) keywords.push("focaccia", "fokasya");
      else if (pNorm.includes("baget")) keywords.push("baget");
      else if (pNorm.includes("tost")) keywords.push("tost");
      else if (pNorm.includes("tam bugday")) keywords.push("tam bugday");
      else {
        // Fallback: first significant word of product name
        const firstWord = pNorm.split(" ")[0];
        if (firstWord.length >= 4) keywords.push(firstWord);
      }

      for (const kw of keywords) {
        if (normFull.includes(kw)) {
          // Look for quantity preceding or following keyword
          // E.g. "2 karakilcik", "2 adet karakilcik", "karakilcik 2 tane"
          const regexBefore = new RegExp(`(\\d+)\\s*(?:adet|tane|x)?\\s*(?:eksi\\s*mayali\\s*)?${kw}`, "i");
          const matchBefore = normFull.match(regexBefore);

          const regexAfter = new RegExp(`${kw}\\s*(\\d+)\\s*(?:adet|tane)?`, "i");
          const matchAfter = normFull.match(regexAfter);

          let qty = 1;
          if (matchBefore && matchBefore[1]) {
            qty = parseInt(matchBefore[1], 10);
          } else if (matchAfter && matchAfter[1]) {
            qty = parseInt(matchAfter[1], 10);
          }

          extractedQuantities[prod.id] = (extractedQuantities[prod.id] || 0) + qty;
          matchedSummaries.push(`${qty}x ${prod.name}`);
          break; // Stop checking other keywords for this product
        }
      }
    });

    // 5. Customer Name extraction
    let extractedName = "";
    // Check explicit name patterns: "İsim: Ahmet Yılmaz", "Ad: Ahmet", "Ben Ahmet Yılmaz"
    const nameMatch = rawText.match(/(?:isim|ad|ad\s*soyad|ben|musteri)\s*[:=-]?\s*([A-Za-zÇçĞğİıÖöŞşÜü\s]{3,30})/i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim().split("\n")[0].trim();
    } else {
      // Check last line if it looks like a name (2-3 capitalized words)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const words = line.split(/\s+/);
        if (
          words.length >= 2 &&
          words.length <= 3 &&
          !line.toLowerCase().includes("cad") &&
          !line.toLowerCase().includes("sok") &&
          !line.toLowerCase().includes("mah") &&
          !line.toLowerCase().includes("ekmek") &&
          !line.toLowerCase().includes("nakit")
        ) {
          extractedName = line.replace(/^[-\s]+/, "").trim();
          break;
        }
      }
    }

    // Past customer fallback if phone was matched
    if (extractedPhone && !extractedName) {
      const past = allOrders.find((o) => o.phone.replace(/\D/g, "").includes(extractedPhone.replace(/\D/g, "")));
      if (past) {
        extractedName = past.customerName;
      }
    }

    // 6. Address extraction
    let extractedAddress = "";
    const addressLines = lines.filter((line) => {
      const n = normalizeTurkish(line);
      return (
        n.includes("cad") ||
        n.includes("sok") ||
        n.includes("no:") ||
        n.includes("no ") ||
        n.includes("daire") ||
        n.includes("kat") ||
        n.includes("sitesi") ||
        n.includes("blok") ||
        n.includes("apt") ||
        n.includes("apartman") ||
        n.includes("mah")
      );
    });

    if (addressLines.length > 0) {
      extractedAddress = addressLines.join(", ");
    } else if (extractedPhone) {
      // Fallback from past orders
      const past = allOrders.find((o) => o.phone.replace(/\D/g, "").includes(extractedPhone.replace(/\D/g, "")));
      if (past) {
        extractedAddress = past.deliveryAddress;
        if (!extractedNeighborhood && past.neighborhood) {
          extractedNeighborhood = past.neighborhood;
        }
      }
    }

    // 7. Notes extraction
    const noteMatches: string[] = [];
    if (normFull.includes("dilim")) noteMatches.push("Ekmekler dilimlenecek");
    if (normFull.includes("zile basma")) noteMatches.push("Zile basmayın");
    if (normFull.includes("kapiya")) noteMatches.push("Kapıya bırakın");
    if (normFull.includes("bebek")) noteMatches.push("Bebek uyuyor, sessiz teslimat");

    setParsed({
      customerName: extractedName,
      phone: extractedPhone,
      neighborhood: extractedNeighborhood || "Adnan Kahveci",
      deliveryAddress: extractedAddress,
      paymentMethod: extractedPayment,
      quantities: extractedQuantities,
      orderNotes: noteMatches.join(", "),
      matchedItemsSummary: matchedSummaries,
    });
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
            type="button"
            onClick={handleParse}
            disabled={!rawText.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            <span>Metni Analiz Et & Bilgileri Çıkar ✨</span>
          </button>
        </div>

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
