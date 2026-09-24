"use client";

import React, { useRef, useState } from "react";
import {
  X,
  MessageCircle,
  Download,
  ExternalLink,
  Receipt,
  Loader2,
  Check,
  Calendar,
  User,
  Package,
  BarChart2,
  Phone,
} from "lucide-react";
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

function formatDateTime(dateStr?: string, createdAtStr?: string): { date: string; time: string } {
  const target = createdAtStr || dateStr;
  if (!target) return { date: "", time: "" };
  try {
    const d = new Date(target);
    if (isNaN(d.getTime())) return { date: dateStr || "", time: "" };
    const date = d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date, time };
  } catch {
    return { date: dateStr || "", time: "" };
  }
}

export default function TransactionReceiptModal({ tx, cari, onClose }: TransactionReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const formattedDt = formatDateTime(tx.date, tx.createdAt);
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
    newBal = tx.balanceAfter !== undefined ? Number(tx.balanceAfter) : curBal;
    prevBal = newBal - amount;
    isPositiveDelta = true;
  } else {
    // tahsilat or odeme
    newBal = tx.balanceAfter !== undefined ? Number(tx.balanceAfter) : curBal;
    prevBal = newBal + amount;
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

    const modalContainer = receiptRef.current.closest(".overflow-y-auto") as HTMLElement | null;
    const prevModalScroll = modalContainer ? modalContainer.scrollTop : 0;
    const prevWindowScroll = window.scrollY;

    try {
      if (modalContainer) modalContainer.scrollTop = 0;
      window.scrollTo(0, 0);

      return await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#FBF9F5",
        logging: false,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (el) =>
          el.hasAttribute("data-html2canvas-ignore") ||
          el.classList.contains("html2canvas-ignore"),
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector('[data-receipt-card="true"]') as HTMLElement | null;
          if (el) {
            el.style.overflow = "visible";
          }
          clonedDoc.querySelectorAll("img").forEach((img) => {
            img.style.display = "inline-block";
          });
        },
      });
    } finally {
      if (modalContainer) modalContainer.scrollTop = prevModalScroll;
      window.scrollTo(0, prevWindowScroll);
    }
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
      let blob: Blob | null = null;
      if (canvas) {
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
      }

      // 1. Mobile Web Share API (Level 2: file + text as caption)
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `EkmekLab_${slipNo}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: text,
          });
          setSharing(false);
          return;
        }
      }

      // 2. Desktop / Web Fallback:
      // a) Copy PNG to system clipboard so user can press Ctrl+V in WhatsApp Web
      if (blob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
        } catch (clipErr) {
          console.warn("Clipboard write notice:", clipErr);
        }
      }

      // b) Download PNG
      if (canvas) {
        const link = document.createElement("a");
        link.download = `EkmekLab_${slipNo}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }

      // c) Open WhatsApp with text link
      let phoneClean = (cari.phone || "").replace(/\D/g, "");
      if (phoneClean && !phoneClean.startsWith("90")) {
        phoneClean = phoneClean.startsWith("0") ? `9${phoneClean}` : `90${phoneClean}`;
      }

      const waUrl = phoneClean
        ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

      window.open(waUrl, "_blank");

      // d) Show helpful feedback to user
      setToastMessage(
        "Fiş görseli panoya kopyalandı ve indirildi. WhatsApp açıldığında sohbete Ctrl+V (Yapıştır) yaparak görseli gönderebilirsiniz."
      );
      setTimeout(() => setToastMessage(null), 8000);
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
          data-receipt-card="true"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
          className="bg-[#FBF9F5] text-[#221610] p-5 sm:p-6 shadow-[0_20px_50px_rgba(34,22,16,0.12)] border border-[#EBE4D8] rounded-[28px] w-full relative"
        >
          {/* Header: Logo & Brand Information (Horizontal Alignment) */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-[74px] h-[74px] rounded-full overflow-hidden shrink-0 border border-[#E5DDCF] bg-white flex items-center justify-center p-0.5 shadow-sm">
              <img
                src="/logo/logo.png"
                alt="EkmekLAB"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[28px] font-black text-[#1E140F] tracking-tight leading-tight pb-0.5">
                EkmekLAB
              </h1>
              <div className="text-xs font-semibold text-[#63554D] tracking-[0.2em] uppercase mt-0.5 leading-normal">
                B e y l i k d ü z ü
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#3B2F28] mt-1 leading-normal">
                <Phone className="w-3.5 h-3.5 text-[#8A7A70]" />
                <span className="leading-normal pb-0.5">0501 012 66 53</span>
              </div>
            </div>
          </div>

          {/* Document Title & Slip Number Badge */}
          <div className="flex items-center justify-between gap-2 px-1 mb-3">
            <span
              className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                tx.type === "tahsilat"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : tx.type === "devir"
                  ? "bg-sky-50 text-sky-800 border-sky-200"
                  : "bg-[#F5EFE6] text-[#B45309] border-[#E8DFC8]"
              }`}
            >
              {tx.type === "tahsilat"
                ? "Tahsilat Makbuzu"
                : tx.type === "devir"
                ? "Devir / Düzeltme Makbuzu"
                : "Teslimat Fişi"}
            </span>
            <span className="font-mono text-xs font-bold text-[#8A7A70] bg-[#F5EFE6] px-2.5 py-0.5 rounded-lg border border-[#E8DFC8]">
              {slipNo}
            </span>
          </div>

          {/* Meta Info Box: Tarih & Müşteri */}
          <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-3 mb-3.5 shadow-sm grid grid-cols-2 divide-x divide-[#EBE4D8] items-center">
            {/* Tarih */}
            <div className="flex items-center gap-2 pr-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#F5EFE6] flex items-center justify-center text-[#5C4C42] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold text-[#8A7A70] tracking-wider uppercase leading-none mb-1">
                  TARİH
                </div>
                <div className="text-[11px] font-bold text-[#1E140F] leading-tight">
                  <span>{formattedDt.date}</span>
                  {formattedDt.time && (
                    <span className="text-[10px] text-[#7A6B62] font-semibold ml-1 whitespace-nowrap">
                      {formattedDt.time}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Müşteri */}
            <div className="flex items-center gap-2 pl-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#F5EFE6] flex items-center justify-center text-[#5C4C42] shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold text-[#8A7A70] tracking-wider uppercase leading-none mb-1">
                  MÜŞTERİ
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-[#1E140F] leading-tight break-words" title={cari.businessName}>
                  {cari.businessName}
                </div>
              </div>
            </div>
          </div>

          {/* Products or Tahsilat Summary Card */}
          <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-3.5 sm:p-4 mb-3.5 shadow-sm space-y-3">
            {tx.type === "tahsilat" ? (
              /* Dedicated Tahsilat View */
              <div className="space-y-3">
                <div className="bg-[#FAF7F2] border border-[#EBE4D8] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-[#8A7A70] uppercase tracking-wider">Tahsil Edilen Tutar:</span>
                    <span className="text-base sm:text-lg font-black text-emerald-800">
                      {amount.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                  {tx.paymentMethod && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#5C4C42]">Ödeme Şekli:</span>
                      <span className="font-bold text-[#1E140F]">
                        {tx.paymentMethod === "nakit"
                          ? "💵 Nakit"
                          : tx.paymentMethod === "banka_havale"
                          ? "🏦 Banka Havalesi / EFT"
                          : tx.paymentMethod === "kredi_karti"
                          ? "💳 Kredi Kartı / POS"
                          : tx.paymentMethod}
                      </span>
                    </div>
                  )}
                  {cleanDesc && cleanDesc !== "Tahsilat" && (
                    <div className="text-xs text-[#7A6B62] pt-1.5 border-t border-[#EBE4D8]/80">
                      <span className="font-medium">{cleanDesc}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#F0EAE0]" />

                {/* Tahsilat Toplam */}
                <div className="flex justify-between items-center pt-0.5 pb-0.5">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-800" />
                    <span className="font-black text-xs sm:text-sm text-emerald-900 tracking-wide uppercase leading-normal">
                      TAHSİLAT TOPLAMI
                    </span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-base sm:text-lg font-black text-emerald-800">
                    {amount.toLocaleString("tr-TR")} ₺
                  </div>
                </div>
              </div>
            ) : !isProductSale ? (
              /* Non-product: devir/düzeltme */
              <div className="space-y-3">
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2.5 px-3.5 bg-[#FBF9F5] rounded-xl border border-[#EBE4D8]"
                    >
                      <div className="font-bold text-[#1E140F] text-xs sm:text-sm leading-normal pb-0.5">
                        {it.name}
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="font-bold text-[#92400E] text-xs sm:text-sm leading-normal inline-block py-0.5">
                          {it.total.toLocaleString("tr-TR")} ₺
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#F0EAE0]" />

                {/* TOPLAM */}
                <div className="flex justify-between items-center pt-1.5 pb-0.5">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#1E140F]" />
                    <span className="font-black text-sm text-[#1E140F] tracking-wide uppercase leading-normal pb-0.5">
                      TOPLAM
                    </span>
                  </div>
                  <div className="bg-[#F5EFE6] px-4 py-2 rounded-xl text-base sm:text-lg font-black text-[#B45309] leading-normal flex items-center justify-center">
                    <span className="inline-block py-0.5 leading-normal">
                      {amount.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Product sale list */
              <div className="space-y-3">
                <div className="space-y-3">
                  {items.map((it, idx) => {
                    const fallback = getItemFallbackImage(it.name);
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[#EAE2D6] shadow-sm bg-[#F5EFE6]">
                          <img src={fallback} alt={it.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#B45309] leading-normal pb-0.5">
                            {it.qty} Adet
                          </div>
                          <div className="font-bold text-[#1E140F] text-xs sm:text-[13px] leading-snug break-words pb-0.5">
                            {it.name}
                          </div>
                          <div className="text-[11px] text-[#7A6B62] font-medium leading-normal inline-block py-0.5 mt-0.5">
                            {it.qty} x {it.price.toLocaleString("tr-TR")} ₺
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <span className="font-bold text-[#1E140F] text-sm sm:text-base leading-normal inline-block py-0.5">
                            {it.total.toLocaleString("tr-TR")} ₺
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-[#F0EAE0]" />

                {/* Toplam Kalem / Miktar */}
                <div className="flex justify-between items-center text-xs py-0.5">
                  <div className="flex items-center gap-2 text-[#5C4C42]">
                    <Package className="w-4 h-4 text-[#8A7A70]" />
                    <span className="leading-normal pb-0.5">Toplam Kalem / Miktar</span>
                  </div>
                  <span className="font-bold text-[#1E140F] leading-normal pb-0.5">
                    {items.length} çeşit • {items.reduce((s, i) => s + (i.qty || 1), 0)} adet
                  </span>
                </div>

                {/* TOPLAM */}
                <div className="flex justify-between items-center pt-1.5 pb-0.5">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#1E140F]" />
                    <span className="font-black text-sm text-[#1E140F] tracking-wide uppercase leading-normal pb-0.5">
                      TOPLAM
                    </span>
                  </div>
                  <div className="bg-[#F5EFE6] px-4 py-2 rounded-xl text-base sm:text-lg font-black text-[#B45309] leading-normal flex items-center justify-center">
                    <span className="inline-block py-0.5 leading-normal">
                      {amount.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Account Balance Card (Hesap Durumu - Cari Bakiye) */}
          <div className="bg-[#F8F4ED] border border-[#E8DFC8] rounded-2xl p-4 mb-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#EFE8DC] flex items-center justify-center text-[#5C4C42]">
                <BarChart2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-black text-[#1E140F] tracking-wider uppercase leading-normal pb-0.5">
                HESAP DURUMU (CARİ BAKİYE)
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-[#5C4C42] py-0.5">
              <span className="leading-normal">Önceki Bakiye:</span>
              <span className="font-bold text-[#1E140F] leading-normal inline-block py-0.5">
                {prevBal.toLocaleString("tr-TR")} ₺
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-[#5C4C42] py-0.5">
              <span className="leading-normal">
                {tx.type === "tahsilat"
                  ? "Tahsil Edilen Tutar (-):"
                  : tx.type === "devir"
                  ? "Düzeltme Tutarı:"
                  : "Fiş Tutarı (+):"}
              </span>
              <span
                className={`font-bold leading-normal inline-block py-0.5 ${
                  tx.type === "tahsilat" ? "text-emerald-800" : "text-[#92400E]"
                }`}
              >
                {tx.type === "tahsilat" ? "-" : isPositiveDelta ? "+" : "-"}
                {amount.toLocaleString("tr-TR")} ₺
              </span>
            </div>

            {/* Highlighted Current Balance Row */}
            <div className="bg-[#EFE8DD] rounded-xl px-4 py-3 flex items-center justify-between mt-1.5">
              <span className="text-xs font-bold text-[#1E140F] leading-normal pb-0.5">
                {tx.type === "tahsilat" ? "Kalan Güncel Borç:" : "Güncel Toplam Bakiye:"}
              </span>
              <span className="text-base sm:text-lg font-black text-[#B45309] leading-normal inline-block py-0.5">
                {newBal.toLocaleString("tr-TR")} ₺
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-1.5 pt-2 pb-2">
            {/* Centered Wheat Stalk SVG */}
            <div className="flex justify-center text-[#A89688] mb-1">
              <svg className="w-5 h-5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 22 16 8" />
                <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0 4.94Z" />
                <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
              </svg>
            </div>
            <div className="italic font-serif text-[#5C4C42] text-xs leading-normal pb-0.5">
              Bizi tercih ettiğiniz için teşekkür ederiz.
            </div>
            <div className="text-[10px] text-[#8A7A70] tracking-widest uppercase leading-normal pb-0.5">
              EKMEKLAB TAŞ FIRIN · BEREKETLİ İŞLER
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
              <span>WhatsApp İle Paylaş (PNG + Online Fiş)</span>
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

      {/* Floating Toast Notification (especially helpful on Desktop WhatsApp Web) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] bg-stone-900 border border-amber-500/40 text-stone-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs max-w-sm animate-slideUp">
          <Check className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-amber-400">Görsel Panoya Kopyalandı & İndirildi</p>
            <p className="text-[11px] text-stone-300 mt-0.5">
              WhatsApp açıldığında sohbete <span className="font-mono font-bold bg-stone-800 text-amber-300 px-1 py-0.5 rounded border border-stone-700">Ctrl + V</span> yaparak görseli ve linki birlikte gönderebilirsiniz.
            </p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
