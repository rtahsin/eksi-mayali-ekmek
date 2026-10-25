import { IBM_Plex_Mono, Newsreader } from "next/font/google";

// Levha düzeninin yazıları: metin ve başlıklar Newsreader, etiketler ve sayılar IBM Plex Mono.

const serif = Newsreader({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], axes: ["opsz"], variable: "--f-serif", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], variable: "--f-mono", display: "swap" });

export const LEVHA_FONTLARI = `${serif.variable} ${mono.variable}`;
