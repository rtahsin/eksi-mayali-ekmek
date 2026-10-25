import { DEGIRMEN, FIRIN_DENEYI, GAZ, GECE, ILK_ON_GUN, KABUK, KESIK, RAF, TANE, YOGURMA, splitHamCumleler, type An } from "@/lib/bilim";
import type { LevhaDeneyi } from "../LevhaSayfasi";
import { DegirmenDeneyi } from "./DegirmenDeneyi";
import { FirinDeneyi } from "./FirinDeneyi";
import { GazDeneyi } from "./GazDeneyi";
import { GeceDeneyi } from "./GeceDeneyi";
import { IlkOnGunDeneyi } from "./IlkOnGunDeneyi";
import { KabukDeneyi } from "./KabukDeneyi";
import { KesikDeneyi } from "./KesikDeneyi";
import { RafDeneyi } from "./RafDeneyi";
import { TaneDeneyi } from "./TaneDeneyi";
import { YogurmaDeneyi } from "./YogurmaDeneyi";

// Bayrak anların deney levhaları. Deneyin gösterdiği cümleler anın kendi cümleleridir: içindeki bilgi
// kimliğiyle (ve gerekirse sırasıyla) bulunur; yeni cümle yazılmaz. Sayılar gorunum.ts sabitlerinden.

export function deneyTanimi(an: An): LevhaDeneyi | undefined {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const anla = an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler));
  const yuz = an.yuzlesme.flatMap((y) => splitHamCumleler(y.cevap));
  const tum = [...ad.flat(), ...anla];
  const hepsi = (id: string, havuz = tum) => havuz.filter((c) => c.includes(`[[${id}]]`));
  const bul = (id: string, sira = 0, havuz = tum) => hepsi(id, havuz)[sira] ?? "";
  const ile = (onek: string, havuz = anla) => havuz.find((c) => c.startsWith(onek)) ?? "";

  switch (an.id) {
    case FIRIN_DENEYI.an:
      return { baslik: "Fırını ayarla", yonerge: "Fırın sıcaklığını seç, dakikayı ilerlet: kesit o deneyin ölçümleriyle büyür.", icerik: () => <FirinDeneyi /> };
    case KABUK.an: {
      const B = KABUK.bilgiler;
      const k = { renk: bul(B.renk), maltoz: bul(B.maltoz), hmf: bul(B.hmf), akrilamid: bul(B.akrilamid) };
      return {
        baslik: "İki kilit",
        yonerge: "Yüzey sıcaklığını ve su aktivitesini ayarla; renk yalnız ikisi birden eşiği geçince oluşur.",
        metinler: Object.values(k),
        icerik: (m) => <KabukDeneyi kilit={{ renk: m(k.renk), maltoz: m(k.maltoz), hmf: m(k.hmf), akrilamid: m(k.akrilamid) }} />,
      };
    }
    case RAF.an: {
      const yaz = (xs: readonly { bilgi: string; sira: number }[]) => xs.map((x) => bul(x.bilgi, x.sira)).join(" ");
      const supheliler = RAF.supheliler.map((s) => ({ ad: s.ad, lehine: yaz(s.lehine), ama: yaz(s.ama) }));
      const karar = bul(RAF.karar.bilgi, RAF.karar.sira);
      return {
        baslik: "Kim bayatlattı?",
        yonerge: "Üç şüphelinin dosyasını aç; üçü de açılınca karar belirir.",
        metinler: [...supheliler.flatMap((s) => [s.lehine, s.ama]), karar],
        icerik: (m) => <RafDeneyi supheliler={supheliler.map((s) => ({ ad: s.ad, lehine: m(s.lehine), ama: m(s.ama) }))} karar={m(karar)} />,
      };
    }
    case TANE.an: {
      const ikiSayim = hepsi(TANE.bilgiler.granul).find((c) => c.includes(`%${TANE.granul.alan}`)) ?? "";
      return {
        baslik: "Tahmin et, sonra iki sayım",
        yonerge: "Endosperm payını tahmin et; sonra aynı nişastayı sayarak ve kapladığı alana göre gör.",
        metinler: [ikiSayim],
        icerik: (m) => <TaneDeneyi ikiSayim={m(ikiSayim)} />,
      };
    }
    case DEGIRMEN.an:
      return { baslik: "Su dök", yonerge: "Düğmeye basılı tut: sağlam ve kırık nişasta tanesine aynı anda su dökülür.", icerik: () => <DegirmenDeneyi /> };
    case YOGURMA.an:
      return { baslik: "Yoğur", yonerge: "Tezgahtaki hamuru sağa sola sürt: iki un aynı anda yoğrulur, her sürtüş dakikayı ilerletir.", icerik: () => <YogurmaDeneyi /> };
    case GAZ.an: {
      const baski = ad[1]?.[0] ?? "";
      const ayni = ile("Gazın da kokunun da kaynağı aynı dönüşümdür");
      return {
        baslik: "Şekeri ver",
        yonerge: "Şekerleri maya hücresine sürükle ya da dokun.",
        metinler: [baski, ayni],
        icerik: (m) => <GazDeneyi baski={m(baski)} ayni={m(ayni)} />,
      };
    }
    case GECE.an: {
      const deney = hepsi(GECE.bilgiler.deney, anla);
      const sicakVaris = deney[2] ?? "";
      const sogukVaris = [deney[1] ?? "", ile("Deneyde hamur iki sıcaklıkta", yuz)].join(" ");
      const ph = [...(ad[4] ?? []), ad[5]?.[0] ?? ""].join(" ");
      return {
        baslik: "Geceyi çevir",
        yonerge: "Saatin kolunu döndür: aynı hamurun iki koşulu yan yana yürür.",
        metinler: [sicakVaris, ph, sogukVaris],
        icerik: (m) => <GeceDeneyi sicakVaris={m(sicakVaris)} sogukVaris={m(sogukVaris)} ph={m(ph)} />,
      };
    }
    case KESIK.an: {
      const kinetik = hepsi(KESIK.bilgiler.kinetik, anla).join(" ");
      const kabukOlur = ile("Kesikle açılan yüzey");
      return {
        baslik: "Kesiği at",
        yonerge: "Hamurun üstüne kesik çiz (en çok dört) ya da hazır bir kesik seç, sonra fırına ver.",
        metinler: [kinetik, kabukOlur],
        icerik: (m) => <KesikDeneyi kinetik={m(kinetik)} kabukOlur={m(kabukOlur)} />,
      };
    }
    case ILK_ON_GUN.an: {
      const durumlar = ILK_ON_GUN.durumlar.map((s) => ({ gun: s.gun, ad: s.ad, metin: bul(s.bilgi) }));
      return {
        baslik: "On günü oynat",
        yonerge: "Günü seç: o güne kadarki olaylar damgalanır, o günün durumu anın cümlesiyle gelir.",
        metinler: durumlar.map((s) => s.metin),
        icerik: (m) => <IlkOnGunDeneyi olaylar={ILK_ON_GUN.olaylar} durumlar={durumlar.map((s) => ({ ...s, metin: m(s.metin) }))} />,
      };
    }
  }
  return undefined;
}
