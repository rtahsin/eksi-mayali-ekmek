"use client";

import React, { useRef, useState } from "react";
import { X, MessageCircle, Download, ExternalLink, Receipt, Loader2, Check } from "lucide-react";
import { CariAccount, CariTransaction } from "@/types/admin";
import html2canvas from "html2canvas";
import Link from "next/link";

interface TransactionReceiptModalProps {
  tx: CariTransaction;
  cari: CariAccount;
  onClose: () => void;
}

function getItemFallbackImage(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("ekmek") || lower.includes("mayalı") || lower.includes("baget") || lower.includes("somun") || lower.includes("siyez") || lower.includes("karakılçık")) {
    return "/images/categories/bread.jpg";
  }
  if (lower.includes("süt") || lower.includes("peynir") || lower.includes("tereyağ") || lower.includes("mandıra") || lower.includes("jersey")) {
    return "/images/categories/dairy.jpg";
  }
  if (lower.includes("tatlı") || lower.includes("kurabiye") || lower.includes("çörek") || lower.includes("pasta")) {
    return "/images/categories/desserts.jpg";
  }
  if (lower.includes("kahve") || lower.includes("içecek") || lower.includes("çay") || lower.includes("meyve")) {
    return "/images/categories/beverages.jpg";
  }
  return "/images/categories/default.jpg";
}

interface ParsedItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export default function TransactionReceiptModal({ tx, cari, onClose }: TransactionReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const isDebt = tx.type === "satis";
  const amount = Number(tx.amount) || 0;
  const curBal = Number(cari.balance) || 0;
  const prevBal = isDebt ? curBal - amount : curBal + amount;

  // Extract slip number
  const slipMatch = tx.description?.match(/\[(FİŞ-[^\]]+)\]/i);
  const slipNo = tx.slipNumber || (slipMatch ? slipMatch[1] : `FİŞ-${tx.id.substring(0, 6).toUpperCase()}`);

  // Parse items from description
  const cleanDesc = (tx.description || "")
    .replace(/\[FİŞ-[^\]]+\]\s*/gi, "")
    .replace(/^(Fiş|Sipariş):\s*/i, "")
    .split("| Not:")[0]
    .trim();

  const itemStrings = cleanDesc.split(/,\s*(?=\d+x)/);
  const items: ParsedItem[] = [];

  for (const raw of itemStrings) {
    const m = raw.trim().match(/^(\d+)x\s+(.*?)(?:\s*\(([\d.,]+)[₺TL\s]*\))?$/i);
    if (m) {
      const q = parseInt(m[1], 10);
      const n = m[2].trim();
      const p = m[3] ? parseFloat(m[3].replace(",", ".")) : (q > 0 ? amount / q : amount);
      items.push({ name: n, qty: q, price: p, total: q * p });
    }
  }

  if (items.length === 0 && cleanDesc) {
    items.push({ name: cleanDesc, qty: 1, price: amount, total: amount });
  }

  const generateCanvas = async () => {
    if (!receiptRef.current) return null;
    return await html2canvas(receiptRef.current, {
      scale: 2,
      backgroundColor: "#140F0B",
      logging: false,
      useCORS: true,
      allowTaint: true,
    });
  };

  const handleDownloadPNG = async () => {
    try {
      setDownloading(true);
      const canvas = await generateCanvas();
      if (!canvas) return;

      const link = document.createElement("a");
      const safeName = cari.businessName.replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `EkmekLab_${slipNo}_${safeName}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Görsel oluşturulamadı:", error);
      alert("Görsel oluşturulurken bir hata oluştu.");
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsApp = async () => {
    setSharing(true);
    const ekstreUrl = `https://ekmeklab.tr/ekstre/${cari.id}`;
    const fisUrl = `https://ekmeklab.tr/fis/${tx.id}`;
    const totalStr = amount.toLocaleString("tr-TR") + " ₺";
    const curBalStr = curBal.toLocaleString("tr-TR") + " ₺";

    const text =
      `🍞 *EKMEKLAB TAŞ FIRIN - ${isDebt ? "TESLİMAT FİŞİ" : "TAHSİLAT MAKBUZU"}*\n` +
      `Sayın *${cari.businessName}*,\n\n` +
      `📋 *Belge No:* ${slipNo}\n` +
      `📅 *Tarih:* ${new Date(tx.createdAt || tx.date).toLocaleDateString("tr-TR")}\n` +
      `💰 *İşlem Tutarı:* ${totalStr}\n` +
      `📊 *Güncel Kalan Bakiye:* ${curBalStr}\n\n` +
      `🔗 *Online Fiş Görüntüle:* ${fisUrl}\n` +
      `📈 *Tüm Geçmiş Alış & Ödemeleriniz:* ${ekstreUrl}\n\n` +
      `Bizi tercih ettiğiniz için teşekkür eder, bereketli işler dileriz! 🌾`;

    try {
      const canvas = await generateCanvas();
      if (canvas && navigator.share && navigator.canShare) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (blob) {
          const file = new File([blob], `EkmekLab_${slipNo}.png`, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `EkmekLab Fiş - ${cari.businessName}`,
              text: text,
            });
            setSharing(false);
            return;
          }
        }
      }

      // Fallback: download PNG & open WhatsApp Web
      if (canvas) {
        const link = document.createElement("a");
        link.download = `EkmekLab_${slipNo}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }

      let phoneClean = (cari.phone || "").replace(/\D/g, "");
      if (phoneClean && !phoneClean.startsWith("90")) {
        phoneClean = phoneClean.startsWith("0") ? `9${phoneClean}` : `90${phoneClean}`;
      }

      const waUrl = phoneClean
        ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

      window.open(waUrl, "_blank");
    } catch (err) {
      console.warn("Share notice:", err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn overflow-y-auto pt-16 pb-16">
      
      {/* Receipt Card */}
      <div 
        ref={receiptRef}
        className="bg-[#140F0B] text-stone-200 p-6 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] border border-[#2E2219] rounded-3xl w-full max-w-[400px] relative shrink-0"
      >
        <div className="absolute top-4 right-4 html2canvas-ignore">
          <button
            onClick={onClose}
            className="p-2 bg-stone-900/80 rounded-full text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-4 pt-1">
          <div className="w-36 h-16 flex items-center justify-center">
            <img src="/logo/logo.png" alt="EkmekLab" className="w-full h-full object-contain" />
          </div>
          <div className="text-[10px] font-serif font-bold text-amber-400 tracking-wide mt-1 uppercase">
            Zanaatkar Taş Fırın · Beylikdüzü
          </div>
          <div className="text-[10px] font-mono text-stone-400 mt-0.5">
            Tel: 0501 012 66 53
          </div>
        </div>

        <div className="w-full border-t border-dashed border-stone-800 my-3.5" />

        {/* Meta Info */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-baseline">
            <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">Müşteri</span>
            <span className="font-bold text-stone-100 text-right truncate max-w-[220px]">{cari.businessName}</span>
          </div>

          {cari.contactPerson && (
            <div className="flex justify-between items-baseline">
              <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">Yetkili</span>
              <span className="text-stone-300 text-right">{cari.contactPerson}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline">
            <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">Fiş No</span>
            <span className="font-mono font-bold text-amber-400 text-right">{slipNo}</span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">Tarih</span>
            <span className="font-mono text-stone-300 text-right">{new Date(tx.createdAt || tx.date).toLocaleDateString("tr-TR")}</span>
          </div>
        </div>

        <div className="w-full border-t border-dashed border-stone-800 my-3.5" />

        {/* Line Items */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex justify-between">
            <span>{isDebt ? "Teslim Edilen Ürünler" : "Tahsilat Açıklaması"}</span>
            <span>Tutar</span>
          </div>

          {items.map((it, idx) => {
            const fallback = getItemFallbackImage(it.name);
            return (
              <div key={idx} className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-stone-900 border border-stone-800 shrink-0 overflow-hidden flex items-center justify-center">
                  <img src={fallback} alt={it.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-stone-100 text-xs leading-snug">
                    <span className="text-amber-400 font-mono mr-1">{it.qty} Adet</span>
                    <span>{it.name}</span>
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {it.qty} x {it.price.toLocaleString("tr-TR")} ₺
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-stone-100 text-xs">
                    {it.total.toLocaleString("tr-TR")} ₺
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-full border-t border-dashed border-stone-800 my-3.5" />

        {/* This Slip Total */}
        <div className="flex justify-between items-center py-1">
          <span className="font-serif font-bold text-xs text-stone-200">
            {isDebt ? "BU FİŞ TUTARI" : "TAHSİLAT TUTARI"}
          </span>
          <span className="font-mono font-black text-base text-amber-400">
            {amount.toLocaleString("tr-TR")} ₺
          </span>
        </div>

        <div className="w-full border-t-2 border-dashed border-stone-700 my-3.5" />

        {/* Cumulative Balance Card */}
        <div className="bg-[#1C1510] border border-[#2F231A] rounded-2xl p-3 space-y-1.5 text-xs">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            Hesap Durumu (Cari Bakiye)
          </div>
          <div className="flex justify-between items-center text-stone-400">
            <span>Önceki Bakiye:</span>
            <span className="font-mono text-stone-300">{prevBal.toLocaleString("tr-TR")} ₺</span>
          </div>
          <div className="flex justify-between items-center text-stone-400">
            <span>İşlem Tutarı:</span>
            <span className="font-mono text-amber-400 font-semibold">
              {isDebt ? `+${amount.toLocaleString("tr-TR")}` : `-${amount.toLocaleString("tr-TR")}`} ₺
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-stone-800 font-bold">
            <span className="text-stone-100">GÜNCEL BAKİYE:</span>
            <span className="font-mono text-sm font-black text-amber-400">
              {curBal.toLocaleString("tr-TR")} ₺
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-5 pb-1 text-center text-xs text-stone-400 space-y-1">
          <div className="italic font-serif text-stone-300 text-[11px]">
            Bizi tercih ettiğiniz için teşekkür ederiz.
          </div>
          <div className="text-[9px] text-stone-500 font-mono tracking-widest uppercase">
            EkmekLab Taş Fırın · Bereketli İşler
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col gap-2 w-full max-w-[400px]">
        <button
          onClick={handleWhatsApp}
          disabled={sharing}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs shadow-lg shadow-emerald-950/40 active:scale-95 transition-all disabled:opacity-50"
        >
          {sharing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Görsel Hazırlanıyor...</span>
            </>
          ) : (
            <>
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp İle Paylaş (PNG + Ekstre Linki)</span>
            </>
          )}
        </button>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="flex items-center justify-center gap-1.5 p-3 bg-[#18130F] hover:bg-[#221A14] text-stone-200 font-bold rounded-xl text-xs border border-[#2E2219] shadow active:scale-95 transition-all disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Download className="w-4 h-4 text-amber-400" />}
            <span>Görseli İndir (PNG)</span>
          </button>

          <a
            href={`/fis/${tx.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 p-3 bg-[#18130F] hover:bg-[#221A14] text-stone-200 font-bold rounded-xl text-xs border border-[#2E2219] shadow active:scale-95 transition-all"
          >
            <ExternalLink className="w-4 h-4 text-amber-400" />
            <span>Online Fişi Aç</span>
          </a>
        </div>

        <Link
          href={`/ekstre/${cari.id}`}
          target="_blank"
          className="flex items-center justify-between p-3 bg-[#18130F] hover:bg-[#201711] border border-[#2E2219] rounded-xl text-xs text-stone-300 font-medium transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Müşterinin Canlı Ekstresi</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
        </Link>
      </div>

    </div>
  );
}
