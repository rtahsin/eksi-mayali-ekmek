"use client";

import React, { useState, useMemo } from "react";
import {
  calculateBakersPercentage,
  formatRecipeText,
} from "@/lib/baking/bakersPercentage";
import {
  BakersPercentageInput,
  FlourItem,
  CustomIngredient,
} from "@/lib/baking/types";
import {
  Calculator,
  Copy,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";

interface PresetRecipe {
  name: string;
  flours: FlourItem[];
  hydration: number;
  starter: number;
  salt: number;
  custom?: CustomIngredient[];
}

const PRESETS: PresetRecipe[] = [
  {
    name: "Klasik Ekşi Mayalı Köy Ekmeği (%75)",
    flours: [
      { id: "f1", name: "Ekmeklik Buğday Unu", ratio: 80 },
      { id: "f2", name: "Tam Buğday Unu", ratio: 20 },
    ],
    hydration: 75,
    starter: 20,
    salt: 2.0,
  },
  {
    name: "Rustik Yüksek Hidrasyon (%80)",
    flours: [
      { id: "f1", name: "Sert Ekmeklik Un", ratio: 90 },
      { id: "f2", name: "Karakılçık / Çavdar", ratio: 10 },
    ],
    hydration: 80,
    starter: 20,
    salt: 2.1,
  },
  {
    name: "Zanaatkar Baget (%72)",
    flours: [{ id: "f1", name: "Ekmeklik Tip 550 / 650", ratio: 100 }],
    hydration: 72,
    starter: 15,
    salt: 2.0,
  },
  {
    name: "Atalık Siyez & Karakılçık (%76)",
    flours: [
      { id: "f1", name: "Taş Değirmen Siyez Unu", ratio: 50 },
      { id: "f2", name: "Taş Değirmen Karakılçık", ratio: 50 },
    ],
    hydration: 76,
    starter: 25,
    salt: 2.0,
  },
];

export default function FirinciYuzdesiPage() {
  const [mode, setMode] = useState<"byFlour" | "byTotalDough" | "byLoaves">("byFlour");
  const [totalFlourWeight, setTotalFlourWeight] = useState<number>(500);
  const [targetTotalDough, setTargetTotalDough] = useState<number>(1000);
  const [loafCount, setLoafCount] = useState<number>(1);
  const [loafWeight, setLoafWeight] = useState<number>(850);

  const [flours, setFlours] = useState<FlourItem[]>([
    { id: "f1", name: "Ekmeklik Buğday Unu", ratio: 80 },
    { id: "f2", name: "Tam Buğday Unu", ratio: 20 },
  ]);

  const [hydrationPercent, setHydrationPercent] = useState<number>(75);
  const [starterPercent, setStarterPercent] = useState<number>(20);
  const [saltPercent, setSaltPercent] = useState<number>(2.0);
  const [customIngredients, setCustomIngredients] = useState<CustomIngredient[]>([]);

  const [copied, setCopied] = useState<boolean>(false);

  // Un harmanı oran kontrolü
  const totalFlourRatio = useMemo(
    () => flours.reduce((sum, f) => sum + (Number(f.ratio) || 0), 0),
    [flours]
  );

  // Hesaplama girdisi
  const input: BakersPercentageInput = useMemo(
    () => ({
      mode,
      totalFlourWeight,
      targetTotalDough,
      loafCount,
      loafWeight,
      flours,
      hydrationPercent,
      starterPercent,
      starterHydrationPercent: 100,
      saltPercent,
      customIngredients,
    }),
    [
      mode,
      totalFlourWeight,
      targetTotalDough,
      loafCount,
      loafWeight,
      flours,
      hydrationPercent,
      starterPercent,
      saltPercent,
      customIngredients,
    ]
  );

  const result = useMemo(() => calculateBakersPercentage(input), [input]);

  // Ön ayar yükleme
  const applyPreset = (preset: PresetRecipe) => {
    setFlours(preset.flours);
    setHydrationPercent(preset.hydration);
    setStarterPercent(preset.starter);
    setSaltPercent(preset.salt);
    setCustomIngredients(preset.custom || []);
  };

  // Un ekle / çıkar
  const addFlour = () => {
    setFlours((prev) => [
      ...prev,
      { id: `f_${Date.now()}`, name: "Yeni Un", ratio: 0 },
    ]);
  };

  const updateFlour = (id: string, field: "name" | "ratio", val: string | number) => {
    setFlours((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: val } : f))
    );
  };

  const removeFlour = (id: string) => {
    if (flours.length <= 1) return;
    setFlours((prev) => prev.filter((f) => f.id !== id));
  };

  // Özel malzeme ekle / çıkar
  const addCustomIngredient = () => {
    setCustomIngredients((prev) => [
      ...prev,
      { id: `c_${Date.now()}`, name: "Zeytinyağı", percentage: 3 },
    ]);
  };

  const updateCustomIngredient = (
    id: string,
    field: "name" | "percentage",
    val: string | number
  ) => {
    setCustomIngredients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  const removeCustomIngredient = (id: string) => {
    setCustomIngredients((prev) => prev.filter((c) => c.id !== id));
  };

  // Reçeteyi kopyalama
  const handleCopy = async () => {
    const text = formatRecipeText(result, "EkmekLab Fırıncı Yüzdesi Reçetesi");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Başlık ve Reçete Şablonları */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2">
              <Calculator className="w-7 h-7 text-accent" />
              <span>Fırıncı Yüzdesi Hesaplayıcı</span>
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              Toplam un = %100 kabul edilerek tüm hamur bileşenlerini orantılayan zanaatkar fırıncı formülü.
            </p>
          </div>

          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors shadow-sm font-medium text-sm self-start md:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Reçete Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Reçeteyi Panoya Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* Hazır Atölye Reçeteleri */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted whitespace-nowrap">
            Hazır Reçeteler:
          </span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg border border-line bg-cream-surface hover:border-accent hover:bg-bg text-xs font-medium text-ink transition-colors whitespace-nowrap"
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* Grid: Sol Form / Sağ Canlı Reçete Kartı */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sol Sütun: Parametre Girişleri (7 sütun) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hesaplama Modu Seçici */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-4">
            <label className="text-xs font-mono uppercase tracking-wider text-ink-muted block font-semibold">
              1. Hesaplama Yolu
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode("byFlour")}
                className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                  mode === "byFlour"
                    ? "border-accent bg-accent/10 text-accent font-semibold shadow-sm"
                    : "border-line bg-bg text-ink-muted hover:text-ink"
                }`}
              >
                Un Miktarından
              </button>
              <button
                type="button"
                onClick={() => setMode("byTotalDough")}
                className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                  mode === "byTotalDough"
                    ? "border-accent bg-accent/10 text-accent font-semibold shadow-sm"
                    : "border-line bg-bg text-ink-muted hover:text-ink"
                }`}
              >
                Toplam Hamurdan
              </button>
              <button
                type="button"
                onClick={() => setMode("byLoaves")}
                className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                  mode === "byLoaves"
                    ? "border-accent bg-accent/10 text-accent font-semibold shadow-sm"
                    : "border-line bg-bg text-ink-muted hover:text-ink"
                }`}
              >
                Somun Adedinden
              </button>
            </div>

            {/* Mod girdileri */}
            {mode === "byFlour" && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs text-ink font-medium flex justify-between">
                  <span>Toplam Baz Un Miktarı (g)</span>
                  <span className="font-mono text-accent font-bold">{totalFlourWeight}g</span>
                </label>
                <input
                  type="number"
                  min={100}
                  max={50000}
                  step={50}
                  value={totalFlourWeight}
                  onChange={(e) => setTotalFlourWeight(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3.5 py-2 rounded-xl border border-line bg-bg text-ink font-mono text-sm focus:outline-none focus:border-accent"
                />
              </div>
            )}

            {mode === "byTotalDough" && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs text-ink font-medium flex justify-between">
                  <span>Hedef Toplam Hamur Ağırlığı (g)</span>
                  <span className="font-mono text-accent font-bold">{targetTotalDough}g</span>
                </label>
                <input
                  type="number"
                  min={200}
                  max={100000}
                  step={50}
                  value={targetTotalDough}
                  onChange={(e) => setTargetTotalDough(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3.5 py-2 rounded-xl border border-line bg-bg text-ink font-mono text-sm focus:outline-none focus:border-accent"
                />
              </div>
            )}

            {mode === "byLoaves" && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-ink font-medium">Somun Adedi</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={loafCount}
                    onChange={(e) => setLoafCount(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 rounded-xl border border-line bg-bg text-ink font-mono text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-ink font-medium">Somun Başı Ağırlık (g)</label>
                  <input
                    type="number"
                    min={100}
                    max={2500}
                    step={25}
                    value={loafWeight}
                    onChange={(e) => setLoafWeight(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 rounded-xl border border-line bg-bg text-ink font-mono text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Un Harmanı Yönetimi */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-muted block font-semibold">
                  2. Un Harmanı Dağılımı
                </label>
                <span className="text-xs text-ink-muted">
                  Toplam oran: %{totalFlourRatio} {totalFlourRatio !== 100 && "(%100'e otomatik dengelenir)"}
                </span>
              </div>
              <button
                type="button"
                onClick={addFlour}
                className="px-2.5 py-1.5 rounded-lg border border-line hover:border-accent bg-bg text-xs font-medium text-ink flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-accent" />
                <span>Un Çeşidi Ekle</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {flours.map((flour) => (
                <div key={flour.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={flour.name}
                    onChange={(e) => updateFlour(flour.id, "name", e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-line bg-bg text-xs sm:text-sm text-ink focus:outline-none focus:border-accent"
                    placeholder="Un adı"
                  />
                  <div className="relative w-24">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={flour.ratio}
                      onChange={(e) => updateFlour(flour.id, "ratio", Number(e.target.value))}
                      className="w-full pr-6 pl-3 py-1.5 rounded-xl border border-line bg-bg text-xs sm:text-sm text-ink font-mono focus:outline-none focus:border-accent text-right"
                    />
                    <span className="absolute right-2.5 top-2 text-xs text-ink-muted font-mono">%</span>
                  </div>
                  {flours.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFlour(flour.id)}
                      className="p-2 text-ink-muted hover:text-bad transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Temel Fırıncı Oranları (Hidrasyon, Maya, Tuz) */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-6">
            <label className="text-xs font-mono uppercase tracking-wider text-ink-muted block font-semibold">
              3. Temel Formül Oranları (Un = %100)
            </label>

            {/* Hidrasyon */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-ink">Hidrasyon (Su Oranı)</span>
                <span className="font-mono text-accent font-bold text-base">%{hydrationPercent}</span>
              </div>
              <input
                type="range"
                min={55}
                max={95}
                step={1}
                value={hydrationPercent}
                onChange={(e) => setHydrationPercent(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[11px] text-ink-muted font-mono">
                <span>%55 (Sert/Simit)</span>
                <span>%75 (Standart Köy)</span>
                <span>%90 (Ciabatta/Tava)</span>
              </div>
            </div>

            {/* Ekşi Maya */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-ink">Ekşi Maya Oranı</span>
                <span className="font-mono text-accent font-bold text-base">%{starterPercent}</span>
              </div>
              <input
                type="range"
                min={5}
                max={35}
                step={1}
                value={starterPercent}
                onChange={(e) => setStarterPercent(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[11px] text-ink-muted font-mono">
                <span>%5 (Uzun Soğuk)</span>
                <span>%20 (Standart)</span>
                <span>%35 (Hızlı Hamur)</span>
              </div>
            </div>

            {/* Tuz */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-ink">Kaya / Deniz Tuzu Oranı</span>
                <span className="font-mono text-accent font-bold text-base">%{saltPercent}</span>
              </div>
              <input
                type="range"
                min={1.2}
                max={2.8}
                step={0.1}
                value={saltPercent}
                onChange={(e) => setSaltPercent(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[11px] text-ink-muted font-mono">
                <span>%1.5 (Hafif)</span>
                <span>%2.0 (İdeal Zanaatkar)</span>
                <span>%2.5 (Belirgin)</span>
              </div>
            </div>
          </div>

          {/* Ekstra Malzemeler (Opsiyonel) */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-muted block font-semibold">
                  4. Ekstra Katkılar (Opsiyonel)
                </label>
                <span className="text-xs text-ink-muted">Tohum, zeytinyağı, ceviz vb.</span>
              </div>
              <button
                type="button"
                onClick={addCustomIngredient}
                className="px-2.5 py-1.5 rounded-lg border border-line hover:border-accent bg-bg text-xs font-medium text-ink flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-accent" />
                <span>Malzeme Ekle</span>
              </button>
            </div>

            {customIngredients.length === 0 ? (
              <p className="text-xs text-ink-muted italic py-1">
                Henüz ekstra malzeme eklenmedi.
              </p>
            ) : (
              <div className="space-y-2.5">
                {customIngredients.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateCustomIngredient(item.id, "name", e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-line bg-bg text-xs sm:text-sm text-ink focus:outline-none focus:border-accent"
                      placeholder="Malzeme adı"
                    />
                    <div className="relative w-24">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={item.percentage}
                        onChange={(e) => updateCustomIngredient(item.id, "percentage", Number(e.target.value))}
                        className="w-full pr-6 pl-3 py-1.5 rounded-xl border border-line bg-bg text-xs sm:text-sm text-ink font-mono focus:outline-none focus:border-accent text-right"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-ink-muted font-mono">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomIngredient(item.id)}
                      className="p-2 text-ink-muted hover:text-bad transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Sütun: Canlı Reçete Tablosu ve Özet (5 sütun) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl border-2 border-line bg-cream-surface shadow-sm space-y-6 sticky top-20">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                CANLI FIRINCI REÇETESİ
              </span>
              <h3 className="font-serif text-2xl font-bold text-ink mt-0.5">
                Hamur Gramaj Dağılımı
              </h3>
            </div>

            {/* Temel Metrikler */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-bg border border-line">
                <span className="text-xs text-ink-muted block">Toplam Hamur</span>
                <span className="font-mono text-xl font-bold text-ink">
                  {result.totalDoughWeight}g
                </span>
                <span className="text-[11px] text-ink-muted block mt-0.5">
                  {result.loafCount} somun x {result.loafWeight}g
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-bg border border-line">
                <span className="text-xs text-ink-muted block">Efektif Hidrasyon</span>
                <span className="font-mono text-xl font-bold text-accent">
                  %{result.effectiveHydration}
                </span>
                <span className="text-[11px] text-ink-muted block mt-0.5">
                  Mayadaki su dahil
                </span>
              </div>
            </div>

            {/* Malzeme Tablosu */}
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-bg border-b border-line text-ink-muted font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Bileşen</th>
                    <th className="py-2.5 px-3 text-right">Oran</th>
                    <th className="py-2.5 px-3 text-right">Ağırlık</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {result.ingredients.map((item, idx) => (
                    <tr
                      key={idx}
                      className={
                        item.category === "flour"
                          ? "bg-cream-surface/60 font-medium"
                          : ""
                      }
                    >
                      <td className="py-2.5 px-3 text-ink">
                        <span className="flex items-center gap-1.5">
                          {item.category === "flour" && <span className="w-2 h-2 rounded-full bg-dough" />}
                          {item.category === "water" && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                          {item.category === "starter" && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                          {item.category === "salt" && <span className="w-2 h-2 rounded-full bg-slate-400" />}
                          <span>{item.name}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-ink-muted">
                        %{item.percentage}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-ink">
                        {item.weight}g
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bilgilendirme Notu */}
            <div className="p-3.5 rounded-xl bg-bg/80 border border-line text-xs text-ink-muted flex items-start gap-2">
              <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>
                Fırıncı yüzdesinde toplam baz un daima %100 olarak referans alınır.
                Efektif hidrasyon, ekşi mayanızın (%100 hidrasyonlu) içindeki un ve suyu da hesaba katarak gerçek hamur kıvamını gösterir.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
