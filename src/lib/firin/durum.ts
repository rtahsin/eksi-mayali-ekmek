import { istanbulTime } from "@/lib/time/istanbul";

// Kapı: fırının o anki hâli, İstanbul saatine göre. Gün Tahsin'in anlattığı gibi (26 Eki): 8'de fırın açılır,
// 9'da ilk ekmekler girer, 10–12 arası çıkar, 12'de hepsi pişmiştir; sonra şarküteri ve kapı teslimatları.
// Kapanış 18:00 teslimat penceresinin sonundan alındı (Tahsin onaylamadı). Sıra önemlidir: her an,
// başlangıcı geçmiş son satırdır; gece yarısından 8'e kadar son satır (kapalı) sürer.

export interface FirinAni {
  /** "HH:MM", İstanbul saati */
  bas: string;
  /** Çizelgedeki kısa ad */
  ad: string;
  baslik: string;
  not: string;
  /** Kapıdaki görselin yeri (fotoğraf gelene kadar yer tutucu yazısı) */
  gorsel: string;
}

export const FIRIN_CIZELGESI: readonly FirinAni[] = [
  { bas: "08:00", ad: "açılış", baslik: "Fırın açıldı.", not: "Fırın ısınıyor; birazdan ilk ekmekler girecek.", gorsel: "video · ısınan fırın" },
  { bas: "09:00", ad: "fırında", baslik: "İlk ekmekler fırında.", not: "Somunlar taşın üstünde pişiyor.", gorsel: "video · fırına giren somunlar" },
  { bas: "10:00", ad: "çıkış", baslik: "Ekmekler çıkıyor.", not: "Öğlene kadar sırayla fırından çıkıyorlar.", gorsel: "video · kürekle çıkış" },
  { bas: "12:00", ad: "teslimat", baslik: "Bütün ekmekler pişti.", not: "Şarküterilere ve kapılara teslimat başladı.", gorsel: "fotoğraf · teslimata hazır ekmekler" },
  { bas: "18:00", ad: "kapalı", baslik: "Fırın kapalı.", not: "Yarın sabah 8'de yeniden açılıyor; ayırmalar açık.", gorsel: "fotoğraf · kapalı fırın" },
];

function dakika(saat: string): number {
  const [h, m] = saat.split(":").map(Number);
  return h * 60 + m;
}

/** O anki fırın anının sırası; gece yarısından sonra ilk ateşe kadar son an (dinlenme) sürer. */
export function firinAniSirasi(now: Date = new Date(), cizelge: readonly FirinAni[] = FIRIN_CIZELGESI): number {
  const { hour, minute } = istanbulTime(now);
  const simdi = hour * 60 + minute;
  let sira = cizelge.length - 1;
  for (let i = 0; i < cizelge.length; i++) {
    if (simdi >= dakika(cizelge[i].bas)) sira = i;
  }
  return sira;
}

/** Selam, günün saatine göre. */
export function selam(now: Date = new Date()): string {
  const { hour } = istanbulTime(now);
  if (hour >= 4 && hour < 11) return "Hayırlı sabahlar";
  if (hour >= 11 && hour < 18) return "İyi günler";
  if (hour >= 18 && hour < 23) return "İyi akşamlar";
  return "İyi geceler";
}
