"use client";

import React from "react";
import { useCartStore} from "@/lib/store/useCartStore";
import { CheckCircle2, PackageCheck, MessageSquare, X, ArrowRight} from "lucide-react";

export function OrderSuccessModal() {
 const { isSuccessModalOpen, lastCompletedOrder, setSuccessModal} = useCartStore();

 if (!isSuccessModalOpen || !lastCompletedOrder) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 animate-fadeIn">
 <div className="relative w-full max-w-lg rounded-2xl bg-surface-panel border border-surface-border p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden">
 {/* Ambient Top Glow */}
 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-artisan-gold to-transparent" />

 {/* Close Button */}
 <button
 onClick={() => setSuccessModal(false)}
 className="absolute top-4 right-4 text-foreground/60 hover:text-foreground p-1 rounded-lg hover:bg-surface-elevated transition-colors"
 >
 <X className="w-5 h-5" />
 </button>

 {/* Success Icon & Header */}
 <div className="text-center space-y-2">
 <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
 <CheckCircle2 className="w-9 h-9" />
 </div>
 <div className="font-mono text-xs font-bold text-artisan-gold uppercase tracking-wider">
 SİPARİŞİNİZ BAŞARIYLA ALINDI
 </div>
 <h2 className="text-2xl font-extrabold text-foreground">
 İmalathane Tezgâhına İletildi!
 </h2>
 <p className="text-xs text-foreground/60 font-sans max-w-sm mx-auto">
 Siparişiniz ekşi maya ustalarımıza ulaştı. Fırından taze çıktığında hemen paketlenip dağıtıma çıkacaktır.
 </p>
 </div>

 {/* Order Details Summary Box */}
 <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3 font-mono text-xs">
 <div className="flex items-center justify-between pb-2 border-b border-surface-border">
 <span className="text-zinc-500">Sipariş No</span>
 <span className="font-bold text-artisan-gold text-sm">
 #{lastCompletedOrder.id}
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-zinc-500">Müşteri</span>
 <span className="text-zinc-200">{lastCompletedOrder.customerName}</span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-zinc-500">Ödeme Tercihi</span>
 <span className="text-zinc-200">
 {lastCompletedOrder.paymentMethod === "pos_at_door"
 ? "Kapıda Kredi Kartı (POS)"
 : "Kapıda Nakit Ödeme"}
 </span>
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-surface-border font-bold text-sm">
 <span className="text-foreground/70">Toplam Tutar</span>
 <span className="text-foreground">{lastCompletedOrder.totalAmount} TL</span>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="space-y-3">
 <a
 href={`https://wa.me/905436329243?text=${encodeURIComponent(
 `Merhaba, #${lastCompletedOrder.id} numaralı siparişim hakkında bilgi almak istiyorum.`
 )}`}
 target="_blank"
 rel="noopener noreferrer"
 className="w-full py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors"
 >
 <MessageSquare className="w-4 h-4" />
 WhatsApp'tan Sipariş Durumu Sor
 </a>

 <button
 onClick={() => setSuccessModal(false)}
 className="w-full py-3 rounded-xl bg-artisan-gold hover:bg-artisan-amber text-stone-950 font-mono text-xs font-bold transition-all shadow-md shadow-artisan-gold/10"
 >
 Alışverişe Devam Et
 </button>
 </div>
 </div>
 </div>
 );
}
