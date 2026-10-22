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
export { ASITLIK_ZEMIN, DURAK_ZEMIN, FIRIN_DENEYI, ILK_ON_GUN, KABUK, RAF, asitlikZemini, virgullu } from "./gorunum";
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
