"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Wallet,
  Receipt,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  MessageCircle,
  Phone,
  MapPin,
  Tag,
  Building2,
  Calendar,
  Clock,
  Truck,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useCariProfile } from "@/hooks/useCariProfile";
import B2BSlipModal from "@/components/admin/finans/B2BSlipModal";
import B2BCollectionModal from "@/components/admin/finans/B2BCollectionModal";
import CariEditModal from "@/components/admin/cariler/CariEditModal";
import TransactionReceiptModal from "@/components/admin/finans/TransactionReceiptModal";
import { CariTransaction, AdminOrder } from "@/types/admin";

export default function IsolatedCariDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const { cari, transactions, orders, activeProducts, loading, refetch } = useCariProfile(id);

  const [activeTab, setActiveTab] = useState<"deliveries" | "ledger" | "prices">("deliveries");
  const [activeModal, setActiveModal] = useState<"slip" | "collection" | "edit" | null>(null);
  const [selectedTx, setSelectedTx] = useState<CariTransaction | null>(null);

  useEffect(() => {
    const action = searchParams?.get("action");
    if (action === "fis") setActiveModal("slip");
    else if (action === "tahsilat") setActiveModal("collection");
  }, [searchParams]);

  if (loading) {
    return (
      <div className="p-12 flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
      </div>
    );
  }

  if (!cari) {
    return (
      <div className="p-8 text-center text-stone-400">
        <p>Müşteri hesabı bulunamadı.</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-stone-800 rounded-xl">Geri Dön</button>
      </div>
    );
  }

  const cleanPhone = cari.phone ? cari.phone.replace(/\D/g, "") : "";

  const sendOrderWhatsApp = (order: AdminOrder) => {
    const itemsList = order.items
      .map((it) => `• ${it.quantity}x ${it.productName} (${it.unitPrice} ₺) = ${it.totalPrice.toLocaleString("tr-TR")} ₺`)
      .join("\n");

    const origin = typeof window !== "undefined" ? window.location.origin : "https://ekmeklab.tr";
    const dateFormatted = order.deliveryDate
      ? new Date(order.deliveryDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
      : "";

    const text =
      `🍞 *EKMEKLAB TAŞ FIRIN - TESLİMAT BİLGİSİ*\n` +
      `Sayın *${cari.businessName}*,\n\n` +
      `📄 *Fiş/Sipariş No:* ${order.id}\n` +
      `📅 *Teslimat Tarihi:* ${dateFormatted}\n` +
      `⏰ *Sevkiyat Dilimi:* ${order.deliveryTimeWindow || "Sabah"}\n\n` +
      `🛒 *Ürünler:*\n${itemsList}\n\n` +
      `💰 *Toplam Tutar:* ${order.totalAmount.toLocaleString("tr-TR")} ₺\n` +
      `📊 *Güncel Kalan Bakiye:* ${cari.balance.toLocaleString("tr-TR")} ₺\n\n` +
      `🔗 *Online Fiş Görüntüle:*\n${origin}/fis/${order.id}\n\n` +
      `🔗 *Canlı Ekstre Linkiniz:*\n${origin}/ekstre/${cari.id}\n\n` +
      `Bereketli işler dileriz!\nEkmekLab Zanaatkar Fırın`;

    const waUrl = cleanPhone
      ? `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const customPriceEntries = Object.entries(cari.customPrices || {});

  return (
    <div className="space-y-6 pb-20">
      {/* Header Back & Edit */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/cariler")}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-sm font-bold rounded-2xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Listeye Dön
        </button>
        
        <button
          onClick={() => setActiveModal("edit")}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-sm font-bold rounded-2xl transition-all"
        >
          <Edit className="w-4 h-4" /> Düzenle
        </button>
      </div>

      {/* Cari Info Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6 relative z-10">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {cari.accountType === "gider" ? "Gider / Tedarikçi" : "B2B Kurumsal Cari"}
              </span>
              {customPriceEntries.length > 0 && (
                <button
                  onClick={() => setActiveTab("prices")}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors"
                >
                  <Tag className="w-3 h-3 text-amber-400" />
                  {customPriceEntries.length} Üründe Özel Fiyat
                </button>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-serif text-stone-100">
              {cari.businessName}
            </h1>

            {/* Badges & Meta */}
            <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-stone-400 pt-1">
              {cari.contactPerson && (
                <div className="flex items-center gap-1.5 text-stone-300">
                  <span className="text-stone-500">Yetkili:</span>
                  <span className="font-bold">{cari.contactPerson}</span>
                </div>
              )}
              {cari.phone && (
                <a
                  href={`tel:${cari.phone}`}
                  className="flex items-center gap-1 text-stone-300 hover:text-amber-400 font-mono transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-stone-500" />
                  <span>{cari.phone}</span>
                </a>
              )}
              {cari.neighborhood && (
                <div className="flex items-center gap-1 text-stone-300">
                  <MapPin className="w-3.5 h-3.5 text-stone-500" />
                  <span>{cari.neighborhood}</span>
                </div>
              )}
              {cari.taxNumber && (
                <div className="flex items-center gap-1 text-stone-300 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>{cari.taxOffice ? `${cari.taxOffice} VD - ` : ""}{cari.taxNumber}</span>
                </div>
              )}
            </div>

            {cari.address && (
              <p className="text-xs text-stone-400 pt-1 leading-relaxed max-w-xl">
                {cari.address}
              </p>
            )}

            {/* Quick Action Links for Statement */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Link
                href={`/ekstre/${cari.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Canlı Müşteri Ekstresi</span>
              </Link>

              {cari.phone && (
                <a
                  href={`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(
                    `🍞 *EKMEKLAB TAŞ FIRIN - HESAP EKSTRESİ*\nSayın *${cari.businessName}*,\n\n📊 *Güncel Kalan Bakiye:* ${cari.balance.toLocaleString("tr-TR")} ₺\n🔗 *Canlı Ekstre Linkiniz:* ${typeof window !== "undefined" ? window.location.origin : "https://ekmeklab.tr"}/ekstre/${cari.id}\n\nTüm teslimat fişlerinizi ve ödemelerinizi yukarıdaki bağlantıdan anlık olarak inceleyebilirsiniz.\nBereketli işler dileriz!\nEkmekLab Zanaatkar Fırın`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-bold border border-[#25D366]/30 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp ile Ekstre Gönder</span>
                </a>
              )}
            </div>
          </div>

          {/* Current Balance Box */}
          <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 lg:min-w-[240px] text-right shrink-0 space-y-1">
            <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
              Güncel Bakiye
            </div>
            <div
              className={`text-3xl font-black font-mono ${
                cari.balance > 0
                  ? "text-amber-400"
                  : cari.balance < 0
                  ? "text-emerald-400"
                  : "text-stone-400"
              }`}
            >
              {Math.abs(cari.balance).toLocaleString("tr-TR")} ₺
            </div>
            <div className="text-xs text-stone-400 font-medium">
              {cari.balance > 0
                ? "Müşteri Borçlu (Alacağımız)"
                : cari.balance < 0
                ? "Biz Borçluyuz (Fazla Ödeme)"
                : "Bakiye Tamamen Kapalı"}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons — Mobile-friendly large touch targets */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveModal("slip")}
          className="bg-artisan-terracotta hover:bg-orange-600 text-white p-4 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-colors shadow-lg active:scale-95 min-h-[72px]"
        >
          <Receipt className="w-7 h-7" />
          <span className="text-sm">Fiş Kes</span>
        </button>

        <button
          onClick={() => setActiveModal("collection")}
          className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 p-4 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-colors shadow-lg active:scale-95 min-h-[72px]"
        >
          <Wallet className="w-7 h-7" />
          <span className="text-sm">Tahsilat Al</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-900 border border-stone-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("deliveries")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "deliveries"
              ? "bg-amber-500 text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Teslimat Fişleri & Siparişler</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeTab === "deliveries" ? "bg-stone-950/20 text-stone-950" : "bg-stone-800 text-stone-400"}`}>
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "ledger"
              ? "bg-amber-500 text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Hesap Hareketleri & Ekstre</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeTab === "ledger" ? "bg-stone-950/20 text-stone-950" : "bg-stone-800 text-stone-400"}`}>
            {transactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("prices")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "prices"
              ? "bg-amber-500 text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Özel Fiyatlar</span>
          {customPriceEntries.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeTab === "prices" ? "bg-stone-950/20 text-stone-950" : "bg-stone-800 text-stone-400"}`}>
              {customPriceEntries.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Teslimat Fişleri & Siparişler */}
      {activeTab === "deliveries" && (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-100 font-serif">
                Teslimat Fişleri & Siparişler ({orders.length})
              </h2>
              <p className="text-xs text-stone-400">
                Teslim tarihleri, teslim edilen ürünler ve dijital fişler
              </p>
            </div>
            <button
              onClick={() => setActiveModal("slip")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold shadow-md hover:bg-amber-400 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Yeni Fiş Kes</span>
            </button>
          </div>

          <div className="divide-y divide-stone-800/50 max-h-[600px] overflow-y-auto">
            {orders.length === 0 ? (
              <div className="p-12 text-center space-y-3 text-stone-400">
                <Truck className="w-10 h-10 text-stone-600 mx-auto" />
                <p className="text-sm font-medium">Bu müşteriye henüz bir teslimat fişi kesilmedi.</p>
                <button
                  onClick={() => setActiveModal("slip")}
                  className="px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-colors"
                >
                  İlk Fişi Kes
                </button>
              </div>
            ) : (
              orders.map((ord) => {
                const isDelivered = ord.status === "teslim_edildi";
                const isPreparing = ord.status === "hazirlaniyor";

                const dateFormatted = ord.deliveryDate
                  ? new Date(ord.deliveryDate).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      weekday: "short",
                    })
                  : "Tarihsiz";

                return (
                  <div key={ord.id} className="p-5 hover:bg-stone-800/20 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {ord.id}
                        </span>

                        <span className="flex items-center gap-1 text-xs font-bold text-stone-200">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{dateFormatted}</span>
                        </span>

                        {ord.deliveryTimeWindow && (
                          <span className="flex items-center gap-1 text-[11px] text-stone-400">
                            <Clock className="w-3 h-3 text-stone-500" />
                            <span>{ord.deliveryTimeWindow}</span>
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelivered
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isPreparing
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          }`}
                        >
                          {isDelivered ? "✓ Teslim Edildi" : isPreparing ? "🔥 Hazırlanıyor" : "🛵 Kuryede"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-base sm:text-lg font-black font-mono text-stone-100">
                          {ord.totalAmount.toLocaleString("tr-TR")} ₺
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800/80 space-y-1 text-xs">
                      {ord.items.map((it, i) => (
                        <div key={i} className="flex justify-between items-center text-stone-300">
                          <span>
                            <strong className="text-amber-400 font-mono">{it.quantity}x</strong> {it.productName}
                          </span>
                          <span className="font-mono text-stone-400">
                            {it.totalPrice.toLocaleString("tr-TR")} ₺
                          </span>
                        </div>
                      ))}
                      {ord.orderNotes && (
                        <div className="pt-2 mt-2 border-t border-stone-800/80 text-[11px] text-stone-400 italic">
                          Not: {ord.orderNotes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link
                        href={`/fis/${ord.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dijital Fişi Aç</span>
                      </Link>

                      <button
                        onClick={() => sendOrderWhatsApp(ord)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-bold border border-[#25D366]/30 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp ile Gönder</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Hesap Hareketleri & Ekstre */}
      {activeTab === "ledger" && (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-100 font-serif">
                Hesap Hareketleri & Ekstre ({transactions.length})
              </h2>
              <p className="text-xs text-stone-400">
                Borç, alacak ve yürüyen bakiye dökümü
              </p>
            </div>
            <Link
              href={`/ekstre/${cari.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Müşteri Ekranı</span>
            </Link>
          </div>
          <div className="divide-y divide-stone-800/50 max-h-[500px] overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm">
                Henüz hesap hareketi bulunmuyor.
              </div>
            ) : (
              transactions.map((tx) => {
                const isDebt = tx.type === "satis" || tx.type === "devir";
                return (
                  <div key={tx.id} className="p-4 flex flex-col gap-3 hover:bg-stone-800/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDebt ? "bg-rose-500/10" : "bg-emerald-500/10"}`}>
                        {isDebt ? <ArrowUpRight className="w-5 h-5 text-rose-500" /> : <ArrowDownRight className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-stone-200">
                            {tx.type === "satis" ? "Toptan Satış" : tx.type === "tahsilat" ? "Tahsilat" : tx.type === "devir" ? "Açılış/Devir" : tx.type === "odeme" ? "Ödeme" : tx.type === "storno" ? "Storno" : "İşlem"}
                          </span>
                          {tx.slipNumber && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {tx.slipNumber}
                            </span>
                          )}
                          {tx.paymentMethod && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                              {tx.paymentMethod === "nakit" ? "💵 Nakit" : tx.paymentMethod === "banka_havale" ? "🏦 Havale" : tx.paymentMethod === "kredi_karti" ? "💳 Kart" : tx.paymentMethod}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5 line-clamp-2">{tx.description}</div>
                        <div className="text-[10px] text-stone-500 mt-1 font-mono">{new Date(tx.createdAt || tx.date).toLocaleString("tr-TR")}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-13">
                      <div className="flex items-center gap-3">
                        <div className={`text-lg font-black font-mono ${isDebt ? "text-rose-400" : "text-emerald-400"}`}>
                          {isDebt ? "+" : "-"}{tx.amount.toLocaleString("tr-TR")} ₺
                        </div>
                        {tx.balanceAfter !== undefined && (
                          <span className="text-[10px] text-stone-500 font-mono">
                            Bakiye: {tx.balanceAfter.toLocaleString("tr-TR")} ₺
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {tx.type === "satis" && (tx.orderId || tx.slipNumber || tx.id) && (
                          <Link
                            href={`/fis/${tx.slipNumber || tx.orderId || tx.id}`}
                            target="_blank"
                            className="p-2.5 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-xl transition-colors border border-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Dijital Fişi Aç"
                          >
                            <Receipt className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-2.5 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-xl transition-colors border border-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="İşlem Makbuzunu Görüntüle"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Özel Anlaşmalı Fiyatlar */}
      {activeTab === "prices" && (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-100 font-serif">
                Özel Anlaşmalı Fiyatlar ({customPriceEntries.length})
              </h2>
              <p className="text-xs text-stone-400">
                Bu kurumsal müşteriye tanımlanmış toptan birim fiyatları
              </p>
            </div>
            <button
              onClick={() => setActiveModal("edit")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-amber-400" />
              <span>Fiyatları Düzenle</span>
            </button>
          </div>

          <div className="p-5">
            {customPriceEntries.length === 0 ? (
              <div className="p-8 text-center space-y-3 text-stone-400">
                <Tag className="w-10 h-10 text-stone-600 mx-auto" />
                <p className="text-sm font-medium">Bu müşteriye özel bir toptan fiyat tanımlanmamış.</p>
                <p className="text-xs text-stone-500">Standart fırın perakende fiyatları geçerlidir.</p>
                <button
                  onClick={() => setActiveModal("edit")}
                  className="px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-colors"
                >
                  Özel Fiyat Tanımla
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {customPriceEntries.map(([productId, customPrice]) => {
                  const prod = activeProducts.find((p) => p.id === productId);
                  const prodName = prod?.name || productId;
                  const normalPrice = prod?.price || 0;
                  const discount = normalPrice > 0 ? normalPrice - customPrice : 0;

                  return (
                    <div
                      key={productId}
                      className="p-4 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-between gap-3 shadow-inner"
                    >
                      <div>
                        <div className="text-xs font-bold text-stone-200">{prodName}</div>
                        {normalPrice > 0 && (
                          <div className="text-[11px] text-stone-500 line-through">
                            Normal: {normalPrice} ₺
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="text-[10px] text-emerald-400 font-semibold">
                            {discount} ₺ indirimli
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black font-mono text-amber-400">
                          {customPrice} ₺
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === "slip" && (
        <B2BSlipModal
          cariId={cari.id}
          cariName={cari.businessName}
          cariPhone={cari.phone}
          customPrices={cari.customPrices}
          onClose={() => setActiveModal(null)}
          onSuccess={refetch}
        />
      )}
      
      {activeModal === "collection" && (
        <B2BCollectionModal cariId={cari.id} cariName={cari.businessName} onClose={() => setActiveModal(null)} onSuccess={refetch} />
      )}

      {activeModal === "edit" && (
        <CariEditModal
          cari={cari}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); refetch(); }}
        />
      )}

      {selectedTx && (
        <TransactionReceiptModal
          tx={selectedTx}
          cari={cari}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
}
