import Link from "next/link";
import Image from "next/image";
import { getAn, getGorsel, getYolculuk } from "@/lib/bilim/server";
import s from "@/components/bilim/bilim.module.css";

export default function BilimDizini() {
  const yolculuk = getYolculuk();
  let no = 0;
  return (
    <main className={s.dizin}>
      <div className={s.baslik}>
        <p className={s.ust}>Levha dizini</p>
        <h1 className={s.h1}>Ekmeğin yolculuğu</h1>
        <p className={s.soru}>Tarladan dilime, ekmeğin içinde olan {yolculuk.duraklar.reduce((n, d) => n + d.anlar.length, 0)} an.</p>
      </div>
      {yolculuk.duraklar.map((durak) => (
        <section key={durak.id} className={s.durak} aria-labelledby={`durak-${durak.id}`}>
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
                    <span className={s.kucukResim}>
                      {g && <Image src={g.dosya} alt="" fill sizes="88px" />}
                    </span>
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
    </main>
  );
}
