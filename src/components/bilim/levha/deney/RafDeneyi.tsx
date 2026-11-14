"use client";

import { useState, type ReactNode } from "react";
import { StalingSimulator } from "@/components/bilim/StalingSimulator";
import d from "./deney.module.css";

// Rafta ilk hafta: Canlı Avrami nişasta kristalleşme & 200°C termal çözünme simülatörü +
// üç şüphelinin kaynaklı kanıt dosyası.

export interface Supheli {
  ad: string;
  lehine: ReactNode;
  ama: ReactNode;
}

export interface RafDeneyiProps {
  supheliler: Supheli[];
  karar: ReactNode;
  kayit?: () => void;
}

export function RafDeneyi({ supheliler, karar, kayit }: RafDeneyiProps) {
  const [secili, setSecili] = useState(0);
  const [bakilan, setBakilan] = useState<number[]>([0]);

  const ac = (i: number) => {
    setSecili(i);
    setBakilan((b) => (b.includes(i) ? b : [...b, i]));
    kayit?.();
  };

  const hepsi = bakilan.length === supheliler.length;
  const sp = bakilan.includes(secili) ? supheliler[secili] : null;

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <StalingSimulator onInteract={() => kayit?.()} />

      {supheliler.length > 0 && (
        <div className={d.duzen}>
          <div className={d.denetim}>
            <p className={d.etiket}>
              Literatürdeki üç şüpheli · {bakilan.length}/{supheliler.length} dosya incelendi
            </p>
            {supheliler.map((x, i) => (
              <button
                key={x.ad}
                type="button"
                className={d.dugme}
                aria-pressed={bakilan.includes(i) && secili === i}
                onClick={() => ac(i)}
                style={{
                  textAlign: "left",
                  fontFamily: "var(--f-serif)",
                  fontSize: 18,
                  padding: "10px 16px",
                }}
              >
                Dosya {i + 1}: {x.ad}{" "}
                {bakilan.includes(i) && secili !== i ? "· incelendi" : ""}
              </button>
            ))}
          </div>
          <div className={d.levha} aria-live="polite">
            <span className={d.levhaNo}>
              {sp ? `Dosya ${secili + 1}` : "Dosya kapalı"}
            </span>
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
              <p className={d.durum}>İncelemek için bir kanıt dosyası seç.</p>
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
      )}
    </div>
  );
}
