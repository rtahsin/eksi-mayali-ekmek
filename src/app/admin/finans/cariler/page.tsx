"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Filter, Plus, Phone, Users, MapPin, Loader2, ArrowRight, Wallet, CreditCard, Receipt, MessageCircle, ExternalLink, X } from "lucide-react";
import { useCariler } from "@/hooks/useCariler";
import { CariAccount } from "@/types/admin";

export default function FinansCarilerPage() {
  const { cariler, loading: carilerLoading, totalReceivable } = useCariler();
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "debtor" | "balanced" | "gider">("all");

  const [activeActionSheet, setActiveActionSheet] = useState<CariAccount | null>(null);

  const filteredCariler = cariler.filter((cari) => {
    const searchMatch =
      cari.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cari.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cari.phone.includes(searchQuery);

    if (balanceFilter === "debtor") return searchMatch && cari.balance > 0 && cari.accountType !== "gider";
    if (balanceFilter === "balanced") return searchMatch && cari.balance <= 0 && cari.accountType !== "gider";
    if (balanceFilter === "gider") return searchMatch && cari.accountType === "gider";
    
    return searchMatch && cari.accountType !== "gider";
  });

  const generateWhatsAppLink = (cari: CariAccount) => {
    return `https://wa.me/90${cari.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
      `🍞 *EKMEKLAB TAŞ FIRIN - CARİ HESAP EKSTRESİ*\nSayın *${cari.businessName}*,\n\n📊 *Güncel Kalan Bakiye:* ${cari.balance.toLocaleString("tr-TR")} ₺\n🔗 *Canlı Ekstre Linkiniz:* https://ekmeklab.tr/ekstre/${cari.id}\n\nTüm teslimat fişlerinizi ve ödemelerinizi yukarıdaki bağlantıdan anlık olarak inceleyebilirsiniz.\nBereketli işler dileriz!\nEkmekLab Zanaatkar Fırın`
    )}`;
  };

  if (carilerLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl">
          <div className="text-[10px] font-bold text-stone-500 uppercase mb-1">Toplam Alacak (Piyasa)</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {totalReceivable.toLocaleString("tr-TR")} ₺
          </div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl">
          <div className="text-[10px] font-bold text-stone-500 uppercase mb-1">Toplam Aktif Cari</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-stone-100">
            {cariler.filter(c => c.accountType !== "gider").length}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Müşteri adı, yetkili veya telefon ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 text-stone-100 text-xs rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-stone-600 shadow-inner"
          />
        </div>
        <div className="relative w-full sm:w-48 shrink-0">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value as any)}
            className="w-full bg-stone-900 border border-stone-800 text-stone-100 text-xs rounded-xl pl-9 pr-8 py-3 appearance-none focus:outline-none focus:border-stone-600 shadow-inner"
          >
            <option value="all">Tüm Müşteriler</option>
            <option value="debtor">Borçlular (Alacaklı Olduğumuz)</option>
            <option value="balanced">Bakiyesi Kapalı Olanlar</option>
            <option value="gider">Tedarikçi / Gider Hesapları</option>
          </select>
        </div>
      </div>

      {/* Cari Listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCariler.length === 0 ? (
          <div className="col-span-full py-12 text-center text-stone-500 bg-stone-900 rounded-2xl border border-stone-800">
            Arama kriterlerine uygun cari hesap bulunamadı.
          </div>
        ) : (
          filteredCariler.map((cari) => {
            const isExpense = cari.accountType === "gider";
            const isDebt = cari.balance > 0;
            
            return (
              <div key={cari.id} className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-stone-700 transition-colors shadow-lg flex flex-col justify-between">
                <div className="p-4 sm:p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-stone-100 text-[15px] leading-tight flex items-center gap-2">
                        {cari.businessName}
                        {isExpense && <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] uppercase tracking-wider font-bold">Gider/Tedarikçi</span>}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-1">
                        <Users className="w-3 h-3" /> {cari.contactPerson}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4 text-[11px]">
                    <div className="flex items-center gap-1.5 text-stone-400">
                      <Phone className="w-3 h-3 text-stone-500" />
                      <a href={`tel:${cari.phone}`} className="hover:text-amber-400">{cari.phone}</a>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-400">
                      <MapPin className="w-3 h-3 text-stone-500" />
                      <span className="line-clamp-1">{cari.neighborhood}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-stone-950 p-4 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-0.5">Güncel Bakiye</div>
                      <div className={`text-lg font-black font-mono ${isExpense ? (cari.balance > 0 ? "text-emerald-400" : "text-rose-400") : (cari.balance > 0 ? "text-rose-400" : "text-emerald-400")}`}>
                        {Math.abs(cari.balance).toLocaleString("tr-TR")} ₺
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveActionSheet(cari)}
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition-colors active:scale-95 border border-stone-700"
                    >
                      İşlemler
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile-Friendly Action Sheet (Bottom Sheet style on mobile, Modal on desktop) */}
      {activeActionSheet && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setActiveActionSheet(null)} />
          
          <div className="bg-stone-900 sm:border border-stone-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative animate-slideUp z-10 pb-6 sm:pb-0">
            <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950">
              <div>
                <h3 className="font-bold text-stone-100 font-serif text-lg">{activeActionSheet.businessName}</h3>
                <p className="text-xs text-stone-400">İşlem Menüsü</p>
              </div>
              <button onClick={() => setActiveActionSheet(null)} className="p-2 bg-stone-800 rounded-full text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-3">
              {activeActionSheet.accountType !== "gider" && (
                <>
                  <Link
                    href={`/admin/finans/cariler/${activeActionSheet.id}?action=fis`}
                    className="flex flex-col items-center justify-center p-4 bg-stone-800/50 hover:bg-artisan-terracotta/20 border border-stone-700 hover:border-artisan-terracotta/50 rounded-2xl transition-all text-center group"
                  >
                    <Receipt className="w-6 h-6 text-artisan-terracotta mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-stone-200">Fiş Kes</span>
                  </Link>
                  <Link
                    href={`/admin/finans/cariler/${activeActionSheet.id}?action=tahsilat`}
                    className="flex flex-col items-center justify-center p-4 bg-stone-800/50 hover:bg-emerald-500/20 border border-stone-700 hover:border-emerald-500/50 rounded-2xl transition-all text-center group"
                  >
                    <Wallet className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-stone-200">Tahsilat Al</span>
                  </Link>
                </>
              )}
              
              <Link
                href={`/admin/finans/cariler/${activeActionSheet.id}`}
                className="flex flex-col items-center justify-center p-4 bg-stone-800/50 hover:bg-blue-500/20 border border-stone-700 hover:border-blue-500/50 rounded-2xl transition-all text-center group"
              >
                <ExternalLink className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-stone-200">Ekstreye Git</span>
              </Link>
              
              {activeActionSheet.accountType !== "gider" && (
                <a
                  href={generateWhatsAppLink(activeActionSheet)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-stone-800/50 hover:bg-[#25D366]/20 border border-stone-700 hover:border-[#25D366]/50 rounded-2xl transition-all text-center group"
                >
                  <MessageCircle className="w-6 h-6 text-[#25D366] mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-stone-200">WhatsApp'tan At</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
