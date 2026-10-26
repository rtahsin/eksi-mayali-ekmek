import { addDays, istanbulTime, istanbulToday, istanbulWeekday } from "@/lib/time/istanbul";
import { bakeClock } from "@/lib/bake/log";

// Girişteki rozet: fırının o anki hâli, İstanbul saatine göre (Tahsin, 26 Eki): 08:00 açılır,
// 09:00 ilk ekmekler girer, 10–12 çıkar, öğleden sonra teslimat. Sabit kapanış yok ("teslimatlar
// bitince"); rozet 19:00'dan sonra kapalı der. "Fırından çıktı" saati admin kaydından (bake_logs) gelir.

export const ACILIS = "08:00";
export const FIRINA_GIRIS = "09:00";
export const TESLIMAT = "12:00";
export const KAPANIS = "19:00";

const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export interface FirinDurumu {
  yazi: string;
  /** Fırın şu an çalışıyor mu (rozetteki nokta yanıp söner) */
  acik: boolean;
}

export interface DurumGirdisi {
  now?: Date;
  /** Bugünün son (gizli olmayan) fırın çıkışı, ISO; yoksa null */
  sonCikis: string | null;
  /** 0 = Pazar … 6 = Cumartesi */
  openWeekdays: readonly number[];
  closedDates: readonly string[];
}

function dk(saat: string): number {
  const [h, m] = saat.split(":").map(Number);
  return h * 60 + m;
}

function acikGun(gun: string, openWeekdays: readonly number[], closedDates: readonly string[]): boolean {
  return openWeekdays.includes(istanbulWeekday(gun)) && !closedDates.includes(gun);
}

/** `bugun`den sonraki ilk açık gün için "yarın" ya da gün adı; iki hafta içinde yoksa null. */
function siradakiGun(bugun: string, openWeekdays: readonly number[], closedDates: readonly string[]): string | null {
  for (let i = 1; i <= 14; i++) {
    const gun = addDays(bugun, i);
    if (acikGun(gun, openWeekdays, closedDates)) return i === 1 ? "yarın" : GUNLER[istanbulWeekday(gun)];
  }
  return null;
}

function kapali(bas: string, bugun: string, g: DurumGirdisi): FirinDurumu {
  const sira = siradakiGun(bugun, g.openWeekdays, g.closedDates);
  return { yazi: sira ? `${bas} · ${sira} ${ACILIS}'de açılıyor` : bas, acik: false };
}

export function firinDurumu(g: DurumGirdisi): FirinDurumu {
  const now = g.now ?? new Date();
  const bugun = istanbulToday(now);
  const { hour, minute } = istanbulTime(now);
  const simdi = hour * 60 + minute;
  const cikis = g.sonCikis && istanbulToday(new Date(g.sonCikis)) === bugun ? bakeClock(g.sonCikis) : null;

  if (!acikGun(bugun, g.openWeekdays, g.closedDates)) return kapali("Bugün fırın kapalı", bugun, g);
  if (simdi < dk(ACILIS)) return { yazi: `Fırın bugün ${ACILIS}'de açılıyor`, acik: false };
  if (simdi >= dk(KAPANIS)) return kapali("Fırın kapalı", bugun, g);

  if (simdi >= dk(TESLIMAT)) {
    return { yazi: cikis ? `Ekmekler teslimatta · fırından çıkış ${cikis}` : "Bugünün ekmekleri teslimatta", acik: true };
  }
  if (cikis) return { yazi: `Bugün fırından çıktı · ${cikis}`, acik: true };
  if (simdi >= dk(FIRINA_GIRIS)) return { yazi: "İlk ekmekler fırında", acik: true };
  return { yazi: "Fırın açık · ısınıyor", acik: true };
}
