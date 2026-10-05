import type { BakeDecisions, LevelProfile } from "@/types/game";

export interface StageProps {
  d: BakeDecisions;
  set: <K extends keyof BakeDecisions>(k: K, v: BakeDecisions[K]) => void;
  level: LevelProfile;
  /** Aşamayı bitir (oyun kabuğu bilim notunu gösterip sonraki aşamaya geçer) */
  done: () => void;
}
