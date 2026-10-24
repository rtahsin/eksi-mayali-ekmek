import type { AtifKarti, Karakter } from "@/lib/bilim";
import { Metin } from "./Metin";
import s from "./bilim.module.css";

// Karakter kartı, müze tip örnek föyü düzeninde. Bölümler katlanır; föy kapalıyken tek cümle görünür.

const TUR_ADI: Record<string, string> = {
  bakteri: "Bakteri",
  maya: "Maya",
  enzim: "Enzim",
  molekul: "Molekül",
  yapi: "Yapı",
};

export function Foy({ karakter, kartlar }: { karakter: Karakter; kartlar: Record<string, AtifKarti> }) {
  return (
    <article className={s.foy}>
      <div className={s.foyUst}>
        <span>Tip örnek föyü · {TUR_ADI[karakter.tur] ?? karakter.tur}</span>
        <span>{karakter.id}</span>
      </div>
      <h3 className={s.tur}>{karakter.ad}</h3>
      {karakter.eski_ad && <p className={s.esAd}>Eski adıyla {karakter.eski_ad}</p>}
      <p>
        <Metin metin={karakter.tek_cumle} kartlar={kartlar} />
      </p>
      <details>
        <summary>Föyün tamamı</summary>
        <dl>
          {karakter.bolumler.map((b) => (
            <div key={b.baslik}>
              <dt>{b.baslik}</dt>
              {b.cumleler.map((c, i) => (
                <dd key={i}>
                  <Metin metin={c} kartlar={kartlar} />
                </dd>
              ))}
            </div>
          ))}
          {karakter.efsane && (
            <div>
              <dt>Efsane</dt>
              <dd>
                <Metin metin={karakter.efsane} kartlar={kartlar} />
              </dd>
            </div>
          )}
        </dl>
      </details>
    </article>
  );
}
