"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { GAZ } from "@/lib/bilim";
import d from "./deney.module.css";

// Kabarırken doğan gaz ve koku: şekeri ver. Okur şekerleri maya hücresine sürükler (ya da dokunur);
// glukoz ve fruktoz hamurda durdukça maltoz geri döner. Her alınan şekerle aynı ürünler yanar.
// Kavanozdaki kabarma şematiktir.

type Seker = (typeof GAZ.sekerler)[number];
const BASLANGIC: Seker[] = ["glukoz", "maltoz", "fruktoz", "maltoz", "glukoz", "maltoz", "fruktoz", "maltoz", "maltoz"];
const RENK: Record<Seker, string> = { glukoz: "var(--y-ic)", fruktoz: "var(--y-notr)", maltoz: "var(--y-kabuk)" };

export function GazDeneyi({ baski, ayni }: { baski: ReactNode; ayni: ReactNode }) {
  const hucre = useRef<HTMLDivElement>(null);
  const [kalan, setKalan] = useState<(Seker | null)[]>(BASLANGIC);
  const [geri, setGeri] = useState<number | null>(null);
  const [baskiGoruldu, setBaskiGoruldu] = useState(false);
  const [durum, setDurum] = useState("");
  const [surukle, setSurukle] = useState<{ i: number; x0: number; y0: number; dx: number; dy: number } | null>(null);

  const verilen = kalan.filter((k) => k === null).length;
  const gfKaldi = kalan.some((k) => k === "glukoz" || k === "fruktoz");
  const bitti = verilen === BASLANGIC.length;

  function ver(i: number) {
    const k = kalan[i];
    if (!k) return;
    if (k === "maltoz" && gfKaldi) {
      setGeri(i);
      setBaskiGoruldu(true);
      setDurum("Maltoz geri döndü: hamurda glukoz ya da fruktoz var.");
      window.setTimeout(() => setGeri((g) => (g === i ? null : g)), 600);
      return;
    }
    setKalan((l) => l.map((x, j) => (j === i ? null : x)));
    setDurum(`Hücre ${k}u aldı.`);
  }
  function bas(e: PointerEvent<HTMLButtonElement>, i: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSurukle({ i, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 });
  }
  function sur(e: PointerEvent<HTMLButtonElement>) {
    setSurukle((s) => (s ? { ...s, dx: e.clientX - s.x0, dy: e.clientY - s.y0 } : s));
  }
  function birak(e: PointerEvent<HTMLButtonElement>) {
    const s = surukle;
    setSurukle(null);
    if (!s) return;
    const r = hucre.current?.getBoundingClientRect();
    const dokunma = Math.hypot(s.dx, s.dy) < 8;
    const icinde = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (dokunma || icinde) ver(s.i);
  }

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <p className={d.etiket}>Hamurdaki şekerler · sürükle ya da dokun</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {kalan.map((k, i) =>
            k ? (
              <button
                key={i}
                type="button"
                className={d.dugme}
                onPointerDown={(e) => bas(e, i)}
                onPointerMove={sur}
                onPointerUp={birak}
                onClick={(e) => e.detail === 0 && ver(i)}
                style={{
                  touchAction: "none",
                  borderColor: RENK[k],
                  boxShadow: `inset 4px 0 0 ${RENK[k]}`,
                  transform: surukle?.i === i ? `translate(${surukle.dx}px, ${surukle.dy}px)` : geri === i ? "translateX(-8px)" : undefined,
                  position: "relative",
                  zIndex: surukle?.i === i ? 2 : undefined,
                }}
              >
                {k}
              </button>
            ) : null,
          )}
          {bitti && <span className={d.durum}>Hamurda şeker kalmadı.</span>}
        </div>
        <p className={d.durum} aria-live="polite">
          {durum}
        </p>
        {baskiGoruldu && <p className={d.cumle}>{baski}</p>}
        {bitti && <p className={d.durum}>{ayni}</p>}
        <button
          type="button"
          className={d.dugme}
          onClick={() => {
            setKalan(BASLANGIC);
            setDurum("");
            setBaskiGoruldu(false);
          }}
        >
          Baştan
        </button>
      </div>

      <div className={d.levha}>
        <span className={d.levhaNo}>Maya hücresi ve kavanoz · şematik</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "end" }}>
          <div ref={hucre} style={{ aspectRatio: "1", border: "1px solid var(--y-murekkep)", borderRadius: "50%", display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--y-kabuk) 8%, var(--y-zemin))" }}>
            <span className={d.etiket} style={{ width: "auto", textAlign: "center" }}>
              maya hücresi
              <br />
              {verilen} şeker aldı
            </span>
          </div>
          <svg className={d.svg} viewBox="0 0 100 140" aria-hidden="true" style={{ maxWidth: 160, margin: "0 auto" }}>
            <rect x="10" y="10" width="80" height="120" fill="none" stroke="var(--y-murekkep)" />
            <rect x="11" y={130 - 30 - (verilen / BASLANGIC.length) * 80} width="78" height={30 + (verilen / BASLANGIC.length) * 80} fill="color-mix(in srgb, #e6d8bb 75%, var(--y-zemin))" className={d.gecis} />
          </svg>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexWrap: "wrap", gap: 8 }} aria-label="Ürünler">
          {GAZ.urunler.map((u) => (
            <li key={u} className={d.etiket} style={{ width: "auto", padding: "4px 8px", border: "1px solid var(--y-cizgi)", background: verilen > 0 ? "color-mix(in srgb, var(--y-kabuk) 16%, transparent)" : "transparent", color: verilen > 0 ? "var(--y-murekkep)" : undefined }}>
              {u}
            </li>
          ))}
        </ul>
        <p className={d.sema}>Her alınan şekerle aynı beş ürün yanar. Kabarma ve hücre şematik.</p>
      </div>
    </div>
  );
}
