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
  if (lower.includes("köy") || lower.includes("ekşi maya")) return "/images/products/koy-ekmegi.jpg";
  if (lower.includes("karakılçık") && lower.includes("un")) return "/images/products/karakilcik-unu.jpg";
  if (lower.includes("karakılçık")) return "/images/products/karakilcik.jpg";
  if (lower.includes("siyez") && lower.includes("kavılca")) return "/images/products/kavilca-siyez.jpg";
  if (lower.includes("siyez")) return "/images/products/siyez.jpg";
  if (lower.includes("yudane") || lower.includes("tost")) return "/images/products/yudane.jpg";
  if (lower.includes("özel") || lower.includes("cevizli")) return "/images/products/ekmeklab-ozel.jpg";
  if (lower.includes("incir")) return "/images/products/ceviz-incir.jpg";
  if (lower.includes("jersey") || lower.includes("süt")) return "/images/products/jersey-sut-3l.jpg";
  if (lower.includes("yoğurt")) return "/images/products/dogal-yogurt.jpg";
  if (lower.includes("tereyağ")) return "/images/products/koy-tereyagi.jpg";
  if (lower.includes("peynir") || lower.includes("mihaliç")) return "/images/products/mihalic-peyniri.jpg";
  if (lower.includes("kavurma")) return "/images/products/dana-kavurma.jpg";
  if (lower.includes("ekmek") || lower.includes("somun") || lower.includes("baget")) return "/images/products/koy-ekmegi.jpg";
  return "/images/categories/bread.jpg";
}

interface ParsedItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

function formatDateTime(dateStr?: string, createdAtStr?: string): string {
  const target = createdAtStr || dateStr;
  if (!target) return "";
  try {
    const d = new Date(target);
    if (isNaN(d.getTime())) return dateStr || "";
    return d.toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr || "";
  }
}

export default function TransactionReceiptModal({ tx, cari, onClose }: TransactionReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const amount = Number(tx.amount) || 0;
  const curBal = Number(cari.balance) || 0;
  let prevBal = 0;
  let newBal = Number(tx.balanceAfter ?? curBal);
  let isPositiveDelta = true;

  if (tx.type === "devir") {
    const eskiMatch = tx.description?.match(/Eski:\s*([\d.,]+)\s*₺/i);
    const yeniMatch = tx.description?.match(/Yeni:\s*([\d.,]+)\s*₺/i);
    if (eskiMatch && yeniMatch) {
      prevBal = parseFloat(eskiMatch[1].replace(/\./g, "").replace(",", "."));
      newBal = parseFloat(yeniMatch[1].replace(/\./g, "").replace(",", "."));
      isPositiveDelta = newBal >= prevBal;
    } else {
      prevBal = 0;
      newBal = amount;
      isPositiveDelta = true;
    }
  } else if (tx.type === "satis") {
    newBal = curBal;
    prevBal = curBal - amount;
    isPositiveDelta = true;
  } else {
    // tahsilat or odeme
    newBal = curBal;
    prevBal = curBal + amount;
    isPositiveDelta = false;
  }

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

  const isProductSale = tx.type === "satis" && items.length > 0;

  if (items.length === 0) {
    let defaultName = cleanDesc;
    if (!defaultName) {
      if (tx.type === "devir") defaultName = "Devir Bakiye Girişi";
      else if (tx.type === "tahsilat") defaultName = "Tahsilat";
      else if (tx.type === "odeme") defaultName = "Ödeme Çıkışı";
      else defaultName = "Finansal İşlem";
    }
    items.push({ name: defaultName, qty: 1, price: amount, total: amount });
  }

  const generateCanvas = async () => {
    if (!receiptRef.current) return null;
    return await html2canvas(receiptRef.current, {
      scale: 2,
      backgroundColor: "#140F0B",
      logging: false,
      useCORS: true,
      allowTaint: true,
      ignoreElements: (el) =>
        el.hasAttribute("data-html2canvas-ignore") ||
        el.classList.contains("html2canvas-ignore"),
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
    const fisUrl = `https://ekmeklab.tr/fis/${tx.id}`;
    const text = `Online Fiş Görüntüle: ${fisUrl}`;

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
      
      {/* Modal Container with close button outside receiptRef */}
      <div className="w-full max-w-[400px] relative shrink-0">
        
        {/* Close button outside receiptRef so html2canvas NEVER captures it */}
        <div className="absolute top-4 right-4 z-20" data-html2canvas-ignore="true">
          <button
            onClick={onClose}
            className="p-2 bg-stone-900/80 rounded-full text-stone-400 hover:text-white transition-colors shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Card */}
        <div 
          ref={receiptRef}
          className="bg-[#140F0B] text-stone-200 p-6 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] border border-[#2E2219] rounded-3xl w-full relative"
        >
          {/* Header: Logo & Clean Bakery Identity */}
          <div className="flex flex-col items-center text-center mb-4 pt-1">
            <div className="flex items-center justify-center mb-1">
              <img
                src="/logo/logo.png"
                alt="EkmekLAB"
                style={{
                  width: "135px",
                  height: "auto",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </div>
            <div className="text-[13px] font-bold text-amber-400 tracking-wide mt-1">
              EkmekLAB - Beylikdüzü
            </div>
            <div className="text-xs font-mono text-stone-300 mt-0.5">
              0501 012 66 53
            </div>
          </div>

          <div className="w-full border-t border-[#261E17] my-3.5" />

          {/* Meta Info */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px] shrink-0">
                Tarih
              </span>
              <span className="font-mono text-stone-200 text-right font-medium">
                {formatDateTime(tx.date, tx.createdAt)}
              </span>
            </div>

            <div className="flex justify-between items-start gap-2">
              <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px] shrink-0 pt-0.5">
                Müşteri
              </span>
              <span className="font-bold text-stone-100 text-right break-words text-sm flex-1">
                {cari.businessName}
              </span>
            </div>
          </div>

          <div className="w-full border-t border-[#261E17] my-3.5" />

          {/* Line Items */}
          {!isProductSale ? (
            /* Devir / Tahsilat / Non-product: No broken image boxes! */
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-2.5 px-3 bg-[#18130F] rounded-xl border border-[#261E17]"
                >
                  <div className="font-medium text-stone-200 text-xs sm:text-[13px]">
                    {it.name}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-amber-400 text-xs sm:text-[13px]">
                      {it.total.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Actual Product Sale: Clean list with thumbnails */
            <div className="space-y-3">
              {items.map((it, idx) => {
                const fallback = getItemFallbackImage(it.name);
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-stone-900 border border-stone-800 shrink-0 overflow-hidden flex items-center justify-center">
                      <img src={fallback} alt={it.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-100 text-xs sm:text-[13px] leading-snug">
                        <span className="text-amber-400 font-mono mr-1.5">{it.qty} Adet</span>
                        <span>{it.name}</span>
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                        {it.qty} x {it.price.toLocaleString("tr-TR")} ₺
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-stone-100 text-xs sm:text-[13px]">
                        {it.total.toLocaleString("tr-TR")} ₺
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="w-full border-t border-[#261E17] my-3.5" />

          {/* Toplam */}
          <div className="flex justify-between items-center py-1">
            <span className="font-serif font-bold text-sm text-stone-100 uppercase tracking-wide">
              TOPLAM
            </span>
            <span className="font-mono font-black text-lg text-amber-400">
              {amount.toLocaleString("tr-TR")} ₺
            </span>
          </div>

          <div className="w-full border-t border-[#261E17] my-3.5" />

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
                {isPositiveDelta ? `+${amount.toLocaleString("tr-TR")}` : `-${amount.toLocaleString("tr-TR")}`} ₺
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-stone-800 font-bold">
              <span className="text-stone-100">GÜNCEL BAKİYE:</span>
              <span className="font-mono text-sm font-black text-amber-400">
                {newBal.toLocaleString("tr-TR")} ₺
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
