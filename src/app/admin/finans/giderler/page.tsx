"use client";

import React, { useState } from "react";
import { Receipt, Plus, Search, Filter, Trash2, Zap, Wheat, Package, Phone, Building2, ExternalLink, Loader2 } from "lucide-react";
import { useFinans } from "@/hooks/useFinans";

export default function FinansGiderlerPage() {
  const { expenses, addExpense, deleteExpense, loading: expensesLoading } = useFinans();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<"hammadde" | "yakit_kurye" | "ambalaj" | "fatura_kira" | "diger">("hammadde");
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState<number | "">("");
  const [expensePayment, setExpensePayment] = useState<"nakit" | "kredi_karti" | "banka_havale" | "cari_borc">("nakit");
  const [savingExpense, setSavingExpense] = useState(false);

  const filteredExpenses = expenses.filter((ex) => {
    const searchMatch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.notes && ex.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const categoryMatch = filterCategory === "all" || ex.category === filterCategory;
    return searchMatch && categoryMatch;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "hammadde": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "yakit_kurye": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "ambalaj": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "fatura_kira": return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      default: return "text-stone-400 bg-stone-500/10 border-stone-500/20";
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "hammadde": return "Hammadde (Un, Yağ vb.)";
      case "yakit_kurye": return "Kurye & Yakıt";
      case "ambalaj": return "Ambalaj (Kutu, Poşet)";
      case "fatura_kira": return "Kira & Fatura";
      default: return "Diğer Giderler";
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;
    setSavingExpense(true);
    const res = await addExpense({
      category: expenseCategory,
      title: expenseTitle,
      amount: Number(expenseAmount),
      date: new Date().toISOString(),
      paymentMethod: expensePayment,
    });
    if (res.success) {
      setExpenseModalOpen(false);
      setExpenseTitle("");
      setExpenseAmount("");
    } else {
      alert("Hata: " + res.error);
    }
    setSavingExpense(false);
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`'${title}' gider kaydını iptal etmek istediğinize emin misiniz?`)) {
      await deleteExpense(id);
    }
  };

  if (expensesLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div>
          <h2 className="text-lg font-bold text-stone-100 font-serif">Gider Yönetimi</h2>
          <p className="text-xs text-stone-400">İşletme giderleri ve harcama kayıtları</p>
        </div>
        <button
          onClick={() => setExpenseModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-4 h-4" /> Yeni Gider Ekle
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Gider açıklaması ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 text-stone-100 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-stone-600"
          />
        </div>
        <div className="relative w-full sm:w-48 shrink-0">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 text-stone-100 text-xs rounded-xl pl-9 pr-8 py-2.5 appearance-none focus:outline-none focus:border-stone-600"
          >
            <option value="all">Tüm Kategoriler</option>
            <option value="hammadde">Hammadde</option>
            <option value="yakit_kurye">Kurye & Yakıt</option>
            <option value="ambalaj">Ambalaj</option>
            <option value="fatura_kira">Kira & Fatura</option>
            <option value="diger">Diğer</option>
          </select>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-stone-950 border-b border-stone-800">
              <tr>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Tarih</th>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Kategori</th>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Açıklama</th>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Ödeme Tipi</th>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider text-right">Tutar</th>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/50">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500 text-xs">Arama kriterlerine uygun gider kaydı bulunamadı.</td>
                </tr>
              ) : (
                filteredExpenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-stone-800/30 transition-colors group">
                    <td className="py-3 px-4 text-xs text-stone-400">
                      {new Date(ex.date).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getCategoryColor(ex.category)}`}>
                        {getCategoryLabel(ex.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-stone-200">
                      {ex.title}
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-400">
                      {ex.paymentMethod === "nakit" && "Nakit"}
                      {ex.paymentMethod === "kredi_karti" && "Kredi Kartı"}
                      {ex.paymentMethod === "banka_havale" && "Havale / EFT"}
                      {ex.paymentMethod === "cari_borc" && "Cari Hesaba Borç (Açık Hesap)"}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono font-bold text-right text-rose-400">
                      -{ex.amount.toLocaleString("tr-TR")} ₺
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteExpense(ex.id, ex.title)}
                        className="text-stone-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="İptal Et / Storno"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <h3 className="font-bold text-stone-100 font-serif text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-500" /> Yeni Gider Kaydı
              </h3>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-400">Kategori</label>
                <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value as any)} className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 outline-none">
                  <option value="hammadde">Hammadde (Un, Yağ vb.)</option>
                  <option value="yakit_kurye">Kurye & Yakıt</option>
                  <option value="ambalaj">Ambalaj (Kutu, Poşet)</option>
                  <option value="fatura_kira">Kira & Fatura</option>
                  <option value="diger">Diğer İşletme Giderleri</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-400">Açıklama (Nereye/Kime ödendi?)</label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="Örn: A Firması Un Alımı"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-400">Tutar (₺)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-lg font-bold font-mono text-rose-400 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-400">Ödeme Şekli</label>
                  <select value={expensePayment} onChange={(e) => setExpensePayment(e.target.value as any)} className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 outline-none">
                    <option value="nakit">Kasa (Nakit)</option>
                    <option value="banka_havale">Banka / Havale</option>
                    <option value="kredi_karti">Firma Kredi Kartı</option>
                    <option value="cari_borc">Açık Hesap (Ödenmedi)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
                <button type="button" onClick={() => setExpenseModalOpen(false)} className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold">Vazgeç</button>
                <button type="submit" disabled={savingExpense} className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-colors">
                  {savingExpense ? "Kaydediliyor..." : "Gideri Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
