import { STUDYO_BUCKET } from "@/lib/studyo/constants";
import type { StudyoUploadCategory } from "@/lib/studyo/storage";
import { createClient } from "@/lib/supabase/client";
import type { StudyoFormatKey, StudyoIssue } from "@/types/studyo";

interface SignedUploadInitResponse {
  bucket?: string;
  path?: string;
  token?: string;
  error?: string;
}

export async function uploadBlobDirectToStudyo(params: {
  category: StudyoUploadCategory;
  konuId: string;
  format: StudyoFormatKey;
  sceneNo?: number;
  blob: Blob;
  mimeType: string;
}): Promise<{ storagePath: string }> {
  const initRes = await fetch("/api/admin/studyo/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: params.category,
      konuId: params.konuId,
      format: params.format,
      sceneNo: params.sceneNo,
      mimeType: params.mimeType,
      sizeBytes: params.blob.size,
    }),
  });

  const initBody = (await initRes.json().catch(() => ({}))) as SignedUploadInitResponse;
  if (!initRes.ok || !initBody.path || !initBody.token) {
    throw new Error(initBody.error || "Bulut yükleme izni alınamadı.");
  }

  const supabase = createClient();
  if (!supabase) {
    throw new Error("Tarayıcı Supabase istemcisi başlatılamadı.");
  }

  const { error: uploadErr } = await supabase.storage
    .from(initBody.bucket || STUDYO_BUCKET)
    .uploadToSignedUrl(initBody.path, initBody.token, params.blob, {
      contentType: params.mimeType,
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(uploadErr.message || "Dosya buluta yüklenemedi.");
  }

  return { storagePath: initBody.path };
}

export async function registerVoiceTakeInCloud(params: {
  konuId: string;
  format: StudyoFormatKey;
  sceneNo: number;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  peakDbfs: number;
  approxLufs: number;
}): Promise<StudyoIssue> {
  const res = await fetch("/api/admin/studyo/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "voice_take",
      ...params,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    issue?: StudyoIssue;
    error?: string;
  };
  if (!res.ok || !body.issue) {
    throw new Error(body.error || "Ses kaydı bulut durumuna işlenemedi.");
  }
  return body.issue;
}

export async function registerOvenClipInCloud(params: {
  konuId: string;
  label: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
}): Promise<StudyoIssue> {
  const res = await fetch("/api/admin/studyo/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "oven_clip",
      ...params,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    issue?: StudyoIssue;
    error?: string;
  };
  if (!res.ok || !body.issue) {
    throw new Error(body.error || "Taş fırın klibi kaydedilemedi.");
  }
  return body.issue;
}

export async function registerReadyOutputInCloud(params: {
  konuId: string;
  kind: "video_9x16" | "master_wav" | "gazete_pdf";
  format: StudyoFormatKey;
  label: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  lufs?: number;
  fps?: number;
}): Promise<StudyoIssue> {
  const res = await fetch("/api/admin/studyo/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "ready_output",
      ...params,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    issue?: StudyoIssue;
    error?: string;
  };
  if (!res.ok || !body.issue) {
    throw new Error(body.error || "Hazır çıktı kasaya kaydedilemedi.");
  }
  return body.issue;
}
