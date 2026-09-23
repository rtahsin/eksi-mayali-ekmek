"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Receipt,
  Share2,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
  User,
  Package,
  BarChart2,
} from "lucide-react";
import Link from "next/link";
import html2canvas from "html2canvas";

interface SlipItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number;
  imageUrl?: string;
}

interface SlipData {
  id: string;
  orderNumber?: string;
  slipNumber?: string;
  businessName: string;
  contactPerson?: string;
  phone: string;
  address?: string;
  neighborhood?: string;
  taxNumber?: string;
  cariId?: string | null;
  date: string;
  createdAt?: string;
  isProductSale?: boolean;
  isPositiveDelta?: boolean;
  type?: string;
  timeWindow?: string;
  items: SlipItem[];
  subtotal: number;
  totalAmount: number;
  previousBalance?: number;
  paidAmount?: number;
  newBalance?: number;
  status?: string;
  notes?: string;
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

export default function PublicReceiptPage() {
  const params = useParams();
  const id = params?.id as string;
  const receiptCardRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [slip, setSlip] = useState<SlipData | null>(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchSlip = async () => {
      try {
        const res = await fetch(`/api/slip/${id}`);
        const data = await res.json();

        if (res.ok && data.success && data.data) {
          setSlip(data.data);
        } else {
          console.warn("Slip fetch notice:", data.error);
        }
      } catch (err) {
        console.warn("Slip fetch notice:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlip();
  }, [id]);

  const generateReceiptCanvas = async () => {
    if (!receiptCardRef.current) return null;
    return await html2canvas(receiptCardRef.current, {
      scale: 2,
      backgroundColor: "#FBF9F5",
      logging: false,
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: receiptCardRef.current.scrollWidth,
      windowHeight: receiptCardRef.current.scrollHeight,
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
  };

  // Download high-res PNG
  const handleDownloadPNG = async () => {
    if (!slip) return;
    try {
      setDownloading(true);
      const canvas = await generateReceiptCanvas();
      if (!canvas) return;

      const link = document.createElement("a");
      const safeName = slip.businessName.replace(/[^a-zA-Z0-9]/g, "_");
      const slipNum = slip.slipNumber || slip.orderNumber || "Fis";
      link.download = `EkmekLab_${slipNum}_${safeName}_${slip.date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Görsel indirme hatası:", err);
      alert("Görsel oluşturulurken bir hata oluştu.");
    } finally {
      setDownloading(false);
    }
  };

  // WhatsApp Share with PNG (via Web Share API or download + link)
  const handleWhatsAppShare = async () => {
    if (!slip) return;
    setSharing(true);

    const ekstreUrl = slip.cariId
      ? `https://ekmeklab.tr/ekstre/${slip.cariId}`
      : `https://ekmeklab.tr/fis/${slip.id}`;
    const fisUrl = `https://ekmeklab.tr/fis/${slip.id}`;
    const slipNum = slip.slipNumber || slip.orderNumber || "FİŞ";
    const totalStr = slip.totalAmount.toLocaleString("tr-TR") + " ₺";
    const newBalStr = (slip.newBalance ?? slip.totalAmount).toLocaleString("tr-TR") + " ₺";

    const shareCaption = `Online Fiş Görüntüle: ${fisUrl}`;

    try {
      const canvas = await generateReceiptCanvas();
      let blob: Blob | null = null;
      if (canvas) {
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
      }

      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `EkmekLab_${slipNum}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: shareCaption,
          });
          setSharing(false);
          return;
        }
      }

      // Fallback: Copy to clipboard, download PNG to gallery and open WhatsApp with caption
      if (blob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
        } catch (clipErr) {
          console.warn("Clipboard write notice:", clipErr);
        }
      }

      if (canvas) {
        const link = document.createElement("a");
        link.download = `EkmekLab_${slipNum}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }

      let phoneClean = slip.phone.replace(/\D/g, "");
      if (phoneClean && !phoneClean.startsWith("90")) {
        phoneClean = phoneClean.startsWith("0") ? `9${phoneClean}` : `90${phoneClean}`;
      }

      const waUrl = phoneClean
        ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(shareCaption)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(shareCaption)}`;

      window.open(waUrl, "_blank");

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

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0907] flex flex-col items-center justify-center p-4 text-stone-300">
        <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-serif text-amber-400/90 font-medium">Dijital Fiş Yükleniyor...</p>
      </div>
    );
  }

  if (!slip) {
    return (
      <div className="min-h-screen bg-[#0C0907] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#18130F] border border-[#2A201A] flex items-center justify-center text-amber-500 mb-4 shadow-xl">
          <Receipt className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold font-serif text-stone-100 mb-2">Fiş Bulunamadı</h1>
        <p className="text-xs text-stone-400 max-w-sm mb-6">
          Aradığınız teslimat fişi bulunamadı veya silinmiş olabilir. Lütfen fırınımızla iletişime geçiniz.
        </p>
        <a
          href="tel:05010126653"
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          <Phone className="w-4 h-4" />
          <span>Fırını Ara (0501 012 66 53)</span>
        </a>
      </div>
    );
  }

  const totalQuantity = slip.items.reduce((sum, it) => sum + it.quantity, 0);
  const slipDisplayNo = slip.slipNumber || slip.orderNumber || "FİŞ";
  const prevBalanceVal = slip.previousBalance ?? 0;
  const currentTotalBalance = slip.newBalance ?? slip.totalAmount;
  const formattedDt = formatDateTime(slip.date, slip.createdAt);

  return (
    <div className="min-h-screen bg-[#0A0705] py-6 sm:py-12 px-3 flex flex-col items-center font-sans text-stone-200 selection:bg-amber-500/30 selection:text-amber-300">
      
      {/* Main Thermal / Luxury Receipt Card Container */}
      <div className="w-full max-w-[420px] relative pb-6">
        
        {/* Receipt Card */}
        <div
          ref={receiptCardRef}
          id="receipt-card"
          data-receipt-card="true"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
          className="relative bg-[#FBF9F5] text-[#221610] p-5 sm:p-6 shadow-[0_20px_50px_rgba(34,22,16,0.12)] border border-[#EBE4D8] rounded-[28px] print:bg-white print:text-black print:border-none print:shadow-none"
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
                <div className="text-[11px] sm:text-xs font-bold text-[#1E140F] leading-tight break-words" title={slip.businessName}>
                  {slip.businessName}
                </div>
              </div>
            </div>
          </div>

          {/* Products & Summary Card */}
          <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-3.5 sm:p-4 mb-3.5 shadow-sm space-y-3">
            {/* Line Items */}
            {slip.isProductSale === false ? (
              /* Non-product: devir/tahsilat */
              <div className="space-y-2">
                {slip.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-2.5 px-3.5 bg-[#FBF9F5] rounded-xl border border-[#EBE4D8]"
                  >
                    <div className="font-bold text-[#1E140F] text-xs sm:text-sm leading-normal pb-0.5">
                      {it.name}
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="font-bold text-[#92400E] text-xs sm:text-sm leading-normal inline-block py-0.5">
                        {it.totalPrice.toLocaleString("tr-TR")} ₺
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Product sale list */
              <div className="space-y-3">
                {slip.items.map((it, idx) => {
                  const fallbackImg = getItemFallbackImage(it.name);
                  const imgSrc = it.imageUrl || fallbackImg;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[#EAE2D6] shadow-sm bg-[#F5EFE6]">
                        <img
                          src={imgSrc}
                          alt={it.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = fallbackImg;
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#B45309] leading-normal pb-0.5">
                          {it.quantity} Adet
                        </div>
                        <div className="font-bold text-[#1E140F] text-xs sm:text-[13px] leading-snug break-words pb-0.5">
                          {it.name}
                          {it.weight && (
                            <span className="text-[10px] text-[#7A6B62] font-normal ml-1">
                              ({it.weight}g)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#7A6B62] font-medium leading-normal inline-block py-0.5 mt-0.5">
                          {it.quantity} x {it.unitPrice.toLocaleString("tr-TR")} ₺
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="font-bold text-[#1E140F] text-sm sm:text-base leading-normal inline-block py-0.5">
                          {it.totalPrice.toLocaleString("tr-TR")} ₺
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-[#F0EAE0]" />

            {/* Toplam Kalem / Miktar */}
            <div className="flex justify-between items-center text-xs py-0.5">
              <div className="flex items-center gap-2 text-[#5C4C42]">
                <Package className="w-4 h-4 text-[#8A7A70]" />
                <span className="leading-normal pb-0.5">Toplam Kalem / Miktar</span>
              </div>
              <span className="font-bold text-[#1E140F] leading-normal pb-0.5">
                {slip.items.length} çeşit • {totalQuantity} adet
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
                  {slip.totalAmount.toLocaleString("tr-TR")} ₺
                </span>
              </div>
            </div>
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
                {prevBalanceVal.toLocaleString("tr-TR")} ₺
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-[#5C4C42] py-0.5">
              <span className="leading-normal">İşlem Tutarı:</span>
              <span className="font-bold text-[#92400E] leading-normal inline-block py-0.5">
                {slip.isPositiveDelta !== false ? "+" : "-"}{slip.totalAmount.toLocaleString("tr-TR")} ₺
              </span>
            </div>

            {/* Highlighted Current Balance Row */}
            <div className="bg-[#EFE8DD] rounded-xl px-4 py-3 flex items-center justify-between mt-1.5">
              <span className="text-xs font-bold text-[#1E140F] leading-normal pb-0.5">
                Güncel Toplam Bakiye:
              </span>
              <span className="text-base sm:text-lg font-black text-[#B45309] leading-normal inline-block py-0.5">
                {currentTotalBalance.toLocaleString("tr-TR")} ₺
              </span>
            </div>
          </div>

          {slip.notes && (
            <div className="mb-4 p-2.5 rounded-xl bg-white/70 border border-[#EBE4D8] text-[11px] text-[#5C4C42] leading-normal pb-0.5">
              <span className="font-bold text-[#1E140F] mr-1">Not:</span>
              <span>{slip.notes}</span>
            </div>
          )}

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

        {/* Action Buttons (Excluded from Screenshot) */}
        <div className="mt-5 space-y-2.5 print:hidden">
          
          {/* Main Primary Action: WhatsApp Share with PNG & Statement Link */}
          <button
            onClick={handleWhatsAppShare}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2.5 py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-emerald-950/40 active:scale-98 transition-all disabled:opacity-50"
          >
            {sharing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Görsel Hazırlanıyor...</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 stroke-[2.2]" />
                <span>WhatsApp İle Paylaş (PNG + Link)</span>
              </>
            )}
          </button>

          {/* Secondary Actions: Download PNG & Copy Link */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleDownloadPNG}
              disabled={downloading}
              className="flex items-center justify-center gap-2 p-3 bg-[#18130F] hover:bg-[#221A14] text-stone-200 font-bold rounded-xl text-xs border border-[#2E2219] shadow active:scale-95 transition-all disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Download className="w-4 h-4 text-amber-400" />
              )}
              <span>Görseli İndir (PNG)</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 p-3 bg-[#18130F] hover:bg-[#221A14] text-stone-200 font-bold rounded-xl text-xs border border-[#2E2219] shadow active:scale-95 transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-stone-400" />
              )}
              <span>{copied ? "Link Kopyalandı" : "Fiş Linkini Kopyala"}</span>
            </button>
          </div>

          {/* Live Customer Statement Link (Eski Alışlar / Ekstre) */}
          {slip.cariId && (
            <Link
              href={`/ekstre/${slip.cariId}`}
              className="flex items-center justify-between p-3.5 bg-[#18130F] hover:bg-[#201711] border border-[#2E2219] hover:border-amber-500/40 rounded-xl text-xs text-stone-300 font-medium transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>Müşterinin Canlı Ekstresi (Tüm Alış & Ödemeler)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 transition-colors" />
            </Link>
          )}

          {/* Thermal / Browser Print Button */}
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-stone-500 hover:text-stone-300 text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Termal / Kağıt Yazıcıdan Çıktı Al</span>
          </button>
        </div>

      </div>

      {/* Floating Toast Notification */}
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
