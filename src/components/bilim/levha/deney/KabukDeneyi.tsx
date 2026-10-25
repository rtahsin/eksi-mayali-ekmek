"use client";

import { useState, type ReactNode } from "react";
import { KABUK, virgullu } from "@/lib/bilim";
import d from "./deney.module.css";

// Kabuğun kızarması: iki kilit. Okur yüzey sıcaklığını ve su aktivitesini ayarlar; renk yalnız ikisi birden
// eşiği geçince açılır ve o koşulda geçerli bilgiler anın cümleleriyle belirir. Rengin koyuluğu ölçü değildir.

export function KabukDeneyi({ kilit }: { kilit: Record<"renk" | "maltoz" | "hmf" | "akrilamid", ReactNode> }) {
  const [sicaklik, setSicaklik] = useState(100);
  const [su, setSu] = useState(95); // su aktivitesi × 100
  const isi = sicaklik > KABUK.renkC;
  const kuru = su < KABUK.renkAw * 100;
  const renk = isi && kuru;
  const ekler = [sicaklik > KABUK.maltozC && kilit.maltoz, su < KABUK.hmfAw * 100 && kilit.hmf, sicaklik >= KABUK.akrilamidC && kilit.akrilamid].filter(Boolean);

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <label className={d.kaydirici}>
          <span>
            Yüzey sıcaklığı <output>{sicaklik} °C</output>
          </span>
          <input type="range" aria-label="Yüzey sıcaklığı" min={60} max={200} step={1} value={sicaklik} onChange={(e) => setSicaklik(Number(e.target.value))} />
          <span>{isi ? "kilit açık" : `${KABUK.renkC} °C'yi aşmalı`}</span>
        </label>
        <label className={d.kaydirici}>
          <span>
            Su aktivitesi <output>{virgullu(su / 100)}</output>
          </span>
          <input type="range" aria-label="Su aktivitesi" min={20} max={100} step={1} value={su} aria-valuetext={virgullu(su / 100)} onChange={(e) => setSu(Number(e.target.value))} />
          <span>{kuru ? "kilit açık" : `${virgullu(KABUK.renkAw)}'nın altına inmeli`}</span>
        </label>
      </div>

      <div className={d.levha}>
        <span className={d.levhaNo}>Kabuk yüzeyi · şematik</span>
        <svg className={d.svg} viewBox="0 0 400 150" role="img" aria-label={renk ? "Renk oluşuyor" : "Renk oluşmuyor"}>
          <rect x="20" y="20" width="360" height="90" rx="45" fill={renk ? "color-mix(in srgb, var(--y-kabuk) 85%, #3a1d0c)" : "color-mix(in srgb, #e6d8bb 80%, var(--y-zemin))"} stroke="var(--y-murekkep)" className={d.gecis} />
          <text x="200" y="138" textAnchor="middle" className={d.svgSoluk}>
            {isi ? "sıcaklık ✓" : "sıcaklık ✗"} · {kuru ? "kuruluk ✓" : "kuruluk ✗"}
          </text>
        </svg>
        <p className={d.durum} aria-live="polite">
          <b>{renk ? "Renk oluşuyor." : "Renk oluşmuyor."}</b> {renk ? "" : "İki kilit birlikte açılmalı."}
        </p>
        <p className={d.cumle}>{kilit.renk}</p>
        <div aria-live="polite">
          {ekler.map((e, i) => (
            <p key={i} className={d.cumle}>
              {e}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
