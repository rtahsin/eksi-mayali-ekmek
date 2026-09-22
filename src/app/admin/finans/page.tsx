"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Wallet, TrendingUp, TrendingDown, Users, Receipt, ArrowRight, Activity, Loader2 } from "lucide-react";
import { useFinans } from "@/hooks/useFinans";
import { useCariler } from "@/hooks/useCariler";

export default function FinansDashboardPage() {
  const { kasaBalances, expenses, loading: finansLoading } = useFinans();
  const { totalReceivable, cariler, loading: carilerLoading } = useCariler();

  const totalLiquid = kasaBalances.nakit.balance + kasaBalances.banka.balance + kasaBalances.pos.pending;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(todayStr))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses, todayStr]);

  const activeMusteriCount = cariler.filter(c => c.accountType !== "gider").length;

  if (finansLoading || carilerLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-stone-800/50 transform rotate-12">
          <Activity className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black font-serif text-stone-100 mb-2">Finansal Özet</h2>
          <p className="text-sm text-stone-400 max-w-xl">
            İşletmenizin anlık finansal durumunu, kasa mevcudunu ve piyasadaki alacaklarını buradan takip edebilirsiniz. Detaylı işlemler için üstteki sekmeleri kullanın.
          </p>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Liquid */}
        <Link href="/admin/finans/kasa" className="bg-stone-900 border border-stone-800 hover:border-stone-700 transition-colors rounded-2xl p-5 shadow-lg group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-500" />
            </div>
            <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Toplam Nakit/Likit</div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {totalLiquid.toLocaleString("tr-TR")} ₺
          </div>
        </Link>

        {/* Total Receivables */}
        <Link href="/admin/finans/cariler" className="bg-stone-900 border border-stone-800 hover:border-stone-700 transition-colors rounded-2xl p-5 shadow-lg group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Piyasa Alacakları</div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {totalReceivable.toLocaleString("tr-TR")} ₺
          </div>
        </Link>

        {/* Today's Expenses */}
        <Link href="/admin/finans/giderler" className="bg-stone-900 border border-stone-800 hover:border-stone-700 transition-colors rounded-2xl p-5 shadow-lg group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
            <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-rose-500 transition-colors" />
          </div>
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Bugünkü Giderler</div>
          <div className="text-2xl font-black font-mono text-rose-400">
            -{todayExpenses.toLocaleString("tr-TR")} ₺
          </div>
        </Link>

        {/* Active Customers */}
        <Link href="/admin/finans/cariler" className="bg-stone-900 border border-stone-800 hover:border-stone-700 transition-colors rounded-2xl p-5 shadow-lg group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Aktif Müşteriler</div>
          <div className="text-2xl font-black font-mono text-blue-400">
            {activeMusteriCount} Cari
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/finans/kasa" className="flex items-center gap-3 bg-stone-800/50 hover:bg-stone-800 p-4 rounded-2xl border border-stone-700/50 transition-colors group">
          <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-stone-400 group-hover:text-amber-400 transition-colors" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-200">Kasalar & Virman</h4>
            <p className="text-[10px] text-stone-500">Para akışını yönetin</p>
          </div>
        </Link>
        <Link href="/admin/finans/cariler" className="flex items-center gap-3 bg-stone-800/50 hover:bg-stone-800 p-4 rounded-2xl border border-stone-700/50 transition-colors group">
          <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-stone-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-200">Tahsilat / Fiş Kes</h4>
            <p className="text-[10px] text-stone-500">Müşteri hesaplarına işlem yapın</p>
          </div>
        </Link>
        <Link href="/admin/finans/giderler" className="flex items-center gap-3 bg-stone-800/50 hover:bg-stone-800 p-4 rounded-2xl border border-stone-700/50 transition-colors group">
          <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-stone-400 group-hover:text-rose-400 transition-colors" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-200">Gider Kaydet</h4>
            <p className="text-[10px] text-stone-500">Harcamaları deftere işleyin</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
