import type { KanitDurumu } from "./schema";

// Anların ve kartların metnindeki [[dugum.bilgi]] / [[sozluk.terim]] atıflarını cümle cümle ayırır.
// Bölme kuralı bilim hattının kapısıyla (arastirma/bilim_isler/kontrol.py) aynıdır: kapıdan geçen cümle sitede de aynı cümledir.

const ATIF = /\[\[([a-z0-9_.]+)\]\]/g;

export type EtiketDurumu = KanitDurumu | "sozluk";

/** Kanıt düzeyi ekranda kelimeyle yazılır (BILIM_PLATFORMU_PLANI §2). */
export const KANIT_ETIKETI: Record<EtiketDurumu, string> = {
  uzlasi: "uzlaşı",
  tek_kaynak: "tek çalışma",
  ikincil: "derlemeden",
  tartismali: "çelişiyor",
  belirsiz: "belirsiz",
  sozluk: "tanım",
};

/** Bir cümlenin bilgileri farklı düzeydeyse gösterilecek etiket; çelişki her zaman öne çıkar. */
const ONCELIK: readonly EtiketDurumu[] = ["tartismali", "uzlasi", "tek_kaynak", "ikincil", "belirsiz", "sozluk"];

export interface Cumle {
  govde: string;
  atiflar: string[];
}

export function findAtiflar(metin: string): string[] {
  return [...metin.matchAll(ATIF)].map((m) => m[1]);
}

export function splitCumleler(metin: string): Cumle[] {
  // "…birimidir. [[sozluk.kob]] Sonra…" → atıf önceki cümleye bağlanır
  const bagli = metin.trim().replace(/([.!?…])((?:\s*\[\[[^\]]+\]\])+)/g, "$2$1");
  // "10. gün" gibi sıra sayılarında bölme
  return bagli
    .split(/(?<![0-9]\.)(?<=[.!?…])\s+/)
    .filter((c) => c.length > 0)
    .map((c) => ({ govde: c.replace(/\s*\[\[[^\]]+\]\]/g, ""), atiflar: findAtiflar(c) }));
}

export function cumleEtiketi(durumlar: Iterable<EtiketDurumu>): EtiketDurumu | null {
  const var_ = new Set(durumlar);
  return ONCELIK.find((d) => var_.has(d)) ?? null;
}
