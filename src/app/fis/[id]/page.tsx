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
    <div className="min-h-screen bg-[#0A0806] text-stone-100 py-6 sm:py-12 px-3 flex flex-col items-center">
      
      {/* 
        This is the main screenshot area. 
        We use a specific width and premium dark aesthetic. 
      */}
      <div id="receipt-card" className="w-full max-w-md relative pb-10 mt-4">
        
        {/* Glow effect behind the card */}
        <div className="absolute inset-0 bg-artisan-gold/10 blur-[80px] rounded-[40px] pointer-events-none" />

        <div className="relative bg-[#120E0B] border border-[#261E17] rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Top Decorative Lip (Perforated/Gradient style) */}
          <div className="h-2 w-full bg-gradient-to-r from-artisan-terracotta via-amber-500 to-emerald-500" />
          
          <div className="p-6 sm:p-8 space-y-7">
            {/* Header: Logo & Brand */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#F7EBD3] p-2 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="font-serif text-2xl font-bold text-stone-100 leading-none">
                  Ekmek<span className="text-amber-400 italic">Lab</span>
                </div>
                <div className="text-[10px] font-mono tracking-widest text-amber-400/80 uppercase mt-1">
                  Resmi Dijital Fiş
                </div>
              </div>
            </div>

            {/* Receipt Meta (Date & No) */}
            <div className="flex items-end justify-between border-b border-stone-800/80 pb-4">
              <div className="space-y-0.5">
                <div className="text-[10px] text-stone-500 font-mono uppercase tracking-widest">Tarih / Saat</div>
                <div className="text-xs font-semibold text-stone-200 font-mono">
                  {slip.date} <span className="text-stone-600">|</span> {slip.timeWindow || "14:00-18:00"}
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <div className="text-[10px] text-stone-500 font-mono uppercase tracking-widest">Fiş No</div>
                <div className="text-xs font-semibold text-amber-400 font-mono">
                  #{slip.orderNumber}
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                <h2 className="text-lg font-bold text-stone-100 font-serif leading-tight">
                  {slip.businessName}
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-400 font-mono pl-6">
                {slip.phone && <div>📞 {slip.phone}</div>}
                {slip.taxNumber && <div>VN: {slip.taxNumber}</div>}
              </div>
              {slip.address && (
                <div className="pl-6 text-[11px] text-stone-500 leading-relaxed pt-1">
                  📍 {slip.address}
                </div>
              )}
            </div>

            {/* Dashed Separator */}
            <div className="w-full border-t-2 border-dashed border-stone-800" />

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-stone-500 font-mono uppercase tracking-widest">
                <span>Ürünler</span>
                <span>Tutar</span>
              </div>

              <div className="space-y-3">
                {slip.items.map((it, idx) => (
                  <div key={idx} className="flex items-start justify-between text-sm">
                    <div className="pr-2 leading-tight">
                      <span className="font-bold text-amber-400 font-mono mr-2">{it.quantity}x</span>
                      <span className="text-stone-200 font-medium">{it.name}</span>
                      {it.weight && <span className="text-stone-500 text-xs ml-1">({it.weight}g)</span>}
                      <div className="text-[11px] text-stone-500 font-mono mt-0.5 ml-6">
                        Birim: {it.unitPrice.toLocaleString("tr-TR")} ₺
                      </div>
                    </div>
                    <div className="font-mono font-bold text-stone-100 shrink-0">
                      {it.totalPrice.toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="w-full border-t-2 border-dashed border-stone-800" />

            {/* Totals & Balance (The climax of the receipt) */}
            <div className="bg-[#1A1410] -mx-6 px-6 py-5 space-y-4">
              
              {/* This Slip Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-300">Bu Fişin Toplamı:</span>
                <span className="font-mono font-bold text-amber-400 text-2xl">
                  {slip.totalAmount.toLocaleString("tr-TR")} ₺
                </span>
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-stone-700 to-transparent opacity-50" />

              {/* Balance Mini-Table */}
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div className="text-stone-400">Önceki Bakiye:</div>
                <div className="text-right font-mono text-stone-300">{(slip.previousBalance || 0).toLocaleString("tr-TR")} ₺</div>
                
                <div className="text-stone-400">Yapılan Ödeme:</div>
                <div className="text-right font-mono text-emerald-400">-{(slip.paidAmount || 0).toLocaleString("tr-TR")} ₺</div>
                
                <div className="text-stone-200 font-bold mt-1 pt-1 border-t border-stone-800">GÜNCEL BAKİYE:</div>
                <div className="text-right font-mono font-bold text-amber-400 text-base mt-1 pt-1 border-t border-stone-800">
                  {(slip.newBalance || slip.totalAmount).toLocaleString("tr-TR")} ₺
                </div>
              </div>
            </div>

            {/* History (Optional, compact) */}
            {slip.history && slip.history.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] font-bold text-stone-500 font-mono uppercase tracking-widest mb-2">
                  Son Hareketler (Özet)
                </div>
                <div className="space-y-1.5 opacity-70">
                  {slip.history.slice(0, 3).map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-stone-400 truncate pr-2">{h.date} - {h.description}</span>
                      <span className={h.type === "debt" ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                        {h.type === "debt" ? "+" : "-"}{h.amount.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer / Stamp */}
            <div className="pt-6 pb-2 text-center relative flex flex-col items-center">
              {/* Optional: Add a subtle 'TESLİM EDİLDİ' watermark if status matches */}
              {slip.status === "teslim_edildi" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-10 pointer-events-none">
                  <div className="border-4 border-emerald-500 text-emerald-500 text-4xl font-black p-2 tracking-widest">
                    TESLİM
                  </div>
                </div>
              )}
              
              <div className="text-[10px] text-stone-500 font-mono space-y-1">
                <div>EkmekLab Zanaatkar Fırın</div>
                <div>36 Saat Soğuk Fermantasyon</div>
                <div>0501 012 66 53</div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons (Outside the card, so they can screenshot just the card above) */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 p-3.5 bg-stone-900 hover:bg-stone-800 text-stone-200 font-bold rounded-2xl text-sm border border-stone-800 transition-all active:scale-95"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-amber-400" />}
            <span>{copied ? "Link Kopyalandı" : "Fiş Linkini Kopyala"}</span>
          </button>
          
          <a
            href="https://wa.me/905010126653?text=Merhaba%2C%20EkmekLab%20teslimat%20fi%C5%9Fimizle%20ilgili%20yaz%C4%B1yorum."
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 p-3.5 bg-[#121E15] hover:bg-[#16261A] text-emerald-400 font-bold rounded-2xl text-sm border border-emerald-900/50 transition-all active:scale-95"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Fırına Yaz</span>
          </a>
        </div>

      </div>
    </div>
  );
}
