export interface ContentRef {
  kind: "yazi" | "kart" | "urun" | "gezinme";
  id: string;
  status?: "taslak" | "inceleme" | "yayinda" | "arsiv";
  surface: "icerik" | "urun";
  claimIds: readonly string[];
  conceptIds: readonly string[];
  mediaIds: readonly string[];
  text?: string;
  summary?: string;
  levels?: readonly (1 | 2 | 3)[];
}

export interface GraphIssue {
  code: `K${number}`;
  severity: "error" | "warn";
  ref: string;
  message: string;
}
