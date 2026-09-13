"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Wheat,
  Phone,
  MessageCircle,
  ArrowLeft,
  Printer,
  Plus,
  DollarSign,
  Receipt,
  CheckCircle2,
  X,
  PlusCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Supplier, SupplierTransaction } from "@/types/admin";

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = params?.id as string;

  const { addSupplierTransaction } = useSuppliers();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"alis" | "odeme">("odeme");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDescription, setTxDescription] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [txMethod, setTxMethod] = useState<"banka_havale" | "nakit" | "kredi_karti">("banka_havale");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supplierId) return;

    const supabase = createClient();
    if (!supabase) return;

    const fetchSupplierData = async () => {
      try {
        // 1. Fetch Supplier
        const { data: sup } = await (supabase as any)
          .from("suppliers")
          .select("*")
          .eq("id", supplierId)
          .single();

        if (sup) {
          setSupplier({
            id: sup.id,
            companyName: sup.name || "Tedarikçi",
            materialType: sup.category || "Hammadde",
            phone: sup.phone || "",
            contactPerson: sup.contact_person || "",
            balance: Number(sup.balance) || 0,
            notes: sup.address || "",
            createdAt: sup.created_at,
          });
        }

        // 2. Fetch Transactions
        const { data: txs } = await (supabase as any)
          .from("supplier_transactions")
          .select("*")
          .eq("supplier_id", supplierId)
          .order("date", { ascending: false });

        if (txs) {
          const mapped: SupplierTransaction[] = txs.map((t: any) => ({
            id: t.id,
            supplierId: t.supplier_id,
            date: t.date ? new Date(t.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            type: t.type === "purchase" ? "alis" : "odeme",
            amount: Number(t.amount) || 0,
            description: t.description || "",
            paymentMethod: "banka_havale",
            createdAt: t.created_at,
          }));
          setTransactions(mapped);
        }
      } catch (err) {
        console.warn("Supplier fetch notice:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierData();

    const channel = supabase
      .channel(`supplier-detail-${supplierId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "supplier_transactions", filter: `supplier_id=eq.${supplierId}` },
        () => {
          fetchSupplierData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supplierId]);

  const openModal = (type: "alis" | "odeme") => {
    setTxType(type);
    setTxAmount(0);
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxDescription(
      type === "alis" ? `${supplier?.materialType || "Hammadde"} alımı` : "Banka havalesi ile ödeme"
    );
    setTxModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || txAmount <= 0) return;

    setSubmitting(true);
    const res = await addSupplierTransaction(supplier.id, {
      type: txType,
      amount: Number(txAmount),
      description: txDescription,
      date: txDate,
      paymentMethod: txMethod,
    });

    if (res.success) {
      setTxModalOpen(false);
    } else {
      alert("İşlem kaydedilirken hata: " + res.error);
    }
    setSubmitting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-stone-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Tedarikçi bilgileri yükleniyor...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-16 text-center text-stone-400 space-y-4">
        <div>Aradığınız tedarikçi hesabı bulunamadı.</div>
        <Link
          href="/admin/tedarikciler"
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-stone-200 rounded-xl text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Tedarikçilere Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Action Bar */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/tedarikciler"
          className="flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tüm Tedarikçilere Dön</span>
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
            onClick={() => openModal("alis")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-xl text-xs border border-amber-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Hammadde Girişi</span>
          </button>
          <button
            onClick={() => openModal("odeme")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>+ Ödeme Yap</span>
          </button>
        </div>
      </div>

      {/* Supplier Profile Header */}
      <div className="bg-stone-900/80 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                Hammadde Tedarikçisi
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 border border-stone-700">
                {supplier.materialType}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
              {supplier.companyName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400">
              <span className="text-stone-300 font-medium">
                Yetkili: {supplier.contactPerson || "—"}
              </span>
              <span>•</span>
              <a
                href={`tel:${supplier.phone}`}
                className="flex items-center gap-1 text-stone-300 hover:text-amber-400 font-mono"
              >
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>{supplier.phone}</span>
              </a>
              {supplier.phone && (
                <a
                  href={`https://wa.me/90${supplier.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Current Debt Card */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl min-w-[200px] text-right">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Bizim Borcumuz
            </div>
            <div
              className={`text-2xl font-bold font-serif mt-1 ${
                supplier.balance > 0 ? "text-red-400" : "text-stone-300"
              }`}
            >
              {supplier.balance.toLocaleString("tr-TR")} ₺
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {supplier.balance > 0
                ? "Ödenmesi Gereken Bakiye"
                : "Hesap Dengede (Borç Yok)"}
            </div>
          </div>
        </div>

        {supplier.notes && (
          <div className="text-xs text-stone-400 italic">
            <span className="text-stone-500 not-italic font-semibold">Tedarikçi Notları: </span>
            {supplier.notes}
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-stone-100 font-serif">
              Hammadde Alımları ve Ödeme Ekstresi ({transactions.length} Kayıt)
            </h2>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-xs">
            Bu tedarikçiye ait henüz hammadde alımı veya ödeme hareketi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-950/40">
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">İşlem Türü</th>
                  <th className="py-3 px-4">Açıklama / Miktar</th>
                  <th className="py-3 px-4">Ödeme Yolu</th>
                  <th className="py-3 px-4 text-right">Alış / Fatura (₺)</th>
                  <th className="py-3 px-4 text-right">Ödeme (₺)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70 text-xs">
                {transactions.map((tx) => {
                  const isPurchase = tx.type === "alis";

                  return (
                    <tr key={tx.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-300">{tx.date}</td>
                      <td className="py-3 px-4">
                        {isPurchase ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                            Hammadde Alımı
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                            Tedarikçiye Ödeme
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-200">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-stone-400">
                        {tx.paymentMethod === "banka_havale" && "Banka Havalesi / EFT"}
                        {tx.paymentMethod === "nakit" && "Nakit Ödeme"}
                        {tx.paymentMethod === "kredi_karti" && "Kredi Kartı / Şirket Kartı"}
                        {!tx.paymentMethod && "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-400">
                        {isPurchase ? `${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {!isPurchase ? `${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Transaction */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">
                  {txType === "alis" ? "Hammadde Alımı (Fatura Gir)" : "Tedarikçiye Ödeme Yap"}
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
                  placeholder="Örn: 20 Çuval Karakılçık Atalık Un Alımı"
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
                  <span>{submitting ? "Kaydediliyor..." : "Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
