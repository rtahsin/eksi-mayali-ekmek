"use client";

import { useState, type ReactNode } from "react";
import d from "./deney.module.css";

// Rafta ilk hafta: "Kim bayatlattı?" Okur üç şüphelinin dosyasını açar; lehine ve "ama"sı anın cümleleriyle
// çıkar. Üçü de açılınca karar belirir.

export interface Supheli {
  ad: string;
  lehine: ReactNode;
  ama: ReactNode;
}

export function RafDeneyi({ supheliler, karar }: { supheliler: Supheli[]; karar: ReactNode }) {
  const [secili, setSecili] = useState(0);
  const [bakilan, setBakilan] = useState<number[]>([]);
  const ac = (i: number) => {
    setSecili(i);
    setBakilan((b) => (b.includes(i) ? b : [...b, i]));
  };
  const hepsi = bakilan.length === supheliler.length;
  const sp = bakilan.includes(secili) ? supheliler[secili] : null;

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <p className={d.etiket}>Şüpheliler · {bakilan.length}/{supheliler.length} dosya açıldı</p>
        {supheliler.map((x, i) => (
          <button key={x.ad} type="button" className={d.dugme} aria-pressed={bakilan.includes(i) && secili === i} onClick={() => ac(i)} style={{ textAlign: "left", fontFamily: "var(--f-serif)", fontSize: 18, padding: "10px 16px" }}>
            Dosya {i + 1}: {x.ad} {bakilan.includes(i) && secili !== i ? "· açıldı" : ""}
          </button>
        ))}
      </div>
      <div className={d.levha} aria-live="polite">
        <span className={d.levhaNo}>{sp ? `Dosya ${secili + 1}` : "Dosya kapalı"}</span>
        {sp ? (
          <>
            <p className={d.durum}>
              <b>{sp.ad}</b>
            </p>
            <p className={d.etiket} style={{ marginTop: 14 }}>
              Lehine
            </p>
            <p className={d.cumle}>{sp.lehine}</p>
            <p className={d.etiket} style={{ marginTop: 14 }}>
              Ama
            </p>
            <p className={d.cumle}>{sp.ama}</p>
          </>
        ) : (
          <p className={d.durum}>Bir dosya aç.</p>
        )}
        {hepsi && (
          <>
            <p className={d.etiket} style={{ marginTop: 22 }}>
              Karar
            </p>
            <p className={d.durum}>{karar}</p>
          </>
        )}
      </div>
    </div>
  );
}
