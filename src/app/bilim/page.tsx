import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { DURAK_ZEMIN } from "@/lib/bilim";
import { getAn, getGorsel, getYolculuk } from "@/lib/bilim/server";
import s from "@/components/bilim/bilim.module.css";

export default function BilimDizini() {
  const yolculuk = getYolculuk();
  const toplam = yolculuk.duraklar.reduce((n, d) => n + d.anlar.length, 0);
  let no = 0;
  return (
    <div className={s.oda} data-oda>
      <Link href="/" className={s.geri}>
        ← Fırına dön
      </Link>
      <header className={s.dizinBaslik}>
        <p className={s.ust}>EkmekLab · Bilim odası</p>
        <h1 className={s.h1}>Ekmeğin yolculuğu</h1>
        <p className={s.soru}>
          Tarladan dilime, ekmeğin içinde olan {toplam} an. Her durağın rengi, ekmeğin o duraktaki sıcaklığını anlatır:
          serin tarla, sıcak fırın, yeniden serin raf.
        </p>
      </header>
      {yolculuk.duraklar.map((durak) => (
        <section
          key={durak.id}
          className={s.durak}
          style={{ "--durak": DURAK_ZEMIN[durak.id] } as CSSProperties}
          aria-labelledby={`durak-${durak.id}`}
        >
          <h2 id={`durak-${durak.id}`} className={s.durakAd}>
            {durak.ad}
          </h2>
          <ol className={s.levhaListe}>
            {durak.anlar.map((a) => {
              no += 1;
              const ilk = getAn(a.id).gor.adimlar.find((x) => x.gorsel)?.gorsel;
              const g = ilk ? getGorsel(ilk) : undefined;
              return (
                <li key={a.id}>
                  <Link href={`/bilim/${a.id}`} className={s.levhaSatir}>
                    <span className={s.kucukResim}>{g && <Image src={g.dosya} alt="" fill sizes="96px" />}</span>
                    <span>
                      <span className={s.levhaNo}>Levha {String(no).padStart(2, "0")}</span>
                      <span className={s.levhaAd}>{a.baslik}</span>
                      <span className={s.levhaSoru}>{a.soru}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
