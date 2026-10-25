import { istanbulTime } from "@/lib/time/istanbul";

// Kapı: fırının o anki hâli, İstanbul saatine göre. Çizelge örnektir; gerçek günü Tahsin düzeltecek
// (saat ve cümleler yalnız burada). Sıra önemlidir: her an, başlangıcı geçmiş son satırdır.

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
  { bas: "04:00", ad: "ateş", baslik: "Ateş yandı.", not: "Fırın ısınıyor; hamurlar dolaptan çıktı, oda sıcaklığına geliyor.", gorsel: "video · ateş, odun" },
  { bas: "07:00", ad: "çıkış", baslik: "Ekmek çıktı.", not: "Bugünün ekmekleri raflarda soğuyor.", gorsel: "video · fırın ağzı, kürek" },
  { bas: "11:00", ad: "hamur", baslik: "Yarının hamuru yoğruluyor.", not: "Un, su, tuz ve ekşi maya; uzun bekleyiş şimdi başlıyor.", gorsel: "fotoğraf · eller, hamur" },
  { bas: "14:00", ad: "dağıtım", baslik: "Ekmekler yolda.", not: "Ayrılan ekmekler kapılara gidiyor.", gorsel: "fotoğraf · kese kâğıtları" },
  { bas: "22:00", ad: "dinlenme", baslik: "Hamur dinleniyor.", not: "Fırın kapandı. Hamurlar gece boyunca serin dolapta.", gorsel: "fotoğraf · bezle örtülü sepetler" },
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
