import type { StudyoPhoneticItem } from "@/types/studyo";
import { trLower } from "./k006";

interface PhoneticEntry {
  patterns: readonly string[];
  term: string;
  pronunciation: string;
  note: string;
}

const PHONETIC_DICTIONARY: readonly PhoneticEntry[] = [
  {
    patterns: ["sanfranciscensis", "sanfransiskensis"],
    term: "F. sanfranciscensis",
    pronunciation: "fruk-ti-lak-to-ba-sil-lus san-fran-sis-ken-sis",
    note: "Tip I ekşi mayanın başrol laktik asit bakterisi",
  },
  {
    patterns: ["kazachstania", "kazahstanya", "humilis"],
    term: "Kazachstania humilis",
    pronunciation: "ka-zah-stan-ya hu-mi-lis",
    note: "Maltoz-negatif asit dirençli ekşi maya mayası",
  },
  {
    patterns: ["weissella", "vaysella"],
    term: "Weissella",
    pronunciation: "vay-sel-la",
    note: "İlk 24-48 saatte uyanan öncü kok ve dekstran üreticisi",
  },
  {
    patterns: ["lactococcus", "laktokokus"],
    term: "Lactococcus",
    pronunciation: "lak-to-ko-kus",
    note: "Erken faz öncü laktik kok",
  },
  {
    patterns: ["leuconostoc", "lökonostok"],
    term: "Leuconostoc",
    pronunciation: "lö-ko-nos-tok",
    note: "Heterofermentatif öncü kok",
  },
  {
    patterns: ["pantoea", "pantoya"],
    term: "Pantoea",
    pronunciation: "pan-to-ya",
    note: "Tahıl yüzeyinden gelen erken faz bakterisi",
  },
  {
    patterns: ["clostridium", "klostridyum"],
    term: "Clostridium",
    pronunciation: "klos-trid-yum",
    note: "pH > 4,5 kaldığında bütirik asit üreten sporlu bakteri",
  },
  {
    patterns: ["bacillus", "basillus"],
    term: "Bacillus",
    pronunciation: "ba-sil-lus",
    note: "Un kaynaklı sporlu bakteri cinsi",
  },
  {
    patterns: ["enterobacteriaceae", "enterobakteri"],
    term: "Enterobacteriaceae",
    pronunciation: "en-te-ro-bak-te-ri-ler",
    note: "Asit duvarı kurulana kadar gaz üreten erken grup",
  },
  {
    patterns: ["saccharomyces cerevisiae", "cerevisiae"],
    term: "S. cerevisiae",
    pronunciation: "sak-ka-ro-mi-ses se-re-viz-ye",
    note: "Klasik fırıncı mayası",
  },
  {
    patterns: ["pka", "pekaa"],
    term: "pKa",
    pronunciation: "pe-ka-a",
    note: "Zayıf asit ayrışma sabiti (Laktik: 3,86 · Asetik: 4,75)",
  },
  {
    patterns: [" ph ", "ph ", "pehaş"],
    term: "pH",
    pronunciation: "pe-haş",
    note: "Aktif hidrojen iyonu ölçüsü",
  },
  {
    patterns: ["tta"],
    term: "TTA",
    pronunciation: "te-te-a (toplam titre edilebilir asitlik)",
    note: "Toplam organik asit tampon havuzu",
  },
  {
    patterns: ["weax", "wuax", "arabinoksilan"],
    term: "Arabinoksilan (WEAX / WUAX)",
    pronunciation: "a-ra-bi-nok-si-lan (ve-aks / vu-aks)",
    note: "Çavdar hamurunun su bağlayan pentozan lif iskeleti",
  },
  {
    patterns: ["maillard"],
    term: "Maillard",
    pronunciation: "ma-yar",
    note: ">140 °C kabuk kızarma ve aroma reaksiyonu",
  },
  {
    patterns: ["autolyse", "otoliz"],
    term: "Autolyse (Otoliz)",
    pronunciation: "o-to-liz",
    note: "Tuz ve maya öncesi un-su ön dinlendirmesi",
  },
  {
    patterns: ["retrogradasyon"],
    term: "Retrogradasyon",
    pronunciation: "ret-ro-gra-das-yon",
    note: "Amilopektin yan zincirlerinin yeniden kristalleşmesi (bayatlama)",
  },
];

/** Metinde geçen bilimsel/Latince terimler için Türkçe okunuş kartlarını çıkarır. */
export function extractPhoneticGuides(text: string): StudyoPhoneticItem[] {
  const haystack = ` ${trLower(text)} `;
  const found: StudyoPhoneticItem[] = [];

  for (const entry of PHONETIC_DICTIONARY) {
    if (entry.patterns.some((pat) => haystack.includes(pat))) {
      found.push({
        term: entry.term,
        pronunciation: entry.pronunciation,
        note: entry.note,
      });
    }
  }

  return found;
}

/** Konuşma hızına (~2,35 Türkçe kelime / saniye) göre sahne süresini hesaplar. */
export function estimateSpeechSeconds(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return 3;
  const raw = words.length / 2.35 + 0.5;
  return Math.max(2.5, Math.round(raw * 10) / 10);
}
