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

  // Generate canvas for screenshot / sharing
  const generateReceiptCanvas = async () => {
    if (!receiptCardRef.current) return null;
    return await html2canvas(receiptCardRef.current, {
      scale: 2,
      backgroundColor: "#140F0B",
      logging: false,
      useCORS: true,
      allowTaint: true,
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

  return (
    <div className="min-h-screen bg-[#0A0705] py-6 sm:py-12 px-3 flex flex-col items-center font-sans text-stone-200 selection:bg-amber-500/30 selection:text-amber-300">
      
      {/* Main Thermal / Luxury Receipt Card Container */}
      <div className="w-full max-w-[420px] relative pb-6">
        
        {/* Receipt Card */}
        <div
          ref={receiptCardRef}
          id="receipt-card"
          className="relative bg-[#140F0B] text-stone-200 p-6 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] border border-[#2E2219] rounded-3xl overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none"
        >
          {/* Subtle Top Accent Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 opacity-80 print:hidden" />

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

          {/* Receipt Meta Details */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px] shrink-0">
                Tarih
              </span>
              <span className="font-mono text-stone-200 text-right font-medium">
                {formatDateTime(slip.date, slip.createdAt)}
              </span>
            </div>

            <div className="flex justify-between items-start gap-2">
              <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px] shrink-0 pt-0.5">
                Müşteri
              </span>
              <span className="font-bold text-stone-100 text-right break-words text-sm flex-1">
                {slip.businessName}
              </span>
            </div>
          </div>

          <div className="w-full border-t border-[#261E17] my-3.5" />

          {/* Items List */}
          {slip.isProductSale === false ? (
            /* Devir / Tahsilat / Non-product: No broken image boxes! */
            <div className="space-y-2">
              {slip.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-2.5 px-3 bg-[#18130F] rounded-xl border border-[#261E17]"
                >
                  <div className="font-medium text-stone-200 text-xs sm:text-[13px]">
                    {it.name}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-amber-400 text-xs sm:text-[13px]">
                      {it.totalPrice.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Actual Product Sale: Clean list with thumbnails */
            <div className="space-y-3">
              {slip.items.map((it, idx) => {
                const fallbackImg = getItemFallbackImage(it.name);
                const imgSrc = it.imageUrl || fallbackImg;

                return (
                  <div key={idx} className="flex items-center gap-3">
                    {/* Thumbnail Image */}
                    <div className="w-11 h-11 rounded-xl bg-stone-900 border border-stone-800 shrink-0 overflow-hidden shadow-inner flex items-center justify-center print:border-stone-300">
                      <img
                        src={imgSrc}
                        alt={it.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = fallbackImg;
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Name, Quantity & Price */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-100 text-xs sm:text-[13px] leading-snug">
                        <span className="text-amber-400 font-mono mr-1.5">{it.quantity} Adet</span>
                        <span>{it.name}</span>
                        {it.weight && (
                          <span className="text-[10px] text-stone-400 font-normal ml-1">
                            ({it.weight}g)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                        {it.quantity} x {it.unitPrice.toLocaleString("tr-TR")} ₺
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-stone-100 text-xs sm:text-[13px]">
                        {it.totalPrice.toLocaleString("tr-TR")} ₺
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="w-full border-t border-[#261E17] my-3.5" />

          {/* Quantity & Item Count Summary (if product sale) */}
          {slip.isProductSale !== false && slip.items.length > 0 && (
            <div className="flex justify-between items-center text-stone-400 text-xs pb-1.5">
              <span className="text-[11px]">Toplam Kalem / Miktar</span>
              <span className="font-mono font-medium text-stone-300">
                {slip.items.length} çeşit • {totalQuantity} adet
              </span>
            </div>
          )}

          {/* Toplam */}
          <div className="flex justify-between items-center py-1">
            <span className="font-serif font-bold text-sm text-stone-100 uppercase tracking-wide">
              TOPLAM
            </span>
            <span className="font-mono font-black text-lg text-amber-400">
              {slip.totalAmount.toLocaleString("tr-TR")} ₺
            </span>
          </div>

          <div className="w-full border-t border-[#261E17] my-3.5" />

          {/* Running Balance Card (Option A: Cumulative Balance) */}
          <div className="bg-[#1C1510] border border-[#2F231A] rounded-2xl p-3.5 space-y-2 print:bg-stone-50 print:border-stone-300">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Hesap Durumu (Cari Bakiye)
            </div>

            <div className="flex justify-between items-center text-xs text-stone-400">
              <span>Önceki Bakiye:</span>
              <span className="font-mono text-stone-300">
                {prevBalanceVal.toLocaleString("tr-TR")} ₺
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-stone-400">
              <span>İşlem Tutarı:</span>
              <span className="font-mono text-amber-400 font-semibold">
                {slip.isPositiveDelta !== false ? "+" : "-"}{slip.totalAmount.toLocaleString("tr-TR")} ₺
              </span>
            </div>

            <div className="flex justify-between items-center pt-1.5 border-t border-stone-800 text-xs font-bold print:border-stone-300">
              <span className="text-stone-100">GÜNCEL TOPLAM BAKİYE:</span>
              <span className="font-mono text-base font-black text-amber-400">
                {currentTotalBalance.toLocaleString("tr-TR")} ₺
              </span>
            </div>
          </div>

          {slip.notes && (
            <div className="mt-3 p-2.5 rounded-xl bg-stone-900/50 border border-stone-800 text-[11px] text-stone-400">
              <span className="font-bold text-stone-300 mr-1">Not:</span>
              <span>{slip.notes}</span>
            </div>
          )}

          {/* Closing Warm Bakery Note */}
          <div className="pt-6 pb-2 text-center text-xs text-stone-400 space-y-1">
            <div className="italic font-serif text-stone-300">
              Bizi tercih ettiğiniz için teşekkür ederiz.
            </div>
            <div className="text-[10px] text-stone-500 font-mono tracking-widest uppercase">
              EkmekLab Taş Fırın · Bereketli İşler
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
