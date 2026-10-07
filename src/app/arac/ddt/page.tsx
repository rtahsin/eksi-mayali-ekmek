"use client";

import React, { useState, useMemo } from "react";
import {
  calculateDDTWaterTemp,
  calculateIceRequirement,
  FRICTION_PRESETS,
} from "@/lib/baking/ddt";
import { DDTInput, KneadingMethod } from "@/lib/baking/types";
import {
  Thermometer,
  Snowflake,
  Flame,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";

export default function DDTCalculatorPage() {
  const [targetDDT, setTargetDDT] = useState<number>(25);
  const [roomTemp, setRoomTemp] = useState<number>(23);
  const [flourTemp, setFlourTemp] = useState<number>(22);
  const [kneadingMethod, setKneadingMethod] = useState<KneadingMethod>("stand_mixer");
  const [customFriction, setCustomFriction] = useState<number>(5);

  const [hasStarterTemp, setHasStarterTemp] = useState<boolean>(false);
  const [starterTemp, setStarterTemp] = useState<number>(23);

  // Buz hesaplayıcı girdileri
  const [tapWaterTemp, setTapWaterTemp] = useState<number>(24);
  const [totalWaterWeight, setTotalWaterWeight] = useState<number>(350);

  // DDT Hesaplama
  const ddtInput: DDTInput = useMemo(
    () => ({
      targetDDT,
      roomTemp,
      flourTemp,
      kneadingMethod,
      customFriction,
      starterTemp: hasStarterTemp ? starterTemp : undefined,
    }),
    [
      targetDDT,
      roomTemp,
      flourTemp,
      kneadingMethod,
      customFriction,
      hasStarterTemp,
      starterTemp,
    ]
  );

  const ddtResult = useMemo(() => calculateDDTWaterTemp(ddtInput), [ddtInput]);

  // Buz Hesaplama
  const iceResult = useMemo(
    () =>
      calculateIceRequirement({
        targetWaterTemp: ddtResult.requiredWaterTemp,
        tapWaterTemp,
        totalWaterWeight,
      }),
    [ddtResult.requiredWaterTemp, tapWaterTemp, totalWaterWeight]
  );

  // Duruma göre stil
  const getStatusColor = (status: typeof ddtResult.status) => {
    switch (status) {
      case "ideal":
        return "text-good border-good/40 bg-good/10";
      case "warm":
        return "text-warn border-warn/40 bg-warn/10";
      case "chilled":
        return "text-blue-500 border-blue-400/40 bg-blue-500/10";
      case "needs_ice":
        return "text-cyan-600 border-cyan-400/40 bg-cyan-500/10";
      case "too_hot_warning":
        return "text-bad border-bad/40 bg-bad/10";
      default:
        return "text-ink border-line bg-bg";
    }
  };

  return (
    <div className="space-y-8">
      {/* Başlık ve Giriş */}
      <section className="space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2">
          <Thermometer className="w-7 h-7 text-accent" />
          <span>İstenen Hamur Sıcaklığı (DDT) Hesaplayıcı</span>
        </h2>
        <p className="text-sm text-ink-muted">
          Yoğurma bittiğinde hamurun hedeflediğiniz ideal fermantasyon ısısına ulaşması için
          kullanmanız gereken su sıcaklığını ve yaz aylarında buz miktarını hesaplar.
        </p>
      </section>

      {/* Grid: Sol Form / Sağ Sonuç & Termal Durum */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sol: Girdi Parametreleri (7 sütun) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hedef DDT */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold block">
                  1. Hedef Hamur Sıcaklığı (DDT)
                </label>
                <span className="text-xs text-ink-muted">
                  Zanaatkar ekşi mayalı hamurlar için genelde 24°C - 26°C idealdir.
                </span>
              </div>
              <span className="font-mono text-2xl font-bold text-accent">
                {targetDDT}°C
              </span>
            </div>

            <input
              type="range"
              min={21}
              max={29}
              step={0.5}
              value={targetDDT}
              onChange={(e) => setTargetDDT(Number(e.target.value))}
              className="w-full accent-accent"
            />

            <div className="flex justify-between text-xs text-ink-muted font-mono">
              <span>21°C (Yavaş/Serin)</span>
              <span>25°C (Dengeli Standart)</span>
              <span>28°C (Hızlı Hamur)</span>
            </div>
          </div>

          {/* Ortam ve Un Sıcaklıkları */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-5">
            <label className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold block">
              2. Mevcut Sıcaklık Ölçümleri
            </label>

            {/* Oda Sıcaklığı */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-ink">Ortam / Mutfak Sıcaklığı</span>
                <span className="font-mono text-ink font-bold text-sm">{roomTemp}°C</span>
              </div>
              <input
                type="range"
                min={15}
                max={36}
                step={0.5}
                value={roomTemp}
                onChange={(e) => setRoomTemp(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            {/* Un Sıcaklığı */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-ink">Un Sıcaklığı (Çuval / Kavanoz)</span>
                <span className="font-mono text-ink font-bold text-sm">{flourTemp}°C</span>
              </div>
              <input
                type="range"
                min={15}
                max={36}
                step={0.5}
                value={flourTemp}
                onChange={(e) => setFlourTemp(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <span className="text-xs text-ink-muted">
                Un genellikle oda sıcaklığına yakındır (Ölçüm yapmadıysanız oda ısısı ile aynı giriniz).
              </span>
            </div>
          </div>

          {/* Yoğurma Yöntemi & Sürtünme Faktörü */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold block">
                3. Yoğurma Yöntemi ve Sürtünme Isısı
              </label>
              <span className="text-xs text-ink-muted">
                Yoğurma sırasında mekanik enerji hamura ısı olarak transfer olur.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(Object.keys(FRICTION_PRESETS) as KneadingMethod[])
                .filter((k) => k !== "custom")
                .map((key) => {
                  const preset = FRICTION_PRESETS[key];
                  const selected = kneadingMethod === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setKneadingMethod(key)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-line bg-bg hover:border-accent/40"
                      }`}
                    >
                      <div className="font-medium text-xs text-ink">{preset.label}</div>
                      <div className="font-mono text-accent text-sm font-bold mt-0.5">
                        +{preset.defaultTemp}°C
                      </div>
                      <div className="text-xs text-ink-muted mt-1 leading-tight line-clamp-2">
                        {preset.desc}
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Özel Sürtünme */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <label className="text-ink-muted">Özel Sürtünme Faktörü Girmek İstiyorum</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={customFriction}
                onChange={(e) => {
                  setKneadingMethod("custom");
                  setCustomFriction(Number(e.target.value));
                }}
                className="w-20 px-2 py-1 rounded-lg border border-line bg-bg text-ink font-mono text-right text-xs"
              />
            </div>
          </div>

          {/* 4 Faktörlü: Ön Maya Sıcaklığı Ekleme (Opsiyonel) */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-ink block">
                  Ön Maya / Ekşi Maya Sıcaklığını Ayrı Ekle (4 Faktörlü)
                </label>
                <span className="text-xs text-ink-muted">
                  Eğer mayanız buzdolabından yeni çıktıysa veya oda sıcaklığından çok farklıysa açın.
                </span>
              </div>
              <input
                type="checkbox"
                checked={hasStarterTemp}
                onChange={(e) => setHasStarterTemp(e.target.checked)}
                className="w-4 h-4 accent-accent rounded"
              />
            </div>

            {hasStarterTemp && (
              <div className="pt-2 space-y-1.5 border-t border-line/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink">Ekşi Maya Sıcaklığı</span>
                  <span className="font-mono text-accent font-bold text-sm">
                    {starterTemp}°C
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={30}
                  step={0.5}
                  value={starterTemp}
                  onChange={(e) => setStarterTemp(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sağ: Sonuç Kartı ve Buz Hesaplayıcı (5 sütun) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Ana Sonuç Kartı */}
          <div className="p-6 rounded-2xl border-2 border-line bg-cream-surface shadow-sm space-y-5">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                GEREKEN SU SICAKLIĞI
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif text-5xl font-black text-ink font-mono">
                  {ddtResult.requiredWaterTemp}°C
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getStatusColor(ddtResult.status)}`}>
                  {ddtResult.status === "ideal" && "İdeal Aralık"}
                  {ddtResult.status === "warm" && "Ilık Su"}
                  {ddtResult.status === "chilled" && "Soğutulmuş Su"}
                  {ddtResult.status === "needs_ice" && "Buz İlavesi Gerekli"}
                  {ddtResult.status === "too_hot_warning" && "Aşırı Sıcaklık Uyarısı"}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {ddtResult.note}
            </p>

            {/* Formül Özeti */}
            <div className="p-3.5 rounded-xl bg-bg border border-line text-xs font-mono text-ink-muted space-y-1">
              <div className="text-xs uppercase tracking-wider text-ink font-semibold">
                Uygulanan Formül ({ddtResult.isFourFactor ? "4 Faktörlü" : "3 Faktörlü"}):
              </div>
              <div className="text-ink">
                {ddtResult.isFourFactor
                  ? `(4 × ${targetDDT}) - (${roomTemp} + ${flourTemp} + ${starterTemp} + ${ddtResult.frictionFactor}) = ${ddtResult.requiredWaterTemp}°C`
                  : `(3 × ${targetDDT}) - (${roomTemp} + ${flourTemp} + ${ddtResult.frictionFactor}) = ${ddtResult.requiredWaterTemp}°C`}
              </div>
            </div>
          </div>

          {/* Kırılmış Buz Hesaplayıcı Kartı */}
          <div className="p-6 rounded-2xl border border-line bg-cream-surface space-y-4">
            <div className="flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-blue-500" />
              <h3 className="font-serif text-lg font-bold text-ink">
                Kırılmış Buz Hesaplayıcı
              </h3>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Yaz aylarında musluk suyu {targetDDT}°C altına inemediğinde, suyun erime gizli ısısı (80 cal/g)
              kullanılarak gereken buz miktarı hesaplanır.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs text-ink font-medium">Musluk Suyu Isısı (°C)</label>
                <input
                  type="number"
                  min={10}
                  max={35}
                  value={tapWaterTemp}
                  onChange={(e) => setTapWaterTemp(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl border border-line bg-bg text-ink font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-ink font-medium">Toplam Su Ağırlığı (g)</label>
                <input
                  type="number"
                  min={100}
                  max={5000}
                  step={25}
                  value={totalWaterWeight}
                  onChange={(e) => setTotalWaterWeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl border border-line bg-bg text-ink font-mono text-xs"
                />
              </div>
            </div>

            {/* Buz Çıktısı */}
            <div className="p-4 rounded-xl bg-bg border border-line space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink font-medium flex items-center gap-1.5">
                  <Snowflake className="w-3.5 h-3.5 text-blue-500" />
                  Kırılmış Buz
                </span>
                <span className="font-mono text-blue-600 font-bold text-sm">
                  {iceResult.iceWeight}g
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink font-medium">Musluk Suyu</span>
                <span className="font-mono text-ink font-bold text-sm">
                  {iceResult.tapWaterWeight}g
                </span>
              </div>
              <div className="border-t border-line/60 pt-2 flex justify-between items-center text-xs text-ink-muted">
                <span>Toplam Sıvı (Buz + Su)</span>
                <span className="font-mono font-bold text-ink">
                  {iceResult.totalWater}g
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
