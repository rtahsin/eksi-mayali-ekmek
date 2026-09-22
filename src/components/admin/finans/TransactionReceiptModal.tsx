"use client";

import React, { useRef, useState } from "react";
import { X, Share2, Download, Printer, Check } from "lucide-react";
import { CariAccount, CariTransaction } from "@/types/admin";
import html2canvas from "html2canvas";

interface TransactionReceiptModalProps {
  tx: CariTransaction;
  cari: CariAccount;
  onClose: () => void;
}

export default function TransactionReceiptModal({ tx, cari, onClose }: TransactionReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDebt = tx.type === "satis";

  const handleDownloadPNG = async () => {
    if (!receiptRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#120E0B",
        logging: false,
        useCORS: true,
      });
      
      const link = document.createElement("a");
      link.download = `EkmekLab_${isDebt ? "Satis" : "Tahsilat"}_${cari.businessName.replace(/\s+/g, '_')}_${tx.date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Görsel oluşturulamadı:", error);
      alert("Görsel oluşturulurken bir hata oluştu.");
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsApp = () => {
    // Generate text message for WhatsApp
    const typeLabel = isDebt ? "Satış / Fiş" : "Tahsilat / Ödeme";
    const amountStr = tx.amount.toLocaleString("tr-TR") + " TL";
    const dateStr = new Date(tx.createdAt || tx.date).toLocaleString("tr-TR");
    
    let text = `*EkmekLab B2B İşlem Özeti*\n\n`;
    text += `Müşteri: ${cari.businessName}\n`;
    text += `İşlem Türü: ${typeLabel}\n`;
    text += `Tarih: ${dateStr}\n`;
    text += `Tutar: *${amountStr}*\n`;
    if (tx.description) {
      text += `Açıklama: ${tx.description}\n`;
    }
    text += `\nGüncel Bakiye: ${Math.abs(cari.balance).toLocaleString("tr-TR")} TL ${cari.balance > 0 ? "(Bize Borcunuz)" : "(Alacağınız)"}\n\n`;
    text += `Bizi tercih ettiğiniz için teşekkür ederiz.`;

    const encoded = encodeURIComponent(text);
    // If phone exists, use it, else open picker
    let phoneStr = cari.phone ? cari.phone.replace(/\D/g, "") : "";
    if (phoneStr && !phoneStr.startsWith("90")) {
      phoneStr = "90" + phoneStr;
    }
    
    const url = phoneStr ? `https://wa.me/${phoneStr}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto pt-20 pb-20">
      
      {/* Receipt Card */}
      <div 
        ref={receiptRef}
        className="bg-[#120E0B] text-stone-200 p-6 sm:p-8 shadow-2xl border border-[#261E17] rounded-lg w-full max-w-[380px] relative shrink-0"
      >
        <div className="absolute top-4 right-4">
          <button onClick={onClose} className="p-2 bg-stone-900 rounded-full text-stone-500 hover:text-stone-200 opacity-50 html2canvas-ignore">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6 mt-4">
          <div className="w-40 h-16 flex items-center justify-center font-black font-serif text-2xl text-stone-100">
            EKMEKLAB<span className="text-amber-500">.</span>
          </div>
          <div className="text-[10px] text-stone-400 font-medium uppercase tracking-widest mt-1">
            Kurumsal İşlem Fişi
          </div>
        </div>

        <div className="w-full border-t border-dashed border-stone-800 my-4" />

        {/* Meta Info */}
        <div className="grid grid-cols-[90px_1fr] gap-y-1 text-xs font-semibold text-stone-300">
          <div className="text-stone-500 uppercase">Müşteri</div>
          <div className="text-right text-stone-100">{cari.businessName}</div>
          
          <div className="text-stone-500 uppercase">Tarih</div>
          <div className="text-right font-mono text-stone-400">{new Date(tx.createdAt || tx.date).toLocaleString("tr-TR")}</div>

          <div className="text-stone-500 uppercase">İşlem</div>
          <div className="text-right text-stone-100">{isDebt ? "Satış (Borçlandırma)" : "Tahsilat (Alacaklandırma)"}</div>
        </div>

        <div className="w-full border-t border-dashed border-stone-800 my-4" />

        {/* Detail */}
        <div className="min-h-[80px]">
          <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-2">Açıklama / Kalemler</div>
          <div className="text-sm text-stone-300 whitespace-pre-wrap leading-relaxed">
            {tx.description || "-"}
          </div>
        </div>

        <div className="w-full border-t border-stone-700 border-2 my-4" />

        {/* Total & Balance */}
        <div className="flex justify-between items-center text-xl font-bold text-stone-100 mb-4">
          <div>İŞLEM TUTARI</div>
          <div className={`font-mono ${isDebt ? "text-rose-400" : "text-emerald-400"}`}>
            {tx.amount.toLocaleString("tr-TR")} TL
          </div>
        </div>

        <div className="bg-stone-900 rounded-lg p-3 flex justify-between items-center text-sm font-semibold border border-stone-800">
          <div className="text-stone-400">GÜNCEL BAKİYE</div>
          <div className="font-mono text-amber-500">{Math.abs(cari.balance).toLocaleString("tr-TR")} TL</div>
        </div>

        {/* Footer */}
        <div className="pt-8 pb-2 text-center text-[10px] text-stone-500 font-semibold space-y-2">
          <div className="tracking-widest opacity-80 uppercase">Sadece Bilgilendirme Amaçlıdır</div>
          <div className="text-stone-600">Bizi tercih ettiğiniz için teşekkür ederiz.</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-[380px]">
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 p-3.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-bold rounded-xl text-sm border border-[#25D366]/30 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span>WhatsApp'tan At</span>
        </button>
        
        <button
          onClick={handleDownloadPNG}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2 p-3.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 font-bold rounded-xl text-sm border border-amber-500/30 transition-colors"
        >
          {downloading ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
          <span>{downloading ? "İndirildi" : "Görsel (PNG) İndir"}</span>
        </button>
      </div>
    </div>
  );
}
