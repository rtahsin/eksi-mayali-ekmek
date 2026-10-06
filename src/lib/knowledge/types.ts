export type ISODate = `${number}-${number}-${number}`;

export type SourceKind =
  | "makale"
  | "kitap"
  | "tez"
  | "yonetmelik"
  | "standart"
  | "atolye_kaydi"
  | "usta_bilgisi";

export interface SourceInput {
  kind: SourceKind;
  title: string;
  authors: readonly string[];
  year: number;
  venue?: string;
  doi?: string;
  isbn?: string;
  url?: string;
  experiment?: string;
  verified: {
    via: "crossref" | "elle" | "ic_kayit";
    at: ISODate;
  };
  notebookLmTitle?: string;
}

export interface EvidenceInput {
  source: string;
  locator?: string;
  supportCheck?: {
    via: "notebooklm";
    verdict: "destekliyor" | "kismen" | "desteklemiyor";
    at: ISODate;
  };
}

export type ClaimStatus = "dogrulandi" | "tartismali" | "efsane" | "geri_cekildi";

export interface ClaimInput {
  text: string;
  about: readonly string[];
  evidence: readonly [EvidenceInput, ...EvidenceInput[]];
  status: ClaimStatus;
  confidence: "yuksek" | "orta" | "dusuk";
  numbers?: readonly { label: string; value: number | readonly [number, number]; unit: string }[];
  sensitivity?: "saglik" | "yasal" | "karsilastirma";
  legalCheck?: { by: string; at: ISODate };
  review: { by: "tahsin"; at: ISODate; hash: string } | null;
  supersededBy?: string;
}

export type ConceptKind =
  | "canli"
  | "molekul"
  | "enzim"
  | "olay"
  | "tahil"
  | "un"
  | "katki"
  | "teknik"
  | "efsane"
  | "tarih";

export interface ConceptInput {
  kind: ConceptKind;
  name: string;
  latin?: string;
  nick?: string;
  aliases?: readonly string[];
  layers: { usta: string; neden: string; bilim: string };
  identity?: readonly { label: string; value: string; claim: string }[];
  parent?: string;
  media?: readonly string[];
}

export interface KnowledgeGraph {
  sources: Record<string, SourceInput>;
  claims: Record<string, ClaimInput>;
  concepts: Record<string, ConceptInput>;
  media?: Record<string, MediaItemInput>;
}

export type MediaLicense =
  | "own"
  | "cc-by"
  | "cc-by-sa"
  | "cc0"
  | "stock-licensed"
  | "adapted-from-publication";

export type MediaKind = "image" | "video" | "diagram";

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaItemInput {
  url: string;
  alt: string;
  license: MediaLicense;
  credit?: string;
  sourceId?: string;
  dimensions?: MediaDimensions;
  aspectRatio?: string;
  kind?: MediaKind;
  notes?: string;
}

