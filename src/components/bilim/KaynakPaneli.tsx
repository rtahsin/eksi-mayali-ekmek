"use client";

import { useEffect, useRef, useState } from "react";
import { KANIT_ETIKETI, type AtifKarti } from "@/lib/bilim";
import s from "./bilim.module.css";

// Sayfadaki her [data-atif] düğmesini dinler; dokunulan cümlenin bilgilerini ve kaynaklarını kartta açar.

export function KaynakPaneli({ kartlar }: { kartlar: Record<string, AtifKarti> }) {
  const [acik, setAcik] = useState<string[] | null>(null);
  const tetik = useRef<HTMLElement | null>(null);
  const kapat = useRef<HTMLButtonElement>(null);
  const kart = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function tikla(e: MouseEvent) {
      const d = (e.target as HTMLElement).closest<HTMLElement>("[data-atif]");
      if (!d) return;
      tetik.current = d;
      setAcik((d.dataset.atif ?? "").split(" ").filter((id) => kartlar[id]));
    }
    document.addEventListener("click", tikla);
    return () => document.removeEventListener("click", tikla);
  }, [kartlar]);

  useEffect(() => {
    if (!acik) return;
    kapat.current?.focus();
    // Kart açıkken Tab odağı kartın içinde döndürür; arkadaki sayfaya kaçmaz.
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") setAcik(null);
      if (e.key !== "Tab" || !kart.current) return;
      const odaklar = [...kart.current.querySelectorAll<HTMLElement>("button, a[href]")];
      const ilk = odaklar[0];
      const son = odaklar[odaklar.length - 1];
      const icerde = kart.current.contains(document.activeElement);
      if (!icerde || (e.shiftKey && document.activeElement === ilk)) {
        e.preventDefault();
        (e.shiftKey ? son : ilk)?.focus();
      } else if (!e.shiftKey && document.activeElement === son) {
        e.preventDefault();
        ilk?.focus();
      }
    }
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("keydown", tus);
      tetik.current?.focus();
    };
  }, [acik]);

  if (!acik || acik.length === 0) return null;
  return (
    <>
      <div className={s.perde} onClick={() => setAcik(null)} aria-hidden="true" />
      <div ref={kart} className={s.panel} role="dialog" aria-modal="true" aria-labelledby="kaynak-karti-baslik">
        <div className={s.panelUst}>
          <strong id="kaynak-karti-baslik">Kaynak kartı</strong>
          <button ref={kapat} type="button" className={s.kapat} onClick={() => setAcik(null)}>
            Kapat
          </button>
        </div>
        {acik.map((id) => {
          const k = kartlar[id];
          return (
            <section key={id} className={s.bilgi}>
              <span className={s.kucukBaslik}>{KANIT_ETIKETI[k.durum]}</span>
              <p>{k.metin}</p>
              {k.kosul && (
                <p className={s.kosul}>
                  <span className={s.kucukBaslik}>Hangi koşulda ölçüldü</span>
                  {k.kosul}
                </p>
              )}
              {k.kaynaklar.map((r, i) => (
                <p key={i} className={s.kaynakSatir}>
                  <span>
                    {r.baslik}
                    {r.dergi && ` · ${r.dergi}`}
                    {r.yil && ` · ${r.yil}`}
                  </span>
                  {r.doi ? (
                    <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer">
                      doi:{r.doi}
                    </a>
                  ) : null}
                  {r.yer && ` · ${r.yer}`}
                </p>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
