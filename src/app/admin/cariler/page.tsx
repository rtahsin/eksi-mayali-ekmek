"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Phone,
  Users,
  MapPin,
  Loader2,
  Wallet,
  Receipt,
  MessageCircle,
  ExternalLink,
  X,
  Edit,
  TrendingUp,
  Building2,
  Filter,
} from "lucide-react";
import { useCariler } from "@/hooks/useCariler";
import { CariAccount, BEYLIKDUZU_NEIGHBORHOODS } from "@/types/admin";
import CariEditModal from "@/components/admin/cariler/CariEditModal";

export default function FinansCarilerPage() {
  const {
    cariler,
    loading: carilerLoading,
    totalReceivable,
    addCari,
    updateCari,
    refreshCariler,
  } = useCariler();

  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "debtor" | "balanced" | "gider">("all");
  const [activeActionSheet, setActiveActionSheet] = useState<CariAccount | null>(null);

  // New/Edit modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCari, setEditingCari] = useState<CariAccount | null>(null);

  const filteredCariler = useMemo(() => {
    return cariler.filter((cari) => {
      const searchMatch =
        cari.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cari.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cari.phone.includes(searchQuery);

      if (balanceFilter === "debtor") return searchMatch && cari.balance > 0 && cari.accountType !== "gider";
      if (balanceFilter === "balanced") return searchMatch && cari.balance <= 0 && cari.accountType !== "gider";
      if (balanceFilter === "gider") return searchMatch && cari.accountType === "gider";

      return searchMatch && cari.accountType !== "gider";
    });
  }, [cariler, searchQuery, balanceFilter]);

  const debtorCount = cariler.filter((c) => c.balance > 0 && c.accountType !== "gider").length;

  const generateWhatsAppLink = (cari: CariAccount) => {
    return `https://wa.me/90${cari.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
      `🍞 *EKMEKLAB TAŞ FIRIN - CARİ HESAP EKSTRESİ*\nSayın *${cari.businessName}*,\n\n📊 *Güncel Kalan Bakiye:* ${cari.balance.toLocaleString("tr-TR")} ₺\n🔗 *Canlı Ekstre Linkiniz:* https://ekmeklab.tr/ekstre/${cari.id}\n\nTüm teslimat fişlerinizi ve ödemelerinizi yukarıdaki bağlantıdan anlık olarak inceleyebilirsiniz.\nBereketli işler dileriz!\nEkmekLab Zanaatkar Fırın`
    )}`;
  };

  // Open new cari modal
  const openNewCariModal = () => {
    setEditingCari(null);
    setFormModalOpen(true);
  };

  // Open edit cari modal
  const openEditCariModal = (cari: CariAccount) => {
    setEditingCari(cari);
    setFormModalOpen(true);
    setActiveActionSheet(null);
  };

  if (carilerLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-100">
              Cari Hesaplar
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Kurumsal müşteriler & bakiye takibi
            </p>
          </div>
          <button
            onClick={openNewCariModal}
            className="flex items-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Yeni Müşteri</span>
            <span className="sm:hidden">Ekle</span>
          </button>
        </div>

        {/* Overview Cards — 2 column on mobile */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[10px] font-bold text-stone-500 uppercase mb-1">Toplam Alacak</div>
            <div className="text-lg sm:text-xl font-black font-mono text-emerald-400">
              {totalReceivable.toLocaleString("tr-TR")} ₺
            </div>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[10px] font-bold text-stone-500 uppercase mb-1">Borçlu Müşteri</div>
            <div className="text-lg sm:text-xl font-black font-mono text-stone-100">
              {debtorCount} <span className="text-xs font-normal text-stone-400">hesap</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Müşteri adı, yetkili veya telefon ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 text-stone-100 text-sm rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-amber-500/50 shadow-inner"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: "all" as const, label: "Tüm Müşteriler" },
            { key: "debtor" as const, label: "Borçlular" },
            { key: "balanced" as const, label: "Bakiye Kapalı" },
            { key: "gider" as const, label: "Gider/Tedarikçi" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setBalanceFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                balanceFilter === f.key
                  ? "bg-artisan-terracotta text-white shadow-md"
                  : "bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cari Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCariler.length === 0 ? (
          <div className="col-span-full py-12 text-center text-stone-500 bg-stone-900 rounded-2xl border border-stone-800">
            <Users className="w-8 h-8 mx-auto mb-3 text-stone-600" />
            <p className="text-sm font-semibold">Arama kriterlerine uygun cari hesap bulunamadı.</p>
            <button
              onClick={openNewCariModal}
              className="mt-4 px-4 py-2 bg-amber-500 text-stone-950 font-bold text-xs rounded-xl"
            >
              + İlk Müşteriyi Ekle
            </button>
          </div>
        ) : (
          filteredCariler.map((cari) => {
            const isExpense = cari.accountType === "gider";
            return (
              <div
                key={cari.id}
                className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-stone-700 transition-colors shadow-lg flex flex-col justify-between"
              >
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-stone-100 text-[15px] leading-tight flex items-center gap-2 flex-wrap">
                        <span className="truncate">{cari.businessName}</span>
                        {isExpense && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] uppercase tracking-wider font-bold shrink-0">
                            Gider
                          </span>
                        )}
                      </h3>
                      {cari.contactPerson && (
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-1">
                          <Users className="w-3 h-3 shrink-0" /> {cari.contactPerson}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    {cari.phone && (
                      <div className="flex items-center gap-1.5 text-stone-400">
                        <Phone className="w-3 h-3 text-stone-500 shrink-0" />
                        <a href={`tel:${cari.phone}`} className="hover:text-amber-400">
                          {cari.phone}
                        </a>
                      </div>
                    )}
                    {cari.neighborhood && (
                      <div className="flex items-center gap-1.5 text-stone-400">
                        <MapPin className="w-3 h-3 text-stone-500 shrink-0" />
                        <span className="line-clamp-1">{cari.neighborhood}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance & Action Footer */}
                <div className="bg-stone-950 p-4 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-0.5">
                        Güncel Bakiye
                      </div>
                      <div
                        className={`text-lg font-black font-mono ${
                          isExpense
                            ? cari.balance > 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                            : cari.balance > 0
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {Math.abs(cari.balance).toLocaleString("tr-TR")} ₺
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveActionSheet(cari)}
                      className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition-colors active:scale-95 border border-stone-700 min-h-[44px]"
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

      {/* Action Sheet — Mobile Bottom Sheet / Desktop Modal */}
      {activeActionSheet && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setActiveActionSheet(null)} />

          <div className="bg-stone-900 sm:border border-stone-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative z-10 pb-6 sm:pb-0">
            {/* Handle bar for mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-stone-700 rounded-full" />
            </div>

            <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950">
              <div>
                <h3 className="font-bold text-stone-100 font-serif text-lg">
                  {activeActionSheet.businessName}
                </h3>
                <p className="text-xs text-stone-400">İşlem Menüsü</p>
              </div>
              <button
                onClick={() => setActiveActionSheet(null)}
                className="p-2 bg-stone-800 rounded-full text-stone-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              {activeActionSheet.accountType !== "gider" && (
                <>
                  <Link
                    href={`/admin/cariler/${activeActionSheet.id}?action=fis`}
                    className="flex flex-col items-center justify-center p-4 bg-stone-800/50 hover:bg-artisan-terracotta/20 border border-stone-700 hover:border-artisan-terracotta/50 rounded-2xl transition-all text-center group min-h-[88px] active:scale-95"
                  >
                    <Receipt className="w-6 h-6 text-artisan-terracotta mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-stone-200">Fiş Kes</span>
                  </Link>
                  <Link
                    href={`/admin/cariler/${activeActionSheet.id}?action=tahsilat`}
                    className="flex flex-col items-center justify-center p-4 bg-stone-800/50 hover:bg-emerald-500/20 border border-stone-700 hover:border-emerald-500/50 rounded-2xl transition-all text-center group min-h-[88px] active:scale-95"
                  >
                    <Wallet className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-stone-200">Tahsilat Al</span>
                  </Link>
                </>
              )}

              <Link
                href={`/admin/cariler/${activeActionSheet.id}`}
                className="flex flex-col items-center justify-center p-4 bg-stone-800/50 hover:bg-blue-500/20 border border-stone-700 hover:border-blue-500/50 rounded-2xl transition-all text-center group min-h-[88px] active:scale-95"
              >
                <ExternalLink className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-stone-200">Ekstre</span>
              </Link>

              <button
                onClick={() => openEditCariModal(activeActionSheet)}
                className="flex flex-col items-center justify-center p-4 bg-stone-800/50 hover:bg-amber-500/20 border border-stone-700 hover:border-amber-500/50 rounded-2xl transition-all text-center group min-h-[88px] active:scale-95"
              >
                <Edit className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-stone-200">Düzenle</span>
              </button>

              {activeActionSheet.accountType !== "gider" && (
                <a
                  href={generateWhatsAppLink(activeActionSheet)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-stone-800/50 hover:bg-[#25D366]/20 border border-stone-700 hover:border-[#25D366]/50 rounded-2xl transition-all text-center group min-h-[88px] active:scale-95 col-span-2 sm:col-span-1"
                >
                  <MessageCircle className="w-6 h-6 text-[#25D366] mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-stone-200">WhatsApp&apos;tan At</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Cari Modal */}
      {formModalOpen && (
        <CariEditModal
          cari={editingCari}
          onClose={() => {
            setFormModalOpen(false);
            setEditingCari(null);
          }}
          onSuccess={() => {
            setFormModalOpen(false);
            setEditingCari(null);
            refreshCariler();
          }}
        />
      )}
    </div>
  );
}
