"use client";

import React, { useState, useMemo } from "react";
import { AdminOrder, CariAccount } from "@/types/admin";
import { useCariler } from "@/hooks/useCariler";
import {
  X,
  Check,
  Building2,
  Phone,
  Calendar,
  MessageCircle,
  Copy,
  Printer,
  DollarSign,
  Store,
  Clock,
  MapPin,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Link2,
} from "lucide-react";

interface OrderSlipModalProps {
  order: AdminOrder;
  isOpen: boolean;
  onClose: () => void;
  // Optional pre-selected Cari
  cari?: CariAccount | null;
}

export function OrderSlipModal({ order, isOpen, onClose, cari: propCari }: OrderSlipModalProps) {
  const { cariler, addTransaction } = useCariler();

  // Find linked Cari account
  const matchedCari = useMemo(() => {
    if (propCari) return propCari;
    if (order.cariId) {
      return cariler.find((c) => c.id === order.cariId) || null;
    }
    // Match by phone
    const cleanOrderPhone = order.phone.replace(/\D/g, "");
    if (cleanOrderPhone.length >= 10) {
      const byPhone = cariler.find((c) =>
        c.phone.replace(/\D/g, "").includes(cleanOrderPhone)
      );
      if (byPhone) return byPhone;
    }
    // Match by customer name
    const byName = cariler.find(
      (c) => c.businessName.toLowerCase() === order.customerName.toLowerCase()
    );
    return byName || null;
  }, [propCari, order, cariler]);

  // Selected Cari override (if user wants to link a Cari)
  const [selectedCariId, setSelectedCariId] = useState<string>(
    matchedCari?.id || order.cariId || ""
  );

  const activeCari = useMemo(() => {
    return cariler.find((c) => c.id === selectedCariId) || matchedCari;
  }, [selectedCariId, cariler, matchedCari]);

  // Payment / Collection collected at delivery time
  const [collectedPayment, setCollectedPayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"nakit" | "banka_havale" | "kredi_karti">("nakit");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentRecorded, setPaymentRecorded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Balance calculations:
  // If this order is already reflected in the Cari's balance:
  // previousBalance = activeCari.balance - order.totalAmount
  // If not reflected: previousBalance = activeCari.balance
  const isOrderAlreadyInBalance = Boolean(order.cariId || order.paymentMethod === "cari");

  const previousBalance = useMemo(() => {
    if (!activeCari) return 0;
    if (isOrderAlreadyInBalance) {
      return activeCari.balance - order.totalAmount;
    }
    return activeCari.balance;
  }, [activeCari, isOrderAlreadyInBalance, order.totalAmount]);

  const thisOrderTotal = order.totalAmount;
  const currentTotalDebt = previousBalance + thisOrderTotal;
  const finalBalance = currentTotalDebt - (collectedPayment || 0);

  if (!isOpen) return null;

  // Build formatted text for WhatsApp and Clipboard
  const generateSlipText = () => {
    const lines: string[] = [];
    lines.push(`🍞 *EKMEKLAB TAŞ FIRIN - TESLİMAT & HESAP FİŞİ*`);
    lines.push(`📅 *Tarih:* ${order.deliveryDate || new Date().toISOString().split("T")[0]} (${order.deliveryTimeWindow || "14:00 - 18:00"})`);
    lines.push(`🏢 *Firma / Müşteri:* ${activeCari?.businessName || order.customerName}`);
    if (activeCari?.taxNumber) {
      lines.push(`🏛️ *Vergi No:* ${activeCari.taxNumber}`);
    }
    lines.push(`📍 *Teslimat:* ${order.neighborhood || "Beylikdüzü"} - ${order.deliveryAddress}`);
    lines.push(``);
    lines.push(`📦 *TESLİM EDİLEN ÜRÜNLER:*`);

    order.items.forEach((it) => {
      lines.push(`• ${it.quantity}x ${it.productName}: ${it.totalPrice} ₺ (${it.unitPrice} ₺/ad)`);
    });

    lines.push(`──────────────────────`);
    lines.push(`*Bu Teslimat Tutarı:* ${thisOrderTotal} ₺`);

    if (activeCari) {
      lines.push(``);
      lines.push(`📊 *CARİ HESAP DURUMU:*`);
      lines.push(`• Önceki Bakiye: ${previousBalance.toLocaleString("tr-TR")} ₺`);
      lines.push(`• Bu Teslimat: +${thisOrderTotal.toLocaleString("tr-TR")} ₺`);
      if (collectedPayment > 0) {
        lines.push(`• Yapılan Ödeme: -${collectedPayment.toLocaleString("tr-TR")} ₺ (${paymentMethod === "nakit" ? "Nakit" : paymentMethod === "banka_havale" ? "Havale" : "POS"})`);
      }
      lines.push(`──────────────────────`);
      lines.push(`💰 *GÜNCEL KALAN BAKİYE: ${finalBalance.toLocaleString("tr-TR")} ₺*`);
    }

    const publicUrl = `https://ekmeklab.tr/fis/${order.id}`;
    lines.push(``);
    lines.push(`🔗 *DİJİTAL FİŞ & CANLI BAKİYE LİNKİNİZ:*`);
    lines.push(publicUrl);
    lines.push(``);
    lines.push(`Afiyet olsun! EkmekLab Zanaatkar Fırın`);
    lines.push(`İletişim: 0501 012 66 53 • ekmeklab.tr`);

    return lines.join("\n");
  };

  // Copy Link State
  const [linkCopied, setLinkCopied] = useState(false);

  // Copy customer public link
  const handleCopyLink = async () => {
    const publicUrl = `https://ekmeklab.tr/fis/${order.id}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  // WhatsApp sender
  const handleSendWhatsApp = () => {
    const rawPhone = activeCari?.phone || order.phone;
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("90")
      ? cleanPhone
      : cleanPhone.startsWith("0")
      ? `9${cleanPhone}`
      : `90${cleanPhone}`;

    const text = generateSlipText();
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateSlipText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  // Record payment in Cari account
  const handleRecordPayment = async () => {
    if (!activeCari || collectedPayment <= 0) return;
    setIsRecordingPayment(true);
    try {
      const res = await addTransaction(activeCari.id, {
        type: "tahsilat",
        amount: Number(collectedPayment),
        description: `Teslimatta Tahsilat - Sipariş #${order.orderNumber || order.id.substring(0, 6)}`,
        paymentMethod: paymentMethod,
        orderId: order.id,
      });
      if (res.success) {
        setPaymentRecorded(true);
      } else {
        alert("Tahsilat işlenirken hata: " + res.error);
      }
    } finally {
      setIsRecordingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-100 text-sm sm:text-base">
                Dijital Teslimat & Hesap Fişi
              </h3>
              <p className="text-[11px] text-stone-400">
                Sipariş #{order.orderNumber || order.id.substring(0, 6)} • {order.deliveryDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Customer / Corporate Account Selector */}
          <div className="bg-stone-950/60 border border-stone-800/90 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300">Kurumsal Cari Hesabı</span>
              {activeCari && (
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  Cari Eşleşti
                </span>
              )}
            </div>

            <select
              value={selectedCariId}
              onChange={(e) => setSelectedCariId(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
            >
              <option value="">— Bireysel / Cari Bağlantısız ({order.customerName}) —</option>
              {cariler.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName} (Güncel Borç: {c.balance.toLocaleString("tr-TR")} ₺)
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400 pt-1">
              <span className="text-stone-200 font-medium">
                {activeCari ? activeCari.businessName : order.customerName}
              </span>
              <span>•</span>
              <span className="font-mono text-stone-300">{activeCari?.phone || order.phone}</span>
              {activeCari?.taxNumber && (
                <>
                  <span>•</span>
                  <span className="text-amber-400/80">VN: {activeCari.taxNumber}</span>
                </>
              )}
            </div>
          </div>

          {/* Delivered Products Card */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                Teslim Edilen Ürünler
              </span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                {order.items.length} Kalem
              </span>
            </div>

            <div className="space-y-2 divide-y divide-stone-800/50">
              {order.items.map((it, idx) => (
                <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-medium text-stone-100">
                      <span className="font-bold text-amber-400 font-mono">{it.quantity}x</span> {it.productName}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      Birim Toptan: {it.unitPrice} ₺
                    </div>
                  </div>
                  <div className="font-mono font-bold text-stone-200 text-sm">
                    {it.totalPrice} ₺
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-400">Bu Fiş Tutarı:</span>
              <span className="font-mono font-bold text-amber-400 text-base">
                {thisOrderTotal} ₺
              </span>
            </div>
          </div>

          {/* Cari Balance & Payment Calculation Card */}
          {activeCari ? (
            <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                    Cari Hesap Bakiye Tablosu
                  </span>
                </div>
                <span className="text-[11px] text-stone-400">
                  {activeCari.businessName}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {/* 1. Previous Balance */}
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800">
                  <div className="text-[10px] text-stone-400 font-medium">Önceki Bakiye</div>
                  <div className="text-sm sm:text-base font-bold font-mono text-stone-300 mt-1">
                    {previousBalance.toLocaleString("tr-TR")} ₺
                  </div>
                  <div className="text-[9px] text-stone-500 mt-0.5">Eski Borç</div>
                </div>

                {/* 2. This Order */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[10px] text-amber-400 font-medium">(+) Bu Fiş Tutarı</div>
                  <div className="text-sm sm:text-base font-bold font-mono text-amber-400 mt-1">
                    +{thisOrderTotal.toLocaleString("tr-TR")} ₺
                  </div>
                  <div className="text-[9px] text-amber-500/80 mt-0.5">Teslim Edilen</div>
                </div>

                {/* 3. Collected Payment */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 font-medium">(-) Alınan Ödeme</div>
                  <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-1">
                    -{collectedPayment || 0} ₺
                  </div>
                  <div className="text-[9px] text-emerald-500/80 mt-0.5">Tahsilat</div>
                </div>

                {/* 4. New Balance */}
                <div className="p-2.5 rounded-xl bg-stone-950 border border-amber-500/40">
                  <div className="text-[10px] text-stone-300 font-bold">(=) Yeni Bakiye</div>
                  <div className="text-sm sm:text-base font-bold font-mono text-amber-400 mt-1">
                    {finalBalance.toLocaleString("tr-TR")} ₺
                  </div>
                  <div className="text-[9px] text-amber-500 font-medium mt-0.5">Kalan Son Borç</div>
                </div>
              </div>

              {/* Editable Payment Input */}
              <div className="p-3 bg-stone-950/80 rounded-xl border border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-stone-200">
                    Bu Teslimatta Tahsilat Alındı mı?
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Elden nakit veya havale aldıysanız tutarı girin:
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="0 ₺"
                    value={collectedPayment || ""}
                    onChange={(e) => {
                      setCollectedPayment(Number(e.target.value));
                      setPaymentRecorded(false);
                    }}
                    className="w-28 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 text-right"
                  />

                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-300 focus:outline-none"
                  >
                    <option value="nakit">Nakit</option>
                    <option value="banka_havale">Havale</option>
                    <option value="kredi_karti">POS/Kart</option>
                  </select>

                  {collectedPayment > 0 && !paymentRecorded && (
                    <button
                      type="button"
                      onClick={handleRecordPayment}
                      disabled={isRecordingPayment}
                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isRecordingPayment ? "..." : "İşle"}</span>
                    </button>
                  )}

                  {paymentRecorded && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                      <Check className="w-4 h-4" /> İşlendi
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-stone-950/40 rounded-2xl border border-stone-800 text-center text-xs text-stone-400">
              Bu sipariş bir kurumsal cariye bağlı değil. Cari bakiye takibi için yukarıdan bir cari seçebilirsiniz.
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-xl text-xs font-semibold border border-stone-700 transition-all active:scale-95"
              title="Müşteriye gönderilecek canlı dijital fiş linkini kopyala"
            >
              {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
              <span>{linkCopied ? "Link Kopyalandı!" : "Fiş Linkini Kopyala"}</span>
            </button>

            <a
              href={`/fis/${order.id}`}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl text-xs border border-stone-700 transition-colors flex items-center justify-center"
              title="Müşteri Görünümünü Yeni Sekmede Aç"
            >
              <ExternalLink className="w-4 h-4 text-stone-400 hover:text-amber-400" />
            </a>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-all active:scale-95"
              title="Metin olarak kopyala"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-stone-400" />}
              <span>{copied ? "Kopyalandı" : "Metin"}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2.5 bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl text-xs border border-stone-700 transition-colors"
              title="İsteğe Bağlı Yazdır / PDF"
            >
              <Printer className="w-4 h-4 text-amber-500" />
            </button>
          </div>

          <button
            onClick={handleSendWhatsApp}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>📲 WhatsApp ile Müşteriye Gönder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
