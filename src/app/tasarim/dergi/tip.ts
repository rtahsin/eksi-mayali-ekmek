import type { ReactNode } from "react";
import type { NotSiniflari } from "./Dipnot";

// Üç yönün de aldığı içerik: aynı anın aynı cümleleri ve grafikleri, yalnız düzen ve dil değişir.

export interface DergiRakami {
  deger: string;
  birim: string;
  aciklama: string;
  renk: "ic" | "kabuk" | "vurgu";
}

export interface DergiBolumu {
  baslik: string;
  paragraflar: ReactNode[];
  sekiller: ReactNode[];
}

export interface DergiIcerik {
  levha: string;
  durak: string;
  baslik: string;
  soru: string;
  giris: ReactNode;
  rakamlar: DergiRakami[];
  kesit: ReactNode;
  bolumler: DergiBolumu[];
  yuzlesme: { inanc: string; cevap: ReactNode; sekil?: ReactNode }[];
  notlar: (s: NotSiniflari) => ReactNode;
  sup: string;
}
