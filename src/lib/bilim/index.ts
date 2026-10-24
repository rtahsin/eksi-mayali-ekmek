// Bilim odası içeriğinin saf, izomorfik API'si. Dosya okuma: ./server.
export {
  KANIT_ETIKETI,
  cumleEtiketi,
  findAtiflar,
  splitCumleler,
  splitHamCumleler,
  type AtifKarti,
  type Cumle,
  type EtiketDurumu,
} from "./metin";
export { KANIT_DURUMLARI } from "./schema";
export { KOPRU_ADAYLARI, ekmeginAnlari, type KopruUrunu } from "./kopru";
export {
  ASITLIK_ZEMIN,
  DEGIRMEN,
  DURAK_ZEMIN,
  FIRIN_DENEYI,
  GAZ,
  GECE,
  ILK_ON_GUN,
  KABUK,
  KESIK,
  RAF,
  TANE,
  YOGURMA,
  asitlikZemini,
  virgullu,
} from "./gorunum";
export type {
  An,
  Bilgi,
  BilgiDugumu,
  Gorsel,
  Gorseller,
  Karakter,
  KanitDurumu,
  Kaynaklar,
  Sozluk,
  Yolculuk,
} from "./schema";
