"use client";

import React, { useState, useMemo } from "react";
import {
  Flame,
  Calendar,
  Wheat,
  Droplet,
  Sparkles,
  Scale,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  Store,
  Layers,
  AlertCircle,
} from "lucide-react";
import { useProduction, ProductionStage } from "@/hooks/useProduction";

const STAGES: { key: ProductionStage; label: string; desc: string; icon: string }[] = [
  {
    key: "otoliz_yogurma",
    label: "1. Otoliz & Yoğurma",
    desc: "Un ve su buluştu, maya eklendi",
    icon: "🥣",
  },
  {
    key: "laminasyon_katlama",
    label: "2. Katlama & Şekil",
    desc: "Gluten ağı güçlendirildi, banneton sepetlere girdi",
    icon: "✋",
  },
  {
    key: "soguk_fermantasyon",
    label: "3. 36s Soğuk Fermantasyon",
    desc: "+4°C dolapta yavaş mayalanıyor",
    icon: "❄️",
  },
  {
    key: "firinda_pisirim",
    label: "4. Taş Fırında Pişirim",
    desc: "240°C taş tabanda buharla pişiyor",
    icon: "🔥",
  },
  {
    key: "soguma_hazir",
    label: "5. Soğuma & Hazır",
    desc: "Ahşap raflarda dinlendi, dağıtıma hazır",
    icon: "🥖",
  },
];

export default function BakeryProductionPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    return tm.toISOString().split("T")[0];
  });

  const [counterSurplus, setCounterSurplus] = useState<number>(10);
  const [notes, setNotes] = useState<string>("");
  const [creatingBatch, setCreatingBatch] = useState<boolean>(false);

  const {
    batches,
    loading,
    todayStr,
    tomorrowStr,
    neededBreads,
    calculateIngredients,
    createBatch,
    updateBatchStatus,
    deleteBatch,
  } = useProduction(selectedDate);

  // Ingredient calculation
  const calc = useMemo(() => {
    return calculateIngredients(neededBreads, Number(counterSurplus) || 0);
  }, [neededBreads, counterSurplus, calculateIngredients]);

  // Filter batches for selected date
  const dateBatches = useMemo(() => {
    return batches.filter((b) => b.targetDate === selectedDate);
  }, [batches, selectedDate]);

  // Start new production batch
  const handleStartBatch = async () => {
    if (neededBreads.length === 0 && counterSurplus <= 0) {
      alert("Üretim başlatmak için en az 1 ekmek siparişi veya tezgah miktarı olmalıdır.");
      return;
    }

    setCreatingBatch(true);
    const items = neededBreads.map((b) => ({
      productId: b.product.id,
      productName: b.product.name,
      targetCount: b.count,
    }));

    const res = await createBatch({
      targetDate: selectedDate,
      items,
      counterSurplus: Number(counterSurplus) || 0,
      notes,
    });

    if (res.success) {
      setNotes("");
    } else {
      alert("Üretim partisi oluşturulamadı: " + res.error);
    }
    setCreatingBatch(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/40 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
            <Flame className="w-3.5 h-3.5" />
            <span>İmalathane & Hamur Takvimi</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
            Taş Fırın Üretim Masası
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Teslimat günü siparişlerine göre otomatik un, maya, su formülasyonu ve 36 saatlik fermantasyon parti takibi.
          </p>
        </div>

        {/* Date Selector Buttons */}
        <div className="flex items-center gap-2 bg-stone-950/80 p-1.5 rounded-2xl border border-stone-800">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDate === todayStr
                ? "bg-amber-500 text-stone-950"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Bugün Pişenler
          </button>
          <button
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDate === tomorrowStr
                ? "bg-amber-500 text-stone-950"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Yarın Pişecekler
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* BIG BAKER'S INGREDIENT CALCULATOR CARD */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 font-serif">
                {new Date(selectedDate).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  weekday: "long",
                })}{" "}
                İçin Gereken Hamur & Malzeme İhtiyacı
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Onaylanmış teslimat siparişleri ve dükkan tezgahı için gereken tam reçete miktarları.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-stone-950/80 px-4 py-2 rounded-xl border border-stone-800 shrink-0">
            <span className="text-xs text-stone-400 font-medium">Toplam Pişirim:</span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              {calc.totalLoaves} adet
            </span>
          </div>
        </div>

        {/* 4 Formula Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Flour */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
              <span>Toplam Un</span>
              <Wheat className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-serif text-stone-100">
              {calc.totalFlourKg} <span className="text-sm font-normal text-stone-400">kg</span>
            </div>
            <div className="text-[11px] text-amber-400/90 font-medium">
              Atalık taş değirmen unları
            </div>
          </div>

          {/* Water */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
              <span>İçme Suyu</span>
              <Droplet className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-serif text-blue-400">
              {calc.totalWaterLiters} <span className="text-sm font-normal text-stone-400">L</span>
            </div>
            <div className="text-[11px] text-stone-400 font-medium">
              %75 hidrasyon oranı
            </div>
          </div>

          {/* Sourdough Starter */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
              <span>Canlı Ekşi Maya</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-serif text-emerald-400">
              {calc.totalLevainKg} <span className="text-sm font-normal text-stone-400">kg</span>
            </div>
            <div className="text-[11px] text-stone-400 font-medium">
              Beslenecek aktif ön maya
            </div>
          </div>

          {/* Salt */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
              <span>Çankırı Kaya Tuzu</span>
              <Scale className="w-4 h-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold font-serif text-stone-200">
              {calc.totalSaltGrams} <span className="text-sm font-normal text-stone-400">g</span>
            </div>
            <div className="text-[11px] text-stone-400 font-medium">
              %2 doğal kaya tuzu
            </div>
          </div>
        </div>

        {/* Flour Breakdown Table */}
        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800/80 space-y-2">
          <div className="text-xs font-bold text-stone-300 flex items-center gap-2">
            <Wheat className="w-3.5 h-3.5 text-amber-500" />
            <span>Un Çeşitleri İhtiyaç Dökümü:</span>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            {Object.entries(calc.flourBreakdown).map(([flour, kg]) => (
              <div
                key={flour}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs"
              >
                <span className="text-stone-400">{flour}:</span>
                <span className="font-bold text-amber-400 font-mono">{kg} kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Grid: Bread Breakdown + Start New Batch Wizard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Bread orders breakdown for this date */}
        <div className="lg:col-span-2 bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-stone-100 font-serif">
                Sipariş Edilen Ekmekler ({neededBreads.reduce((s, b) => s + b.count, 0)} adet)
              </h3>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              Teslimat: {selectedDate}
            </span>
          </div>

          {neededBreads.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs bg-stone-950/40 rounded-xl border border-stone-800">
              Bu tarihe ait kayıtlı ekmek siparişi henüz bulunmuyor. Dükkan tezgahı için parti başlatabilirsiniz.
            </div>
          ) : (
            <div className="divide-y divide-stone-800/80 border border-stone-800 rounded-xl overflow-hidden bg-stone-950/40">
              {neededBreads.map(({ product, count }) => (
                <div
                  key={product.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-stone-900/60 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-stone-200">{product.name}</div>
                    <div className="text-[11px] text-stone-400">
                      Standart gramaj: {product.weight || 800}g
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                      {count} adet
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dükkan Tezgahı Ekstra Pişirim Input */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-stone-200">
                Dükkan Tezgahı ve Vitrin İçin Ekstra Pişirim
              </div>
              <div className="text-[11px] text-stone-400">
                Siparişler dışında vitrinde satılacak günlük ekmek sayısı.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={counterSurplus}
                onChange={(e) => setCounterSurplus(Number(e.target.value))}
                className="w-20 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400 text-center focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-stone-400 font-semibold">adet</span>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Batch Launcher */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-stone-100 font-serif">
                Parti (Batch) Başlat
              </h3>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Bu parti için hamur yoğurma aşamasını başlatın ve 36 saatlik fermantasyonu adım adım takip edin.
            </p>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-stone-300">
                İmalathane / Usta Notu (İsteğe Bağlı)
              </label>
              <textarea
                rows={3}
                placeholder="Örn: Ortam sıcaklığı 22°C, Siyez hamuruna %2 ekstra hidrasyon verildi..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartBatch}
            disabled={creatingBatch}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            <Plus className="w-4 h-4" />
            <span>{creatingBatch ? "Başlatılıyor..." : "Yeni Üretim Partisini Başlat"}</span>
          </button>
        </div>
      </div>

      {/* LIVE BATCHES MONITOR (Unlu Eller Stepper) */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 font-serif">
                Canlı Parti (Batch) Takip Masası
              </h2>
              <p className="text-xs text-stone-400">
                Fırıncının imalathanede tek dokunuşla hamurun aşamasını ilerletebileceği canlı üretim çizelgesi.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-stone-400">
            {dateBatches.length} aktif parti
          </span>
        </div>

        {dateBatches.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-xs bg-stone-950/40 rounded-xl border border-stone-800">
            Seçili tarih için henüz aktif üretim partisi bulunmuyor. Yukarıdan &apos;Yeni Üretim Partisini Başlat&apos; butonuna basabilirsiniz.
          </div>
        ) : (
          <div className="space-y-6">
            {dateBatches.map((batch) => {
              const currentIdx = STAGES.findIndex((s) => s.key === batch.status);

              return (
                <div
                  key={batch.id}
                  className="bg-stone-950/70 border border-stone-800 rounded-2xl p-5 space-y-5"
                >
                  {/* Top Batch Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800/80">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {batch.batchNumber}
                      </span>
                      <span className="text-xs font-bold text-stone-200">
                        Toplam: {batch.totalLoaves} adet ekmek
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {batch.notes && (
                        <span className="text-xs text-stone-400 italic">
                          &quot;{batch.notes}&quot;
                        </span>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`${batch.batchNumber} partisi silinsin mi?`)) {
                            deleteBatch(batch.id);
                          }
                        }}
                        className="p-1 text-stone-500 hover:text-red-400 transition-colors"
                        title="Partiyi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 5 Stage Touch-Friendly Stepper */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {STAGES.map((st, idx) => {
                      const isPast = idx < currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => updateBatchStatus(batch.id, st.key)}
                          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[90px] ${
                            isCurrent
                              ? "bg-amber-500/15 border-amber-500 text-stone-100 ring-1 ring-amber-500/50"
                              : isPast
                              ? "bg-stone-900/60 border-stone-700/60 text-stone-300 hover:border-stone-600"
                              : "bg-stone-950/40 border-stone-850 text-stone-500 hover:text-stone-400"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-lg">{st.icon}</span>
                            {isPast && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-stone-950">
                                ŞU AN
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <div className="text-xs font-bold font-serif">{st.label}</div>
                            <div className="text-[10px] opacity-75 mt-0.5 line-clamp-1">
                              {st.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
