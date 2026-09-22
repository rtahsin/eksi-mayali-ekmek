"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Receipt,
  CheckCircle2,
  TrendingUp,
  Share2,
  Printer,
  Copy,
  Check,
  Store,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface SlipItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number;
}

interface SlipData {
  id: string;
  orderNumber?: string;
  businessName: string;
  contactPerson?: string;
  phone: string;
  address?: string;
  neighborhood?: string;
  taxNumber?: string;
  date: string;
  timeWindow?: string;
  items: SlipItem[];
  subtotal: number;
  totalAmount: number;
  // Balance details
  previousBalance?: number;
  paidAmount?: number;
  newBalance?: number;
  status?: string;
  history?: {
    id: string;
    date: string;
    type: "debt" | "credit";
    description: string;
    amount: number;
  }[];
}

export default function PublicReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [slip, setSlip] = useState<SlipData | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#120E0B] flex flex-col items-center justify-center p-4 text-stone-300">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-serif">Dijital Fiş Yükleniyor...</p>
      </div>
    );
  }

  if (!slip) {
    return (
      <div className="min-h-screen bg-[#120E0B] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-500 mb-4">
          <Receipt className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold font-serif text-stone-100 mb-2">Fiş Bulunamadı</h1>
        <p className="text-xs text-stone-400 max-w-sm mb-6">
          Aradığınız teslimat fişi bulunamadı veya bağlantı süresi dolmuş olabilir. Lütfen fırınımızla iletişime geçin.
        </p>
        <a
          href="tel:05010126653"
          className="px-5 py-2.5 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          <span>Fırını Ara (0501 012 66 53)</span>
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0806] py-6 sm:py-12 px-3 flex flex-col items-center font-sans text-stone-200">
      
      {/* 
        This is the main screenshot area. 
        We use the simple thermal receipt structure but with premium dark colors. 
      */}
      <div id="receipt-card" className="w-full max-w-[400px] relative pb-10 mt-4">
        
        <div className="relative bg-[#120E0B] text-stone-200 p-6 sm:p-8 shadow-2xl border border-[#261E17] rounded-lg">
          
          {/* Header: Logo & Brand */}
          <div className="flex flex-col items-center text-center space-y-2 mb-6">
            <div className="w-20 h-20 mb-1 rounded-full bg-[#F7EBD3] p-2 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
            </div>
            <div className="text-xl font-bold uppercase tracking-wider text-stone-100">
              EKMEKLAB ZANAATKAR FIRIN
            </div>
            <div className="text-xs text-stone-400 leading-tight font-medium">
              BEYLİKDÜZÜ / İSTANBUL -- 0501 012 66 53
            </div>
          </div>

          <div className="w-full border-t border-dashed border-stone-800 my-4" />

          {/* Receipt Meta */}
          <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm font-semibold uppercase text-stone-300">
            <div className="text-stone-500">MÜŞTERİ</div>
            <div className="text-right text-stone-100">{slip.businessName}</div>
            
            <div className="text-stone-500">TARİH</div>
            <div className="text-right font-mono">{slip.date}</div>
          </div>

          <div className="w-full border-t border-dashed border-stone-800 my-4" />

          {/* Items */}
          <div className="space-y-4">
            {slip.items.map((it, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-500 shrink-0">
                  {it.name.toLowerCase().includes("ekmek") || it.name.toLowerCase().includes("mayalı") ? (
                    <Store className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start font-semibold text-stone-200">
                    <span>{it.name} {it.weight && `(${it.weight}g)`}</span>
                    <span className="font-mono text-amber-400">{it.totalPrice.toLocaleString("tr-TR")} ₺</span>
                  </div>
                  <div className="text-xs text-stone-500 mt-1 font-mono">
                    {it.quantity} Adet x {it.unitPrice.toLocaleString("tr-TR")} ₺
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full border-t border-dashed border-stone-800 my-4" />

          {/* Subtotals */}
          <div className="flex justify-between items-center text-sm font-semibold text-stone-300">
            <div className="text-stone-500">Toplam Adet</div>
            <div className="text-right">{slip.items.reduce((sum, it) => sum + it.quantity, 0)}</div>
          </div>

          <div className="w-full border-t border-stone-700 border-2 my-3" />

          {/* Grand Total */}
          <div className="flex justify-between items-center text-lg font-bold text-stone-100">
            <div>TOPLAM</div>
            <div className="font-mono text-amber-400">{slip.totalAmount.toLocaleString("tr-TR")} TL</div>
          </div>

          <div className="w-full border-t border-dashed border-stone-800 my-4" />

          {/* Customer Info / Balances */}
          <div className="text-center font-bold text-base mb-4 text-stone-100 uppercase tracking-widest text-xs">Hesap Durumu</div>
          
          <div className="grid grid-cols-[120px_1fr] gap-y-2 text-sm font-semibold text-stone-300">
            <div className="text-stone-500">Önceki Bakiye</div>
            <div className="text-right font-mono text-stone-400">{(slip.previousBalance || 0).toLocaleString("tr-TR")} ₺</div>
            
            <div className="text-stone-500 text-base text-amber-500">Güncel Bakiye</div>
            <div className="text-right font-mono text-base text-amber-500">{(slip.newBalance || slip.totalAmount).toLocaleString("tr-TR")} ₺</div>
          </div>

          <div className="text-[11px] mt-5 text-stone-600">İşlem Yapan: Yönetici</div>

          {/* Footer / Stamp */}
          <div className="pt-8 pb-2 text-center text-xs text-stone-500 space-y-3 font-semibold">
            <div className="tracking-widest opacity-80">— AÇIKLAMALAR —</div>
            <div className="text-stone-400">Bizi Tercih Ettiğiniz İçin Teşekkürler</div>
            
            <div className="font-normal mt-4 opacity-70">Bu fiş bilgilendirme amaçlıdır.</div>
            <div className="italic text-stone-400">Bizi tercih ettiğiniz için teşekkürler!</div>
          </div>

        </div>

        {/* Action Buttons (Outside the card) */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 p-3.5 bg-stone-900 text-stone-200 font-bold rounded-xl text-sm border border-stone-800 shadow-sm active:scale-95 transition-transform hover:bg-stone-800"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-amber-400" />}
            <span>{copied ? "Link Kopyalandı" : "Fiş Linkini Kopyala"}</span>
          </button>
          
          <a
            href="https://wa.me/905010126653?text=Merhaba%2C%20EkmekLab%20teslimat%20fi%C5%9Fimizle%20ilgili%20yaz%C4%B1yorum."
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 p-3.5 bg-[#121E15] border border-emerald-900/50 hover:bg-[#16261A] text-emerald-400 font-bold rounded-xl text-sm shadow-sm active:scale-95 transition-transform"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Fırına Yaz</span>
          </a>
        </div>

      </div>
    </div>
  );
}
