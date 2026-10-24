import type { CSSProperties, ReactNode } from "react";
import { SOGUMA as S, tr } from "./veri";
import g from "./grafik.module.css";

// Dergi taslağının grafikleri. Renkler ve yazı tipleri yönün CSS değişkenlerinden gelir (--y-…);
// iç ve kabuk her grafikte aynı renktir (iç: --y-ic, kabuk: --y-kabuk), tek seri --y-vurgu taşır.

function Sekil({ no, baslik, alt, kaynak, tablo, children }: { no: string; baslik: string; alt: ReactNode; kaynak?: ReactNode; tablo: [string, string][]; children: ReactNode }) {
  return (
    <figure className={g.sekil}>
      <figcaption className={g.ust}>
        <span className={g.no}>{no}</span>
        <span className={g.baslik}>{baslik}</span>
      </figcaption>
      <div className={g.govde} aria-hidden="true">
        {children}
      </div>
      <table className={g.gizli}>
        <tbody>
          {tablo.map(([a, b]) => (
            <tr key={a}>
              <th scope="row">{a}</th>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={g.alt}>
        {alt}
        {kaynak}
      </p>
    </figure>
  );
}

const yuzde = (deger: number, ust: number) => `${(deger / ust) * 100}%`;

function Eksen({ ust, adim, birim }: { ust: number; adim: number; birim: string }) {
  const degerler = Array.from({ length: ust / adim + 1 }, (_, i) => i * adim);
  return (
    <div className={g.eksen}>
      {degerler.map((d) => (
        <span key={d} style={{ left: yuzde(d, ust) }}>
          {d}
          {d === ust && <small> {birim}</small>}
        </span>
      ))}
    </div>
  );
}

function Izgara({ ust, adim }: { ust: number; adim: number }) {
  return (
    <>
      {Array.from({ length: ust / adim + 1 }, (_, i) => (
        <i key={i} className={g.izgara} style={{ left: yuzde(i * adim, ust) }} />
      ))}
    </>
  );
}

/** İç ve kabukta su: taze kontrol ekmeğinin ölçümü (nokta) ve soğumuş ekmek için aktarılan aralık (bant). */
export function IcKabukGrafigi({ no, kaynak }: { no: string; kaynak?: ReactNode }) {
  const UST = 50;
  const satirlar = [
    { ad: "İç", renk: "var(--y-ic)", taze: S.taze.ic, aralik: S.sogumus.ic },
    { ad: "Kabuk", renk: "var(--y-kabuk)", taze: S.taze.kabuk, aralik: S.sogumus.kabuk },
  ];
  return (
    <Sekil
      no={no}
      kaynak={kaynak}
      baslik="Su nerede: iç ve kabuk"
      tablo={satirlar.flatMap((r) => [
        [`${r.ad}, taze kontrol ekmeği`, `${tr(r.taze, 1)} g su / 100 g`],
        [`${r.ad}, soğumuş ekmek`, `%${r.aralik.join("–")}`],
      ])}
      alt={
        <>
          Nokta: taze kontrol ekmeği, tek çalışma. Bant: soğumuş ekmek, derlemeden aktarılan. İki değer aynı koşulda
          ölçülmedi.
        </>
      }
    >
      <div className={g.lejant}>
        <span>
          <i className={g.lejantNokta} /> taze ekmek
        </span>
        <span>
          <i className={g.lejantBant} /> soğumuş ekmek
        </span>
      </div>
      {satirlar.map((r) => (
        <div key={r.ad} className={g.satir} style={{ "--renk": r.renk } as CSSProperties}>
          <span className={g.satirAd}>{r.ad}</span>
          <div className={g.iz}>
            <Izgara ust={UST} adim={10} />
            <span className={g.bant} style={{ left: yuzde(r.aralik[0], UST), width: yuzde(r.aralik[1] - r.aralik[0], UST) }}>
              <b className={g.bantEtiket}>%{r.aralik.join("–")}</b>
            </span>
            <span className={g.nokta} style={{ left: yuzde(r.taze, UST) }}>
              <b className={g.noktaEtiket}>{tr(r.taze, 1)}</b>
            </span>
          </div>
        </div>
      ))}
      <div className={g.satir}>
        <span />
        <Eksen ust={UST} adim={10} birim="g / 100 g" />
      </div>
    </Sekil>
  );
}

/** Fırın sıcaklığı ve kaybedilen nem: küçük kalıp ekmeği. */
export function FirinKaybiGrafigi({ no, kaynak }: { no: string; kaynak?: ReactNode }) {
  const UST = 20;
  return (
    <Sekil
      no={no}
      kaynak={kaynak}
      baslik="Fırın ısındıkça kaybedilen nem"
      tablo={S.firin.sicaklik.map((t, i) => [`${t} °C`, `%${S.firin.kayip[i]}`])}
      alt={
        <>
          Küçük kalıp ekmeği, tek çalışma. Aynı çalışmada {S.merkez.sicaklik} °C&apos;de yalnız kabuk nem kaybetti; merkezin
          nemi %{tr(S.merkez.artis)}&apos;ye varan oranda arttı.
        </>
      }
    >
      <div className={g.sutunlar}>
        {S.firin.sicaklik.map((t, i) => (
          <div key={t} className={g.sutun}>
            <span className={g.sutunAlan}>
              <span className={g.sutunCubuk} style={{ height: yuzde(S.firin.kayip[i], UST) }}>
                <b>%{S.firin.kayip[i]}</b>
              </span>
            </span>
            <span className={g.sutunAd}>{t} °C</span>
          </div>
        ))}
      </div>
    </Sekil>
  );
}

/** Merkezde nemin artmaya başladığı sıcaklık: iki ölçüm, iki eşik; ve 100 °C. */
export function EsikGrafigi({ no, kaynak }: { no: string; kaynak?: ReactNode }) {
  const ALT = 20;
  const UST = 100;
  const x = (t: number) => `${((t - ALT) / (UST - ALT)) * 100}%`;
  const { erken, gec } = S.esik;
  return (
    <Sekil
      no={no}
      kaynak={kaynak}
      baslik="Merkezde nem hangi sıcaklıkta artıyor?"
      tablo={[
        [erken.kim, `${erken.sicaklik} °C'yi aşmadan`],
        [gec.kim, `${gec.sicaklik} ± ${gec.pay} °C'ye ulaştıktan sonra`],
        ["Buharın kenara göçü", `merkez ${S.kaynama.sicaklik} °C`],
      ]}
      alt={<>Kaynaklar ayrışıyor; ikisi de derlemeden aktarılan ölçüm.</>}
    >
      <div className={g.termo}>
        <div className={g.termoSatir}>
          <span className={g.termoAd}>{erken.kim}</span>
          <div className={g.termoIz}>
            <span className={g.termoBant} style={{ left: x(ALT), width: `calc(${x(erken.sicaklik)})` }} />
            <span className={g.termoUc} style={{ left: x(erken.sicaklik) }}>
              <b>≤ {erken.sicaklik} °C</b>
            </span>
          </div>
        </div>
        <div className={g.termoSatir}>
          <span className={g.termoAd}>{gec.kim}</span>
          <div className={g.termoIz}>
            <span className={g.termoOk} style={{ left: x(gec.sicaklik), right: 0 }} />
            <span className={g.termoHata} style={{ left: x(gec.sicaklik - gec.pay), width: `calc(${x(gec.sicaklik + gec.pay)} - ${x(gec.sicaklik - gec.pay)})` }} />
            <span className={g.termoNokta} style={{ left: x(gec.sicaklik) }}>
              <b>
                {gec.sicaklik} ± {gec.pay} °C
              </b>
            </span>
          </div>
        </div>
        <div className={g.termoSatir}>
          <span className={g.termoAd}>Buhar kenara göçer</span>
          <div className={g.termoIz}>
            <span className={g.termoKaynama} style={{ left: x(S.kaynama.sicaklik) }}>
              <b>{S.kaynama.sicaklik} °C</b>
            </span>
          </div>
        </div>
        <div className={g.termoSatir}>
          <span />
          <div className={g.eksen}>
            {[20, 40, 60, 80, 100].map((t) => (
              <span key={t} style={{ left: x(t) }}>
                {t}
                {t === 100 && <small> °C</small>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Sekil>
  );
}

/** NMR: saklamanın ilk 7 gününde iki proton grubunun payı (küçük çoklu, ortak ölçek 0–80). */
export function NmrGrafigi({ no, kaynak }: { no: string; kaynak?: ReactNode }) {
  const W = 150;
  const H = 190;
  const UST = 80;
  const y = (v: number) => 20 + (1 - v / UST) * (H - 50);
  const panel = (ad: string, d: { once: readonly number[]; sonra: readonly number[] }) => {
    const [x0, x1] = [26, W - 26];
    const bant = `${x0},${y(d.once[1])} ${x1},${y(d.sonra[1])} ${x1},${y(d.sonra[0])} ${x0},${y(d.once[0])}`;
    const orta = (r: readonly number[]) => (r[0] + r[1]) / 2;
    const aralik = (r: readonly number[]) => `%${r.map((v) => tr(v)).join("–")}`;
    return (
      <div className={g.panel} key={ad}>
        <p className={g.panelAd}>{ad}</p>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {[0, 40, 80].map((v) => (
            <g key={v}>
              <line x1={x0} x2={x1} y1={y(v)} y2={y(v)} className={g.svgIzgara} />
              <text x={x0 - 6} y={y(v) + 4} className={g.svgEksen} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          <polygon points={bant} className={g.svgBant} />
          <line x1={x0} y1={y(orta(d.once))} x2={x1} y2={y(orta(d.sonra))} className={g.svgCizgi} />
          <circle cx={x0} cy={y(orta(d.once))} r={4} className={g.svgNokta} />
          <circle cx={x1} cy={y(orta(d.sonra))} r={4} className={g.svgNokta} />
          <text x={x0} y={y(orta(d.once)) - 12} className={g.svgDeger} textAnchor="start">
            {aralik(d.once)}
          </text>
          <text x={x1} y={y(orta(d.sonra)) - 12} className={g.svgDeger} textAnchor="end">
            {aralik(d.sonra)}
          </text>
          <text x={x0} y={H - 8} className={g.svgEksen} textAnchor="middle">
            gün 0
          </text>
          <text x={x1} y={H - 8} className={g.svgEksen} textAnchor="middle">
            gün {S.nmr.gun}
          </text>
        </svg>
      </div>
    );
  };
  return (
    <Sekil
      no={no}
      kaynak={kaynak}
      baslik={`Saklamanın ilk ${S.nmr.gun} gününde suyun yeri`}
      tablo={[
        ["Su–proteine atanan grup", `${`%${S.nmr.suProtein.once.join("–")}`} → %${S.nmr.suProtein.sonra.map((v) => tr(v)).join("–")}`],
        ["Jelleşmiş nişastaya atanan grup", `%${S.nmr.nisasta.once.join("–")} → %${S.nmr.nisasta.sonra.join("–")}`],
      ]}
      alt={<>NMR proton gruplarının payı, iki çalışmada uzlaşan ölçüm. Gruplara yapılan atamalar bir yorumdur.</>}
    >
      <div className={g.paneller}>
        {panel("Su–proteine atanan grup", S.nmr.suProtein)}
        {panel("Jelleşmiş nişastaya atanan grup", S.nmr.nisasta)}
      </div>
    </Sekil>
  );
}

/** Kâğıt torbada saklanan ekmeğin ağırlık kaybı. */
export function TorbaGrafigi({ no, kaynak }: { no: string; kaynak?: ReactNode }) {
  const W = 320;
  const H = 190;
  const x = (gun: number) => 36 + (gun / 14) * (W - 70);
  const y = (v: number) => 16 + (1 - v / 30) * (H - 52);
  const noktalar: [number, number][] = [[0, 0], ...S.torba.olcum.map(([a, b]) => [a, b] as [number, number])];
  const yol = noktalar.map(([a, b], i) => `${i ? "L" : "M"}${x(a)},${y(b)}`).join(" ");
  return (
    <Sekil
      no={no}
      kaynak={kaynak}
      baslik="Kâğıt torbada kaybedilen ağırlık"
      tablo={S.torba.olcum.map(([gun, kayip]) => [`${gun}. gün`, `%${tr(kayip)}`])}
      alt={
        <>
          Kaplamasız ekmek, {S.torba.sicaklik} °C ve %{S.torba.bagilNem} bağıl nem; başlangıç ağırlığına göre, tek çalışma.
        </>
      }
    >
      <svg className={g.cizgiSvg} viewBox={`0 0 ${W} ${H}`}>
        {[0, 10, 20, 30].map((v) => (
          <g key={v}>
            <line x1={x(0)} x2={x(14)} y1={y(v)} y2={y(v)} className={g.svgIzgara} />
            <text x={x(0) - 8} y={y(v) + 4} className={g.svgEksen} textAnchor="end">
              {v === 30 ? "%30" : v}
            </text>
          </g>
        ))}
        <path d={`${yol} L${x(14)},${y(0)} L${x(0)},${y(0)} Z`} className={g.svgAlan} />
        <path d={yol} className={g.svgCizgi} />
        {S.torba.olcum.map(([gun, kayip]) => (
          <g key={gun}>
            <circle cx={x(gun)} cy={y(kayip)} r={4} className={g.svgNokta}>
              <title>{`${gun}. gün: %${tr(kayip)}`}</title>
            </circle>
            <text x={x(gun) - 8} y={y(kayip) - 10} className={g.svgDeger} textAnchor="end">
              %{tr(kayip)}
            </text>
          </g>
        ))}
        {[0, 4, 14].map((gun) => (
          <text key={gun} x={x(gun)} y={H - 14} className={g.svgEksen} textAnchor="middle">
            {gun === 0 ? "gün 0" : gun}
          </text>
        ))}
      </svg>
    </Sekil>
  );
}

/** Soğutma yöntemi ve kütle kaybı. */
export function SogutmaGrafigi({ no, kaynak }: { no: string; kaynak?: ReactNode }) {
  const UST = 10;
  return (
    <Sekil
      no={no}
      kaynak={kaynak}
      baslik="Soğutma yöntemi ve kütle kaybı"
      tablo={[
        ["Konvansiyonel soğutma", `%${S.sogutma.konvansiyonel.join("–")}`],
        ["Vakumlu soğutma", `yaklaşık %${S.sogutma.vakum}`],
      ]}
      alt={<>Fırıncılık ürünleri, tek çalışma.</>}
    >
      <div className={g.satir} style={{ "--renk": "var(--y-vurgu)" } as CSSProperties}>
        <span className={g.satirAd}>Konvansiyonel</span>
        <div className={g.iz}>
          <Izgara ust={UST} adim={2} />
          <span className={g.bant} style={{ left: yuzde(S.sogutma.konvansiyonel[0], UST), width: yuzde(S.sogutma.konvansiyonel[1] - S.sogutma.konvansiyonel[0], UST) }}>
            <b className={g.bantEtiket}>%{S.sogutma.konvansiyonel.join("–")}</b>
          </span>
        </div>
      </div>
      <div className={g.satir} style={{ "--renk": "var(--y-vurgu)" } as CSSProperties}>
        <span className={g.satirAd}>Vakumlu</span>
        <div className={g.iz}>
          <Izgara ust={UST} adim={2} />
          <span className={g.nokta} style={{ left: yuzde(S.sogutma.vakum, UST) }}>
            <b className={g.noktaEtiket}>≈ %{S.sogutma.vakum}</b>
          </span>
        </div>
      </div>
      <div className={g.satir}>
        <span />
        <Eksen ust={UST} adim={2} birim="%" />
      </div>
    </Sekil>
  );
}

/** Şematik kesit: merkezden kabuğa ve çatlağa giden buhar. Yönün çizgi dili --y-… değişkenlerinden. */
export function Kesit({ no, alt }: { no: string; alt: ReactNode }) {
  // Kubbe: taban 30–370, tepe 40; kabuk 14 birim kalınlıkta, tepede bir çatlak.
  const dis = "M30,232 C30,120 110,40 200,40 C290,40 370,120 370,232 Z";
  const ic = "M46,232 C46,132 120,56 200,56 C280,56 354,132 354,232 Z";
  const gozenek: [number, number, number][] = [
    [120, 170, 7], [150, 120, 5], [175, 190, 9], [230, 175, 6], [260, 125, 8], [290, 195, 5], [205, 105, 4],
    [95, 205, 5], [315, 160, 6], [140, 215, 4], [250, 215, 7], [185, 140, 3], [330, 210, 4], [70, 180, 4],
  ];
  return (
    <figure className={`${g.sekil} ${g.kesit}`}>
      <figcaption className={g.ust}>
        <span className={g.no}>{no}</span>
        <span className={g.baslik}>Merkezden kenara</span>
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
          <path d={dis} className={g.kabukDolgu} />
          <path d={dis} fill="url(#kesitTarama)" />
          <path d={ic} className={g.icDolgu} />
        </g>
        {gozenek.map(([cx, cy, r], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * 0.8} className={g.gozenek} />
        ))}
        <line x1="20" x2="380" y1="232" y2="232" className={g.taban} />
        <path d="M200,160 L72,196" className={g.ok} markerEnd="url(#kesitOk)" />
        <path d="M200,160 L334,190" className={g.ok} markerEnd="url(#kesitOk)" />
        <path d="M200,160 L226,70" className={g.okGuclu} markerEnd="url(#kesitOk)" />
        <circle cx="200" cy="160" r="6" className={g.merkez} />
        <text x="200" y="194" className={g.kesitEtiket} textAnchor="middle">
          merkez · {S.kaynama.sicaklik} °C
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
      <p className={g.alt}>{alt}</p>
    </figure>
  );
}
