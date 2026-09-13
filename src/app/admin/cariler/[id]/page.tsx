"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Phone,
  MessageCircle,
  MapPin,
  ArrowLeft,
  Printer,
  Plus,
  DollarSign,
  Receipt,
  Calendar,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCariler } from "@/hooks/useCariler";
import { INITIAL_PRODUCTS } from "@/hooks/useProducts";
import { CariAccount, CariTransaction } from "@/types/admin";

export default function CariDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cariId = params?.id as string;

  const { addTransaction } = useCariler();

  const [cari, setCari] = useState<CariAccount | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"satis" | "tahsilat">("tahsilat");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDescription, setTxDescription] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [txMethod, setTxMethod] = useState<"banka_havale" | "nakit" | "kredi_karti">("banka_havale");
  const [submitting, setSubmitting] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"ekstre" | "fiyatlar">("ekstre");

  // Fetch Cari details from Supabase
  useEffect(() => {
    if (!cariId) return;

    const supabase = createClient();
    if (!supabase) return;

    const fetchCariData = async () => {
      try {
        // 1. Fetch Account
        const { data: acc } = await (supabase as any)
          .from("current_accounts")
          .select("*")
          .eq("id", cariId)
          .single();

        if (acc) {
          setCari({
            id: acc.id,
            businessName: acc.name || "Cari Hesap",
            contactPerson: acc.type || "",
            phone: acc.phone || "",
            address: acc.address || "",
            neighborhood: "",
            taxNumber: acc.tax_id || "",
            balance: Number(acc.balance) || 0,
            notes: acc.status || "",
            createdAt: acc.created_at,
            updatedAt: acc.updated_at,
          });
        }

        // 2. Fetch Transactions
        const { data: txs } = await (supabase as any)
          .from("account_transactions")
          .select("*")
          .eq("account_id", cariId)
          .order("date", { ascending: false });

        if (txs) {
          const mapped: CariTransaction[] = txs.map((t: any) => ({
            id: t.id,
            cariId: t.account_id,
            date: t.date ? new Date(t.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            type: t.type === "debt" ? "satis" : "tahsilat",
            amount: Number(t.amount) || 0,
            description: t.description || "",
            paymentMethod: "banka_havale",
            createdAt: t.created_at,
          }));
          setTransactions(mapped);
        }
      } catch (err) {
        console.warn("Cari fetch notice:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCariData();

    const channel = supabase
      .channel(`cari-detail-${cariId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "account_transactions", filter: `account_id=eq.${cariId}` },
        () => {
          fetchCariData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cariId]);

  // Open Transaction Modal
  const openModal = (type: "satis" | "tahsilat") => {
    setTxType(type);
    setTxAmount(0);
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxDescription(
      type === "satis" ? "Toplu ekmek teslimatı" : "Banka havalesi ile cari ödeme"
    );
    setTxModalOpen(true);
  };

  // Submit Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cari || txAmount <= 0) return;

    setSubmitting(true);
    const res = await addTransaction(cari.id, {
      type: txType,
      amount: Number(txAmount),
      description: txDescription,
      date: txDate,
      paymentMethod: txMethod,
    });

    if (res.success) {
      setTxModalOpen(false);
    } else {
      alert("Hareket kaydedilirken hata: " + res.error);
    }
    setSubmitting(false);
  };

  // Print Statement
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-stone-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Cari bilgileri yükleniyor...
      </div>
    );
  }

  if (!cari) {
    return (
      <div className="p-16 text-center text-stone-400 space-y-4">
        <div>Aradığınız cari hesap bulunamadı.</div>
        <Link
          href="/admin/cariler"
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-stone-200 rounded-xl text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Cariler Listesine Dön
        </Link>
      </div>
    );
  }

  const customPricesList = Object.entries(cari.customPrices || {});

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Action Bar (Hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/cariler"
          className="flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tüm Carilere Dön</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Ekstre Yazdır / PDF</span>
          </button>
          <button
            onClick={() => openModal("satis")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-xl text-xs border border-amber-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Satış Yaz</span>
          </button>
          <button
            onClick={() => openModal("tahsilat")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>+ Tahsilat Al</span>
          </button>
        </div>
      </div>

      {/* Account Profile Header */}
      <div className="bg-stone-900/80 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                Kurumsal Müşteri
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700">
                {cari.neighborhood || "Beylikdüzü"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
              {cari.businessName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400">
              <span className="text-stone-300 font-medium">Yetkili: {cari.contactPerson}</span>
              <span>•</span>
              <a
                href={`tel:${cari.phone}`}
                className="flex items-center gap-1 text-stone-300 hover:text-amber-400 font-mono"
              >
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>{cari.phone}</span>
              </a>
              {cari.phone && (
                <a
                  href={`https://wa.me/90${cari.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Current Balance Card */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl min-w-[200px] text-right">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Güncel Bakiye
            </div>
            <div
              className={`text-2xl font-bold font-serif mt-1 ${
                cari.balance > 0
                  ? "text-amber-400"
                  : cari.balance < 0
                  ? "text-emerald-400"
                  : "text-stone-300"
              }`}
            >
              {cari.balance.toLocaleString("tr-TR")} ₺
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {cari.balance > 0
                ? "Alacağımız Var (Borçlu)"
                : cari.balance < 0
                ? "Avans / Fazla Ödeme"
                : "Hesap Tamamen Kapalı"}
            </div>
          </div>
        </div>

        {/* Info Rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-300">
          <div>
            <span className="text-stone-500 block mb-0.5">Açık Adres:</span>
            <span>{cari.address || "Belirtilmemiş"}</span>
          </div>
          <div>
            <span className="text-stone-500 block mb-0.5">Vergi Dairesi / No:</span>
            <span>
              {cari.taxOffice || "—"} / {cari.taxNumber || "—"}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block mb-0.5">Kayıt Tarihi:</span>
            <span>{new Date(cari.createdAt).toLocaleDateString("tr-TR")}</span>
          </div>
        </div>
      </div>

      {/* Tabs (Hidden on print) */}
      <div className="print:hidden flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab("ekstre")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "ekstre"
              ? "bg-amber-500 text-stone-950"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Hesap Hareketleri & Ekstre ({transactions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("fiyatlar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "fiyatlar"
              ? "bg-amber-500 text-stone-950"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>İkili Anlaşmalı Fiyat Listesi ({customPricesList.length})</span>
        </button>
      </div>

      {/* TAB 1: Ekstre / Hareketler */}
      {activeTab === "ekstre" && (
        <div className="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs">
              Bu cari hesaba ait henüz işlem hareketi (satış veya tahsilat) bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-950/40">
                    <th className="py-3 px-4">Tarih</th>
                    <th className="py-3 px-4">İşlem Türü</th>
                    <th className="py-3 px-4">Açıklama</th>
                    <th className="py-3 px-4">Ödeme Yolu</th>
                    <th className="py-3 px-4 text-right">Borç (Satış ₺)</th>
                    <th className="py-3 px-4 text-right">Alacak (Tahsilat ₺)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/70 text-xs">
                  {transactions.map((tx) => {
                    const isSale = tx.type === "satis";

                    return (
                      <tr key={tx.id} className="hover:bg-stone-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-stone-300">
                          {tx.date}
                        </td>
                        <td className="py-3 px-4">
                          {isSale ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                              Satış (Borç)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                              Tahsilat (Ödeme)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-stone-200">
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 text-stone-400">
                          {tx.paymentMethod === "banka_havale" && "Banka Havalesi"}
                          {tx.paymentMethod === "nakit" && "Elden Nakit"}
                          {tx.paymentMethod === "kredi_karti" && "Kredi Kartı / POS"}
                          {!tx.paymentMethod && "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                          {isSale ? `${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          {!isSale ? `${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Anlaşmalı Fiyatlar */}
      {activeTab === "fiyatlar" && (
        <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-100 font-serif">
                {cari.businessName} Özel Fiyat Tarifesi
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Bu müşteriye özel sipariş oluşturulduğunda otomatik olarak uygulanacak toptan birim fiyatlar.
              </p>
            </div>
          </div>

          {customPricesList.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs bg-stone-950/40 rounded-xl border border-stone-800">
              Bu firmaya tanımlanmış özel toptan fiyat bulunmuyor. Siparişlerde standart vitrin fiyatları uygulanır.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customPricesList.map(([prodId, customPrice]) => {
                const product = INITIAL_PRODUCTS.find((p) => p.id === prodId);
                const retailPrice = product ? product.price : 0;
                const diff = retailPrice - customPrice;

                return (
                  <div
                    key={prodId}
                    className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-200">
                        {product ? product.name : prodId}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Standart Perakende: <span className="line-through">{retailPrice} ₺</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-amber-400 font-serif">
                        {customPrice} ₺
                      </div>
                      {diff > 0 && (
                        <div className="text-[10px] text-emerald-400 font-semibold">
                          %{Math.round((diff / retailPrice) * 100)} İskonto
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Yeni Satış / Tahsilat Ekle */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">
                  {txType === "satis" ? "Hesaba Satış (Borç) Ekle" : "Tahsilat (Ödeme) Kaydet"}
                </h3>
              </div>
              <button
                onClick={() => setTxModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Tarih</label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Tutar (₺)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={txAmount || ""}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-base font-bold text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Ödeme Şekli</label>
                <select
                  value={txMethod}
                  onChange={(e) => setTxMethod(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="banka_havale">Banka Havalesi / EFT</option>
                  <option value="nakit">Nakit</option>
                  <option value="kredi_karti">Kredi Kartı / POS</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Açıklama</label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="Örn: 20x Atalık Köy Ekmeği teslimatı"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setTxModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting || txAmount <= 0}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? "Kaydediliyor..." : "Hareketi Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
