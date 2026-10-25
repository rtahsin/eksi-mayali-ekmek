import type { ReactNode } from "react";
import g from "./grafik.module.css";

// Şematik ekmek kesiti: merkezden kabuğa ve çatlağa giden buhar (Soğuma anı). Sayısı (100 °C) bağlı bilginin
// metninde geçer (levha.check.test.ts). Çizgi dili sayfanın --y-… değişkenlerinden.

const DIS = "M30,232 C30,120 110,40 200,40 C290,40 370,120 370,232 Z";
const IC = "M46,232 C46,132 120,56 200,56 C280,56 354,132 354,232 Z";
const GOZENEK: [number, number, number][] = [
  [120, 170, 7], [150, 120, 5], [175, 190, 9], [230, 175, 6], [260, 125, 8], [290, 195, 5], [205, 105, 4],
  [95, 205, 5], [315, 160, 6], [140, 215, 4], [250, 215, 7], [185, 140, 3], [330, 210, 4], [70, 180, 4],
];

export function Kesit({ no, baslik, alt }: { no: string; baslik: string; alt?: ReactNode }) {
  return (
    <figure className={g.sekil}>
      <figcaption className={g.ust}>
        <span className={g.no}>{no}</span>
        <span className={g.baslik}>{baslik}</span>
      </figcaption>
      <svg viewBox="0 0 400 260" className={g.kesitSvg} role="img" aria-label="Şematik ekmek kesiti: merkezden kabuğa ve çatlağa giden buhar">
        <defs>
          <pattern id="kesitTarama" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className={g.tarama} />
          </pattern>
          <marker id="kesitOk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className={g.okUcu} />
          </marker>
          <clipPath id="kesitCatlak">
            <path d="M0,0 H400 V260 H0 Z M214,20 L228,62 L240,20 Z" clipRule="evenodd" />
          </clipPath>
        </defs>
        <g clipPath="url(#kesitCatlak)">
          <path d={DIS} className={g.kabukDolgu} />
          <path d={DIS} fill="url(#kesitTarama)" />
          <path d={IC} className={g.icDolgu} />
        </g>
        {GOZENEK.map(([cx, cy, r], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * 0.8} className={g.gozenek} />
        ))}
        <line x1="20" x2="380" y1="232" y2="232" className={g.taban} />
        <path d="M200,160 L72,196" className={g.ok} markerEnd="url(#kesitOk)" />
        <path d="M200,160 L334,190" className={g.ok} markerEnd="url(#kesitOk)" />
        <path d="M200,160 L226,70" className={g.okGuclu} markerEnd="url(#kesitOk)" />
        <circle cx="200" cy="160" r="6" className={g.merkez} />
        <text x="200" y="194" className={g.kesitEtiket} textAnchor="middle">
          merkez · 100 °C
        </text>
        <text x="244" y="34" className={g.kesitEtiket}>
          çatlak
        </text>
        <text x="318" y="56" className={g.kesitEtiket}>
          kabuk
        </text>
        <text x="100" y="150" className={g.kesitEtiket}>
          iç
        </text>
      </svg>
      <p className={g.alt}>
        <span className={g.kanit}>şematik</span> {alt}
      </p>
    </figure>
  );
}
