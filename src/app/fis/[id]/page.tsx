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
        const supabase = createClient();
        if (!supabase) {
          setLoading(false);
          return;
        }

        // 1. Try finding in `orders` table
        const { data: orderData } = await (supabase as any)
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();

        if (orderData) {
          let prevBal = 0;
          let newBal = 0;
          let taxNo = "";
          let busName = orderData.customer_name || "Değerli Müşterimiz";
          let historyItems: any[] = [];

          // If linked to a Cari, fetch Cari balance and history
          if (orderData.cari_id) {
            const { data: cariData } = await (supabase as any)
              .from("current_accounts")
              .select("*")
              .eq("id", orderData.cari_id)
              .single();

            if (cariData) {
              busName = cariData.name || busName;
              taxNo = cariData.tax_id || "";
              newBal = Number(cariData.balance) || 0;
              prevBal = newBal - Number(orderData.total_amount || 0);
            }

            const { data: hist } = await (supabase as any)
              .from("account_transactions")
              .select("*")
              .eq("account_id", orderData.cari_id)
              .order("date", { ascending: false })
              .limit(10);

            if (hist) {
              historyItems = hist.map((h: any) => ({
                id: h.id,
                date: h.date ? new Date(h.date).toISOString().split("T")[0] : "",
                type: h.type,
                description: h.description || "İşlem",
                amount: Number(h.amount) || 0,
              }));
            }
          }

          const rawItems = Array.isArray(orderData.items) ? orderData.items : [];
          const mappedItems: SlipItem[] = rawItems.map((it: any) => ({
            name: it.productName || it.name || "Ürün",
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || Number(it.price) || 0,
            totalPrice: Number(it.totalPrice) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
            weight: it.weight,
          }));

          setSlip({
            id: orderData.id,
            orderNumber: orderData.order_number || orderData.id.substring(0, 6).toUpperCase(),
            businessName: busName,
            phone: orderData.phone || "",
            address: orderData.delivery_address || "",
            neighborhood: orderData.neighborhood || "Beylikdüzü",
            taxNumber: taxNo,
            date: orderData.delivery_date ? new Date(orderData.delivery_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            timeWindow: orderData.delivery_time_window || "14:00 - 18:00",
            items: mappedItems,
            subtotal: Number(orderData.subtotal) || Number(orderData.total_amount) || 0,
            totalAmount: Number(orderData.total_amount) || 0,
            previousBalance: prevBal,
            paidAmount: 0,
            newBalance: newBal > 0 ? newBal : Number(orderData.total_amount) || 0,
            status: orderData.status,
            history: historyItems,
          });
          setLoading(false);
          return;
        }

        // 2. Try finding in `account_transactions` table if it was recorded as a Cari transaction
        const { data: txData } = await (supabase as any)
          .from("account_transactions")
          .select("*")
          .or(`id.eq.${id},order_id.eq.${id}`)
          .single();

        if (txData) {
          const { data: cariData } = await (supabase as any)
            .from("current_accounts")
            .select("*")
            .eq("id", txData.account_id)
            .single();

          const busName = cariData?.name || "Kurumsal Müşteri";
          const taxNo = cariData?.tax_id || "";
          const curBal = Number(cariData?.balance) || 0;
          const amount = Number(txData.amount) || 0;
          const prevBal = curBal - amount;

          // Parse items from description if present
          const desc = txData.description || "Toptan Ekmek Teslimatı";
          const cleanDesc = desc.replace(/^(Fiş|Sipariş):\s*/i, "");

          setSlip({
            id: txData.id,
            orderNumber: (txData.order_id || txData.id).substring(0, 6).toUpperCase(),
            businessName: busName,
            phone: cariData?.phone || "",
            address: cariData?.address || "",
            neighborhood: "Beylikdüzü",
            taxNumber: taxNo,
            date: txData.date ? new Date(txData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            timeWindow: "14:00 - 18:00",
            items: [
              {
                name: cleanDesc,
                quantity: 1,
                unitPrice: amount,
                totalPrice: amount,
              },
            ],
            subtotal: amount,
            totalAmount: amount,
            previousBalance: prevBal,
            paidAmount: 0,
            newBalance: curBal,
          });
          setLoading(false);
          return;
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
          href="tel:05306389773"
          className="px-5 py-2.5 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          <span>Fırını Ara (0530 638 97 73)</span>
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120E0B] text-stone-100 py-6 sm:py-12 px-3 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-[#F7EBD3] p-1.5 flex items-center justify-center shadow-lg">
              <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <div className="font-serif text-xl font-bold text-stone-100 leading-none">
                Ekmek<span className="text-amber-400 italic">Lab</span>
              </div>
              <div className="text-[9px] font-mono tracking-widest text-amber-400/80 uppercase mt-0.5">
                Taş Fırın & Ekşi Maya
              </div>
            </div>
          </Link>
          <div className="text-xs text-stone-400 font-sans">
            Resmi Dijital Teslimat & Cari Bakiye Fişi
          </div>
        </div>

        {/* Main Digital Slip Card */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-sm">
          
          {/* Top Status & Date Banner */}
          <div className="flex items-start justify-between border-b border-stone-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Teslimat Fişi
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Teslim Edildi
                </span>
              </div>
              <div className="text-xs text-stone-400 font-mono">
                Fiş #{slip.orderNumber}
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <div className="text-xs font-semibold text-stone-200 font-mono">
                {slip.date}
              </div>
              <div className="text-[11px] text-stone-500">
                {slip.timeWindow || "14:00 - 18:00"}
              </div>
            </div>
          </div>

          {/* Customer / Corporate Info */}
          <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold text-stone-100 font-serif">
                  {slip.businessName}
                </h2>
              </div>
              {slip.taxNumber && (
                <span className="text-[11px] text-stone-400 font-mono">
                  VN: {slip.taxNumber}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
              {slip.phone && (
                <span className="font-mono text-stone-300">📞 {slip.phone}</span>
              )}
              {slip.neighborhood && (
                <span>📍 {slip.neighborhood}</span>
              )}
            </div>

            {slip.address && (
              <div className="text-[11px] text-stone-500 line-clamp-2 pt-0.5 border-t border-stone-800/60">
                {slip.address}
              </div>
            )}
          </div>

          {/* Delivered Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
              <span>Teslim Edilen Ürünler</span>
              <span>Tutar</span>
            </div>

            <div className="divide-y divide-stone-800/60 rounded-2xl bg-stone-950/40 border border-stone-800/80 p-3.5 space-y-2.5">
              {slip.items.map((it, idx) => (
                <div key={idx} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-semibold text-stone-200">
                      <span className="font-bold text-amber-400 font-mono mr-1.5">{it.quantity}x</span>
                      {it.name}
                      {it.weight ? ` (${it.weight}g)` : ""}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      Birim Toptan: {it.unitPrice} ₺
                    </div>
                  </div>

                  <div className="font-mono font-bold text-stone-100 text-sm shrink-0">
                    {it.totalPrice.toLocaleString("tr-TR")} ₺
                  </div>
                </div>
              ))}
            </div>

            {/* This Slip Total */}
            <div className="flex items-center justify-between pt-2 px-1 text-xs">
              <span className="font-semibold text-stone-300">Bu Fişin Toplamı:</span>
              <span className="font-mono font-bold text-amber-400 text-lg">
                {slip.totalAmount.toLocaleString("tr-TR")} ₺
              </span>
            </div>
          </div>

          {/* Cari Balance Status Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950/30 border border-amber-500/30 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                  Cari Hesap Durumu
                </span>
              </div>
              <span className="text-[11px] text-amber-400/90 font-medium">
                Canlı Bakiye
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800">
                <div className="text-[10px] text-stone-400">Önceki Bakiye</div>
                <div className="text-sm font-bold font-mono text-stone-300 mt-0.5">
                  {(slip.previousBalance || 0).toLocaleString("tr-TR")} ₺
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="text-[10px] text-amber-400">(+) Bu Fiş</div>
                <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                  +{slip.totalAmount.toLocaleString("tr-TR")} ₺
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[10px] text-emerald-400">(-) Yapılan Ödeme</div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                  -{(slip.paidAmount || 0).toLocaleString("tr-TR")} ₺
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-amber-500/40">
                <div className="text-[10px] text-stone-300 font-bold">(=) Kalan Bakiye</div>
                <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                  {(slip.newBalance || slip.totalAmount).toLocaleString("tr-TR")} ₺
                </div>
              </div>
            </div>

            <div className="text-[11px] text-stone-400 text-center italic">
              Bu fiş EkmekLab Taş Fırın atölye kayıtlarıyla anlık senkronizedir.
            </div>
          </div>

          {/* Past Deliveries & Payments History */}
          {slip.history && slip.history.length > 0 && (
            <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                    Önceki Teslimatlar & Ödemeler
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 font-medium">Son {slip.history.length} Hareket</span>
              </div>

              <div className="divide-y divide-stone-800/60 text-xs space-y-2">
                {slip.history.map((h) => {
                  const isDelivery = h.type === "debt";
                  return (
                    <div key={h.id} className="pt-2 first:pt-0 flex items-center justify-between">
                      <div className="space-y-0.5 pr-2">
                        <div className="text-stone-300 font-medium line-clamp-1">{h.description}</div>
                        <div className="text-[10px] text-stone-500 font-mono">{h.date}</div>
                      </div>
                      <div className={`font-mono font-bold shrink-0 ${isDelivery ? "text-amber-400" : "text-emerald-400"}`}>
                        {isDelivery ? `+${h.amount.toLocaleString("tr-TR")} ₺` : `-${h.amount.toLocaleString("tr-TR")} ₺`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bakery Contact & Quick Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <a
              href="https://wa.me/905306389773?text=Merhaba%2C%20EkmekLab%20teslimat%20fi%C5%9Fimizle%20ilgili%20yaz%C4%B1yorum."
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Fırına WhatsApp'tan Yaz</span>
            </a>

            <a
              href="tel:05306389773"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs border border-stone-700 transition-all active:scale-95"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Fırını Ara</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="p-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs border border-stone-700 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              title="Fiş Linkini Kopyala"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="sm:hidden text-xs font-semibold">{copied ? "Kopyalandı" : "Linki Kopyala"}</span>
            </button>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 border-t border-stone-800/80 text-[10px] text-stone-500 space-y-1">
            <div>36 saat soğuk fermantasyonlu ekşi mayalı taş fırın ekmekleri.</div>
            <div className="font-semibold text-stone-400">EkmekLab Zanaatkar Fırın • Beylikdüzü, İstanbul</div>
          </div>
        </div>
      </div>
    </div>
  );
}
