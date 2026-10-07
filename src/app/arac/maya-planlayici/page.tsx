"use client";

import React, { useState, useMemo } from "react";
import {
  calculateStarterFeeding,
  RATIO_PROFILES,
} from "@/lib/baking/starter";
import { StarterFeedingInput, StarterFeedingRatio } from "@/lib/baking/types";
import {
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export default function MayaPlanlayiciPage() {
  const [targetStarterWeight, setTargetStarterWeight] = useState<number>(150);
  const [ratio, setRatio] = useState<StarterFeedingRatio>("1:2:2");
  const [ambientTemp, setAmbientTemp] = useState<number>(24);

  // Varsayılan hedef yoğurma zamanı: 6 saat sonrası
  const [targetTimeStr, setTargetTimeStr] = useState<string>(() => {
    const d = new Date(Date.now() + 6 * 3600 * 1000);
    // YYYY-MM-DDTHH:mm
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const input: StarterFeedingInput = useMemo(
    () => ({
      targetStarterWeight,
      ratio,
      ambientTemp,
      targetBakingTime: targetTimeStr ? new Date(targetTimeStr) : undefined,
    }),
    [targetStarterWeight, ratio, ambientTemp, targetTimeStr]
  );

  const result = useMemo(() => calculateStarterFeeding(input), [input]);

  const activeProfile = RATIO_PROFILES[ratio];

  return (
    <div className="space-y-8">
      {/* Başlık ve Açıklama */}
      <section className="space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2">
          <Clock className="w-7 h-7 text-accent" />
          <span>Ekşi Maya Besleme ve Zamanlayıcı</span>
        </h2>
        <p className="text-sm text-ink-muted">
          Hedef yoğurma saatinize göre mayanızı tam zirve (peak) anında yakalamak için
          ne zaman, hangi oranla ve kaç gram beslemeniz gerektiğini planlayın.
        </p>
      </section>

      {/* Grid: Sol Form / Sağ Zaman Çizelgesi ve Gramaj */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sol Sütun: Parametreler (7 sütun) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hedef Maya Miktarı */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold block">
                  1. Tarifte Gereken Aktif Maya Miktarı
                </label>
                <span className="text-xs text-ink-muted">
                  Hamurunuza katılacak toplam olgun maya miktarı (g)
                </span>
              </div>
              <span className="font-mono text-2xl font-bold text-accent">
                {targetStarterWeight}g
              </span>
            </div>

            <input
              type="range"
              min={50}
              max={600}
              step={10}
              value={targetStarterWeight}
              onChange={(e) => setTargetStarterWeight(Number(e.target.value))}
              className="w-full accent-accent"
            />

            <div className="flex justify-between text-xs text-ink-muted font-mono">
              <span>80g (1 küçük somun)</span>
              <span>150g (Standart 1 büyük somun)</span>
              <span>300g (2 somun)</span>
            </div>
          </div>

          {/* Besleme Oranı Seçimi */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold block">
                2. Besleme Oranı (Ana Maya : Un : Su)
              </label>
              <span className="text-xs text-ink-muted">
                Un ve su miktarı arttıkça mayanın gıdayı tüketip zirveye ulaşma süresi uzar.
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(Object.keys(RATIO_PROFILES) as StarterFeedingRatio[]).map((r) => {
                const profile = RATIO_PROFILES[r];
                const selected = ratio === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRatio(r)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-line bg-bg hover:border-accent/40"
                    }`}
                  >
                    <div className="font-mono text-sm font-bold text-ink">{r}</div>
                    <div className="text-xs text-accent font-medium mt-0.5">
                      ~{profile.baseHoursAt24C} saat
                    </div>
                    <div className="text-xs text-ink-muted mt-1 leading-tight line-clamp-2">
                      {profile.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ortam Sıcaklığı */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold block">
                  3. Mayalanma Ortam Sıcaklığı
                </label>
                <span className="text-xs text-ink-muted">
                  Maya ve laktik asit bakterilerinin metabolizma hızı sıcaklığa doğrudan bağlıdır.
                </span>
              </div>
              <span className="font-mono text-2xl font-bold text-ink">
                {ambientTemp}°C
              </span>
            </div>

            <input
              type="range"
              min={18}
              max={30}
              step={0.5}
              value={ambientTemp}
              onChange={(e) => setAmbientTemp(Number(e.target.value))}
              className="w-full accent-accent"
            />

            <div className="flex justify-between text-xs text-ink-muted font-mono">
              <span>18°C (Serin/Yavaş)</span>
              <span>24°C (Standart Oda)</span>
              <span>28°C (Ilık/Hızlı)</span>
            </div>
          </div>

          {/* Hedef Yoğurma Zamanı */}
          <div className="p-5 rounded-2xl border border-line bg-cream-surface space-y-3">
            <label className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold block">
              4. Hamuru Yoğurmak İstediğiniz Zaman (Hedef Zirve Anı)
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent shrink-0" />
              <input
                type="datetime-local"
                value={targetTimeStr}
                onChange={(e) => setTargetTimeStr(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-line bg-bg text-ink text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Sağ Sütun: Besleme Reçetesi ve Zaman Planı (5 sütun) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Besleme Gramaj Tablosu */}
          <div className="p-6 rounded-2xl border-2 border-line bg-cream-surface shadow-sm space-y-5">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                BESLEME FORMÜLÜ ({ratio})
              </span>
              <h3 className="font-serif text-2xl font-bold text-ink mt-0.5">
                Kavanoza Eklenecekler
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-bg border border-line">
                <span className="text-xs text-ink-muted block">Ana Maya</span>
                <span className="font-mono text-lg font-bold text-accent">
                  {result.seedStarterWeight}g
                </span>
              </div>
              <div className="p-3 rounded-xl bg-bg border border-line">
                <span className="text-xs text-ink-muted block">Un (Besin)</span>
                <span className="font-mono text-lg font-bold text-ink">
                  {result.flourWeight}g
                </span>
              </div>
              <div className="p-3 rounded-xl bg-bg border border-line">
                <span className="text-xs text-ink-muted block">İçme Suyu</span>
                <span className="font-mono text-lg font-bold text-ink">
                  {result.waterWeight}g
                </span>
              </div>
            </div>

            <div className="text-xs text-ink-muted border-t border-line/60 pt-3 flex justify-between">
              <span>Toplam Karışım Ağırlığı:</span>
              <span className="font-mono font-bold text-ink">{result.totalWeight}g</span>
            </div>
          </div>

          {/* Zaman Çizelgesi ve Zirve Penceresi */}
          <div className="p-6 rounded-2xl border border-line bg-cream-surface space-y-5">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                ZAMAN PLANI & FERMANTASYON EĞRİSİ
              </span>
              <h4 className="font-serif text-lg font-bold text-ink mt-0.5">
                Tahmini Zirve Süresi: ~{result.estimatedPeakHours} Saat
              </h4>
            </div>

            {/* Önerilen Besleme Saati */}
            {result.suggestedFeedingTime && (
              <div className="p-4 rounded-xl bg-bg border border-accent/40 space-y-1">
                <span className="text-xs text-ink-muted block">Mayayı Beslemeniz Gereken Saat:</span>
                <div className="font-mono text-xl font-bold text-accent">
                  {result.suggestedFeedingTime}
                </div>
                <span className="text-xs text-ink-muted">
                  Hedef yoğurma saatinden {result.estimatedPeakHours} saat önce besleyiniz.
                </span>
              </div>
            )}

            {/* Zirve Penceresi */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-ink font-medium">İdeal Zirve Penceresi:</span>
                <span className="font-mono text-ink font-bold">
                  {result.peakWindowStartHours}. saat — {result.peakWindowEndHours}. saat arası
                </span>
              </div>

              {/* Görsel İlerleme Çubuğu */}
              <div className="h-3 rounded-full bg-bg border border-line overflow-hidden flex">
                <div className="w-[30%] bg-amber-200" title="Uyanış & Gaz Üretimi Başlangıcı" />
                <div className="w-[40%] bg-accent" title="Aktif Zirve (Hamura Katılacak An)" />
                <div className="w-[30%] bg-stone-300" title="Çöküş & Asitlenme" />
              </div>
              <div className="flex justify-between text-xs text-ink-muted font-mono">
                <span>Başlangıç</span>
                <span className="text-accent font-bold">ZİRVE (2.5-3x)</span>
                <span>Çöküş</span>
              </div>
            </div>

            {/* Atölye İpuçları */}
            <div className="border-t border-line/60 pt-4 space-y-2 text-xs text-ink-muted">
              <div className="font-semibold text-ink flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Zirve (Peak) Nasıl Anlaşılır?</span>
              </div>
              <ul className="space-y-1 list-disc list-inside">
                <li>Kavanoz yüzeyi düzleşir ve hafif kubbe şeklini korur.</li>
                <li>Hacimce başlangıcın 2.5 ila 3 katına ulaşmıştır.</li>
                <li>Ilık bir suya bir tatlı kaşığı bırakıldığında batmadan yüzer (Yüzme Testi).</li>
                <li>Koku profili keskin sirke değil, tatlı-meyvemsi bir fermantasyon kokusudur.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
