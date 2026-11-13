import Link from "next/link";
import { LEVHALAR } from "@/lib/bilim/levhalar";
import { resolveGazeteSayi } from "@/lib/bilim/sayi";
import { getAn, getYolculuk } from "@/lib/bilim/server";
import { LEVHA_FONTLARI } from "@/components/bilim/levha/fontlar";
import s from "@/components/bilim/levha/levha.module.css";

// Bilim odasının dizini, levha düzeninde: durak durak 26 levha. Görsel yok; her levhanın yanında o anın
// ilk rakamı ya da etkileşimli sahnesi olduğu yazar.

const ROMA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

interface BilimDiziniProps {
  searchParams: Promise<{ sayi?: string | string[] }>;
}

export default async function BilimDizini({ searchParams }: BilimDiziniProps) {
  const params = await searchParams;
  const gazeteSayi = resolveGazeteSayi(params?.sayi);
  const yolculuk = getYolculuk();
  const toplam = yolculuk.duraklar.reduce((n, d) => n + d.anlar.length, 0);
  const inancSayisi = yolculuk.duraklar.reduce((n, d) => n + d.anlar.reduce((m, a) => m + getAn(a.id).yuzlesme.length, 0), 0);
  let no = 0;
  return (
    <div className={`${LEVHA_FONTLARI} ${s.sayfa}`} lang="tr">
      <header className={s.kunye}>
        <Link href="/">← Fırına dön</Link>
        <span>EkmekLab · Bilim odası</span>
      </header>

      {gazeteSayi && (
        <section className={s.gazeteKart} aria-label={`Taş Fırın Gazetesi Sayı ${gazeteSayi.kod}`}>
          <p className={s.gazeteUst}>Taş Fırın Gazetesi · Sayı #{gazeteSayi.kod}</p>
          <h2 className={s.gazeteBaslik}>{gazeteSayi.baslik}</h2>
          <p className={s.gazeteAlt}>{gazeteSayi.alt}</p>
          <div className={s.gazeteAksiyonlar}>
            <Link href={`/bilim/${gazeteSayi.anId}`} className={s.gazeteBirincil}>
              Sayı #{gazeteSayi.kod} levhasını oku →
            </Link>
            <Link href="/" className={s.gazeteIkincil}>
              Sıcak Fırın &amp; Eşlikçi Sepetini Gör →
            </Link>
          </div>
        </section>
      )}

      <section className={s.acilis}>
        <div>
          <p className={s.ust}>{toplam} levha</p>
          <h1 className={s.baslik}>Ekmeğin yolculuğu</h1>
          <p className={s.soru}>Tarladan dilime, ekmeğin içinde olan {toplam} an. Her cümle kaynağına bağlı.</p>
        </div>
        <Link href="/bilim/efsaneler" className={s.kapi}>
          <span className={s.etiket}>Ayrı kapı</span>
          <span className={s.kapiAd}>Efsane dosyası →</span>
          <span className={s.kapiAlt}>{inancSayisi} yaygın inanç ve ölçümlerin söyledikleri</span>
        </Link>
      </section>

      {yolculuk.duraklar.map((durak, i) => (
        <section key={durak.id} className={s.dizinDurak} aria-labelledby={`durak-${durak.id}`}>
          <h2 id={`durak-${durak.id}`} className={s.dizinDurakAd}>
            <span className={s.bolumNo}>{ROMA[i]}.</span> {durak.ad}
          </h2>
          <ol className={s.dizinListe}>
            {durak.anlar.map((a) => {
              no += 1;
              const ilk = LEVHALAR[a.id]?.rakamlar[0];
              return (
                <li key={a.id}>
                  <Link href={`/bilim/${a.id}`} className={s.dizinSatir}>
                    <span className={s.dizinNo}>{String(no).padStart(2, "0")}</span>
                    <span>
                      <span className={s.dizinAd}>{a.baslik}</span>
                      <span className={s.dizinSoru}>{a.soru}</span>
                    </span>
                    <span className={s.dizinYan}>
                      {ilk ? (
                        <>
                          <span className={s.dizinRakam}>{ilk.deger}</span> {ilk.birim}
                        </>
                      ) : (
                        "etkileşimli sahne"
                      )}
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
