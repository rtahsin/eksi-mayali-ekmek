import "react";

declare module "react" {
  // Modern Web Guidance native HTML attributes (focusgroup, dialog closedby, media lazy loading)
  // augmented cleanly without using `any`.
  interface HTMLAttributes<T> {
    focusgroup?: string;
    focusgroupstart?: "" | boolean;
  }
  interface DialogHTMLAttributes<T> {
    closedby?: "any" | "closerequest" | "none";
  }
  interface VideoHTMLAttributes<T> {
    loading?: "lazy" | "eager";
  }
  interface AudioHTMLAttributes<T> {
    loading?: "lazy" | "eager";
  }
}

export type StudyoFormatKey = "kisa_01" | "kisa_02" | "seri_b" | "uzun";

export type StudyoAudioMode = "voice_ducking" | "pure_asmr";

export type StudyoSeriesKind = "seri_a_bilim" | "seri_b_firin";

export type StudyoMechanismBeat =
  | "ph_duvari"
  | "maltoz_ortakligi"
  | "arabinoksilan_jeli"
  | "disulfit_agi";

export type StudyoPublishChannel =
  | "ig_reels_1"
  | "ig_reels_2"
  | "ig_seri_b"
  | "tiktok"
  | "youtube_shorts"
  | "gazete_baski"
  | "web_bilim";

export interface StudyoChartPoint {
  xLabel: string;
  value: number;
  secondaryValue?: number;
}

export interface StudyoScienceChartSpec {
  title: string;
  unit: string;
  primaryLabel: string;
  secondaryLabel?: string;
  thresholdLabel?: string;
  thresholdValue?: number;
  points: StudyoChartPoint[];
}

export interface StudyoScene {
  sceneNo: number;
  title: string;
  caption: string;
  voiceText: string;
  estimatedSec: number;
  visualCue: string;
  flowPrompt: string;
  mechanismBeat?: StudyoMechanismBeat;
}

export interface StudyoVoiceTake {
  sceneNo: number;
  format: StudyoFormatKey;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  peakDbfs: number;
  approxLufs: number;
  recordedAt: string;
  signedUrl?: string | null;
}

export interface StudyoOvenClip {
  id: string;
  slotOrder: number;
  label: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  uploadedAt: string;
  signedUrl?: string | null;
}

export type StudyoReadyAssetKind =
  | "video_9x16"
  | "master_wav"
  | "gazete_pdf";

export interface StudyoReadyAsset {
  id: string;
  kind: StudyoReadyAssetKind;
  format: StudyoFormatKey;
  label: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  lufs?: number;
  fps?: number;
  createdAt: string;
  signedUrl?: string | null;
}

export interface StudyoK006Violation {
  term: string;
  suggestion: string;
  excerpt: string;
}

export interface StudyoK006Report {
  passed: boolean;
  violationCount: number;
  violations: StudyoK006Violation[];
}

export interface StudyoPhoneticItem {
  term: string;
  pronunciation: string;
  note: string;
}

export interface StudyoCoachCheck {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  maxScore: number;
  detail: string;
}

export interface StudyoCoachReport {
  totalScore: number;
  estimatedTotalSec: number;
  wordCount: number;
  numericAnchorCount: number;
  safeZonePassed: boolean;
  checks: StudyoCoachCheck[];
}

export interface StudyoSocialPack {
  reelsCaption: string;
  tiktokCaption: string;
  youtubeTitle: string;
  youtubeDescription: string;
  accompanimentCta: string;
}

export interface StudyoNewspaperSpec {
  headline: string;
  subheadline: string;
  leadFact: string;
  benchRule: string;
  mythTitle: string;
  mythCorrection: string;
  pairingNote: string;
  qrTargetPath: string;
}

export interface StudyoIssue {
  konuId: string;
  issueNumber: number;
  partLabel: string;
  title: string;
  subtitle: string;
  productSlug: string;
  productName: string;
  status: "ready" | "in_progress" | "planned";
  coreMechanism: string;
  anchorPapers: string[];
  ftsPaperCount: number;
  audioMode: StudyoAudioMode;
  approvedFormats: StudyoFormatKey[];
  publishedChannels: StudyoPublishChannel[];
  directorNotes: string;
  bookSummary: string;
  chart: StudyoScienceChartSpec;
  defaultBeat: StudyoMechanismBeat;
  newspaper: StudyoNewspaperSpec;
  social: StudyoSocialPack;
  scenes: Record<StudyoFormatKey, StudyoScene[]>;
  voiceTakes: Partial<Record<StudyoFormatKey, Record<number, StudyoVoiceTake>>>;
  ovenClips: StudyoOvenClip[];
  readyAssets: StudyoReadyAsset[];
  updatedAt: string;
}

export type StudyoRenderJobStatus = "queued" | "processing" | "ready" | "failed";

export interface StudyoRenderJob {
  id: string;
  konuId: string;
  format: StudyoFormatKey;
  series: StudyoSeriesKind;
  audioMode: StudyoAudioMode;
  fps: 60;
  width: 1080;
  height: 1920;
  safeZoneBottomPx: number;
  safeZoneRightPx: number;
  status: StudyoRenderJobStatus;
  workerTarget: "cloud_or_local" | "github_actions" | "browser_instant";
  statusMessage: string;
  outputPath?: string | null;
  outputSignedUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyoWorkspacePayload {
  cloudConfigured: boolean;
  githubDispatchConfigured: boolean;
  todayIstanbul: string;
  issues: StudyoIssue[];
  renderQueue: StudyoRenderJob[];
}
