import { KANIT_ETIKETI, findAtiflar, splitCumleler, type AtifKarti } from "@/lib/bilim";

// Dergi düzeninde atıflar: cümle sonunda numaralı dipnot, sayfa sonunda not listesi (kanıt düzeyi + kaynak).

/** Sayfada görünme sırasıyla her atfa bir numara verir. */
export function numaralandir(metinler: string[]): Map<string, number> {
  const no = new Map<string, number>();
  for (const id of metinler.flatMap(findAtiflar)) if (!no.has(id)) no.set(id, no.size + 1);
  return no;
}

// Dizgi: sayı ile birimi ve "30–40" gibi aralıkları satır sonunda ayırma.
const dizgi = (s: string) => s.replace(/(\d) (°C|%|g|cm|mm|dk)/g, "$1 $2").replace(/(\d)–(\d)/g, "$1–⁠$2");

export function Dipnotlu({ metin, no, sinif }: { metin: string; no: Map<string, number>; sinif: string }) {
  return (
    <>
      {splitCumleler(metin).map((c, i) => {
        const sayilar = [...new Set(c.atiflar.map((a) => no.get(a)).filter((n): n is number => n !== undefined))];
        return (
          <span key={i}>
            {i > 0 && " "}
            {dizgi(c.govde)}
            {sayilar.length > 0 && (
              <sup className={sinif}>
                {sayilar.map((n, j) => (
                  <a key={n} href={`#dn-${n}`} aria-label={`Not ${n}`}>
                    {j > 0 && ","}
                    {n}
                  </a>
                ))}
              </sup>
            )}
          </span>
        );
      })}
    </>
  );
}

export interface NotSiniflari {
  liste: string;
  no: string;
  etiket: string;
  kaynak: string;
}

export function Notlar({ no, kartlar, s }: { no: Map<string, number>; kartlar: Record<string, AtifKarti>; s: NotSiniflari }) {
  return (
    <ol className={s.liste}>
      {[...no].map(([id, n]) => {
        const k = kartlar[id];
        if (!k) return null;
        return (
          <li key={id} id={`dn-${n}`}>
            <span className={s.no}>{n}</span>
            <span>
              <span className={s.etiket}>{KANIT_ETIKETI[k.durum]}</span>
              {k.durum === "sozluk" ? (
                <span className={s.kaynak}>{k.metin}</span>
              ) : (
                // aynı kaynak bir bilgide birden çok yerle geçebilir; notta bir kez yazılır
                k.kaynaklar
                  .filter((q, i, hepsi) => hepsi.findIndex((x) => x.baslik === q.baslik) === i)
                  .map((q, i) => (
                <span key={i} className={s.kaynak}>
                  <cite>{q.baslik}</cite>
                  {[q.dergi, q.yil].filter(Boolean).length > 0 && ` · ${[q.dergi, q.yil].filter(Boolean).join(", ")}`}
                  {q.doi && (
                    <>
                      {" · "}
                      <a href={`https://doi.org/${q.doi}`} rel="noopener noreferrer">
                        doi
                      </a>
                    </>
                  )}
                </span>
                  ))
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
