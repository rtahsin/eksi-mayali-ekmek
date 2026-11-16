import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/kernel/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { istanbulTime, istanbulToday } from "@/lib/time/istanbul";
import type {
  StudyoFormatKey,
  StudyoIssue,
  StudyoRenderJob,
  StudyoWorkspacePayload,
} from "@/types/studyo";
import {
  AUDIO_MIME_TO_EXT,
  isValidKonuId,
  MAX_STUDYO_AUDIO_BYTES,
  MAX_STUDYO_DOC_BYTES,
  MAX_STUDYO_VIDEO_BYTES,
  OUTPUT_MIME_TO_EXT,
  STUDYO_ALLOWED_BUCKET_MIMES,
  STUDYO_BUCKET,
  VIDEO_MIME_TO_EXT,
} from "./constants";
import { buildInitialStudyoCatalog } from "./seed";

const ISSUE_STATE_PREFIX = "state/issues";
const RENDER_QUEUE_PATH = "state/render-queue.json";

let bucketEnsuredInProcess = false;

export function istanbulTimestampIso(now: Date = new Date()): string {
  const day = istanbulToday(now);
  const { hour, minute } = istanbulTime(now);
  const sec = String(now.getUTCSeconds()).padStart(2, "0");
  return `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${sec}+03:00`;
}

function isSizeCapError(err: { message?: string; statusCode?: string } | null): boolean {
  if (!err) return false;
  return (
    err.statusCode === "413" ||
    /exceeded the maximum allowed size|EntityTooLarge/i.test(err.message ?? "")
  );
}

/**
 * Özel `studyo` bucket'ını (`public: false`, 50 MB sınır) ilk çağrıda idempotent olarak doğrular/oluşturur.
 * Proje tavanı daha düşükse `fileSizeLimit` olmadan otomatik geri düşer (RSC çökmesini önler).
 */
export async function ensureStudyoBucket(admin: SupabaseClient): Promise<void> {
  if (bucketEnsuredInProcess) return;

  const existing = await admin.storage.getBucket(STUDYO_BUCKET);
  if (!existing.error && existing.data) {
    const upd = await admin.storage.updateBucket(STUDYO_BUCKET, {
      public: false,
      fileSizeLimit: MAX_STUDYO_VIDEO_BYTES,
      allowedMimeTypes: [...STUDYO_ALLOWED_BUCKET_MIMES],
    });
    if (isSizeCapError(upd.error)) {
      await admin.storage.updateBucket(STUDYO_BUCKET, {
        public: false,
        allowedMimeTypes: [...STUDYO_ALLOWED_BUCKET_MIMES],
      });
    }
    bucketEnsuredInProcess = true;
    return;
  }

  let created = await admin.storage.createBucket(STUDYO_BUCKET, {
    public: false,
    fileSizeLimit: MAX_STUDYO_VIDEO_BYTES,
    allowedMimeTypes: [...STUDYO_ALLOWED_BUCKET_MIMES],
  });

  if (isSizeCapError(created.error)) {
    created = await admin.storage.createBucket(STUDYO_BUCKET, {
      public: false,
      allowedMimeTypes: [...STUDYO_ALLOWED_BUCKET_MIMES],
    });
  }

  if (created.error && !/already exists|duplicate/i.test(created.error.message)) {
    throw created.error;
  }

  bucketEnsuredInProcess = true;
}

export function resetBucketEnsuredForTest(): void {
  bucketEnsuredInProcess = false;
}

/** Yol geçişi (`..`, başlangıç `/`, null byte) barındırmayan güvenli `studyo` nesne yolu doğrulayıcı. */
export function isSafeStudyoStoragePath(path: string): boolean {
  if (!path || path.length > 240) return false;
  if (path.includes("..") || path.includes("\\") || path.includes("\0")) return false;
  if (path.startsWith("/")) return false;
  return /^(?:voice|oven|ready|state)\/[A-Za-z0-9._/-]+$/.test(path);
}

export type StudyoUploadCategory = "voice_take" | "oven_clip" | "ready_output";

export function buildStudyoUploadSpec(input: {
  category: StudyoUploadCategory;
  konuId: string;
  format: StudyoFormatKey;
  sceneNo?: number;
  mimeType: string;
  sizeBytes: number;
  uid?: string;
}): { ok: true; path: string } | { ok: false; error: string } {
  const { category, konuId, format, sceneNo, mimeType, sizeBytes } = input;
  if (!isValidKonuId(konuId)) {
    return { ok: false, error: "Geçersiz konu kimliği." };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "Dosya boyutu geçersiz." };
  }

  const id = (input.uid ?? crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "");

  if (category === "voice_take") {
    const ext = AUDIO_MIME_TO_EXT[mimeType];
    if (!ext) {
      return { ok: false, error: "Desteklenmeyen ses formatı (WAV, WebM, M4A veya MP3 seçin)." };
    }
    if (sizeBytes > MAX_STUDYO_AUDIO_BYTES) {
      return { ok: false, error: "Ses dosyası 40 MB sınırını aşıyor." };
    }
    const safeScene = Math.max(1, Math.min(99, Math.trunc(sceneNo ?? 1)));
    return {
      ok: true,
      path: `voice/${konuId}/${format}/sahne_${String(safeScene).padStart(2, "0")}_${id}.${ext}`,
    };
  }

  if (category === "oven_clip") {
    const ext = VIDEO_MIME_TO_EXT[mimeType];
    if (!ext) {
      return { ok: false, error: "Taş fırın klibi MP4, MOV veya WebM olmalıdır." };
    }
    if (sizeBytes > MAX_STUDYO_VIDEO_BYTES) {
      return { ok: false, error: "Video klibi 50 MB sınırını aşıyor; lütfen 5-20 saniyelik klip seçin." };
    }
    return {
      ok: true,
      path: `oven/${konuId}/klip_${id}.${ext}`,
    };
  }

  const ext = OUTPUT_MIME_TO_EXT[mimeType];
  if (!ext) {
    return { ok: false, error: "Çıktı dosyası MP4, WebM, WAV veya PDF olmalıdır." };
  }
  const maxBytes = ext === "pdf" ? MAX_STUDYO_DOC_BYTES : MAX_STUDYO_VIDEO_BYTES;
  if (sizeBytes > maxBytes) {
    return { ok: false, error: "Çıktı dosyası boyut sınırını aşıyor." };
  }
  return {
    ok: true,
    path: `ready/${konuId}/${format}_${id}.${ext}`,
  };
}

async function readJsonObject<T>(
  admin: SupabaseClient,
  path: string
): Promise<T | null> {
  const { data, error } = await admin.storage.from(STUDYO_BUCKET).download(path);
  if (error || !data) return null;
  try {
    const text = await data.text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function writeJsonObject(
  admin: SupabaseClient,
  path: string,
  payload: unknown
): Promise<void> {
  const body = JSON.stringify(payload, null, 2);
  const { error } = await admin.storage
    .from(STUDYO_BUCKET)
    .upload(path, new Blob([body], { type: "application/json" }), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw error;
}

function stripTransientUrls(issue: StudyoIssue): StudyoIssue {
  const cleanVoice: StudyoIssue["voiceTakes"] = {};
  for (const [fmtKey, sceneMap] of Object.entries(issue.voiceTakes)) {
    if (!sceneMap) continue;
    const fmt = fmtKey as StudyoFormatKey;
    cleanVoice[fmt] = {};
    for (const [sceneNoStr, take] of Object.entries(sceneMap)) {
      cleanVoice[fmt]![Number(sceneNoStr)] = { ...take, signedUrl: null };
    }
  }

  return {
    ...issue,
    voiceTakes: cleanVoice,
    ovenClips: issue.ovenClips.map((clip) => ({ ...clip, signedUrl: null })),
    readyAssets: issue.readyAssets.map((asset) => ({ ...asset, signedUrl: null })),
  };
}

async function hydrateSignedUrls(
  admin: SupabaseClient,
  issues: StudyoIssue[],
  queue: StudyoRenderJob[]
): Promise<{ issues: StudyoIssue[]; queue: StudyoRenderJob[] }> {
  const allPaths = new Set<string>();

  for (const issue of issues) {
    for (const sceneMap of Object.values(issue.voiceTakes)) {
      if (!sceneMap) continue;
      for (const take of Object.values(sceneMap)) {
        if (isSafeStudyoStoragePath(take.storagePath)) allPaths.add(take.storagePath);
      }
    }
    for (const clip of issue.ovenClips) {
      if (isSafeStudyoStoragePath(clip.storagePath)) allPaths.add(clip.storagePath);
    }
    for (const asset of issue.readyAssets) {
      if (isSafeStudyoStoragePath(asset.storagePath)) allPaths.add(asset.storagePath);
    }
  }
  for (const job of queue) {
    if (job.outputPath && isSafeStudyoStoragePath(job.outputPath)) {
      allPaths.add(job.outputPath);
    }
  }

  const urlMap = new Map<string, string>();
  const pathList = [...allPaths];
  if (pathList.length > 0) {
    const { data } = await admin.storage
      .from(STUDYO_BUCKET)
      .createSignedUrls(pathList, 3600);
    if (Array.isArray(data)) {
      for (const entry of data) {
        if (entry.path && entry.signedUrl) {
          urlMap.set(entry.path, entry.signedUrl);
        }
      }
    }
  }

  const hydratedIssues = issues.map((issue) => {
    const voiceTakes: StudyoIssue["voiceTakes"] = {};
    for (const [fmtKey, sceneMap] of Object.entries(issue.voiceTakes)) {
      if (!sceneMap) continue;
      const fmt = fmtKey as StudyoFormatKey;
      voiceTakes[fmt] = {};
      for (const [sceneNoStr, take] of Object.entries(sceneMap)) {
        voiceTakes[fmt]![Number(sceneNoStr)] = {
          ...take,
          signedUrl: urlMap.get(take.storagePath) ?? null,
        };
      }
    }
    return {
      ...issue,
      voiceTakes,
      ovenClips: issue.ovenClips.map((c) => ({
        ...c,
        signedUrl: urlMap.get(c.storagePath) ?? null,
      })),
      readyAssets: issue.readyAssets.map((a) => ({
        ...a,
        signedUrl: urlMap.get(a.storagePath) ?? null,
      })),
    };
  });

  const hydratedQueue = queue.map((job) => ({
    ...job,
    outputSignedUrl: job.outputPath ? urlMap.get(job.outputPath) ?? null : null,
  }));

  return { issues: hydratedIssues, queue: hydratedQueue };
}

export async function loadStudyoWorkspace(): Promise<StudyoWorkspacePayload> {
  const seedIssues = buildInitialStudyoCatalog();
  const todayIstanbul = istanbulToday();
  const githubDispatchConfigured = Boolean(
    process.env.GITHUB_RENDER_PAT && process.env.GITHUB_REPO_SLUG
  );

  const admin = createAdminClient();
  if (!admin) {
    return {
      cloudConfigured: false,
      githubDispatchConfigured,
      todayIstanbul,
      issues: seedIssues,
      renderQueue: [],
    };
  }

  try {
    await ensureStudyoBucket(admin);

    const { data: savedFiles } = await admin.storage
      .from(STUDYO_BUCKET)
      .list(ISSUE_STATE_PREFIX, { limit: 100 });

    const savedNames = new Set(
      (savedFiles ?? [])
        .map((f) => f.name)
        .filter((name): name is string => typeof name === "string" && name.endsWith(".json"))
    );

    const [overrides, queueRaw] = await Promise.all([
      Promise.all(
        [...savedNames].map((fileName) =>
          readJsonObject<StudyoIssue>(admin, `${ISSUE_STATE_PREFIX}/${fileName}`)
        )
      ),
      readJsonObject<StudyoRenderJob[]>(admin, RENDER_QUEUE_PATH),
    ]);

    const overrideMap = new Map<string, StudyoIssue>();
    for (const item of overrides) {
      if (item && isValidKonuId(item.konuId)) {
        overrideMap.set(item.konuId, item);
      }
    }

    const mergedIssues = seedIssues.map((seed) => {
      const saved = overrideMap.get(seed.konuId);
      if (!saved) return seed;
      return {
        ...seed,
        ...saved,
        scenes: {
          ...seed.scenes,
          ...(saved.scenes ?? {}),
        },
        newspaper: {
          ...seed.newspaper,
          ...(saved.newspaper ?? {}),
        },
        social: {
          ...seed.social,
          ...(saved.social ?? {}),
        },
      };
    });

    const queue = Array.isArray(queueRaw) ? queueRaw.slice(0, 30) : [];
    const hydrated = await hydrateSignedUrls(admin, mergedIssues, queue);

    return {
      cloudConfigured: true,
      githubDispatchConfigured,
      todayIstanbul,
      issues: hydrated.issues,
      renderQueue: hydrated.queue,
    };
  } catch (err: unknown) {
    logError("loadStudyoWorkspace storage fallback", err);
    return {
      cloudConfigured: false,
      githubDispatchConfigured,
      todayIstanbul,
      issues: seedIssues,
      renderQueue: [],
    };
  }
}

export async function loadSingleStudyoIssue(konuId: string): Promise<StudyoIssue | null> {
  if (!isValidKonuId(konuId)) return null;
  const seed = buildInitialStudyoCatalog().find((item) => item.konuId === konuId);
  if (!seed) return null;

  const admin = createAdminClient();
  if (!admin) return seed;

  await ensureStudyoBucket(admin);
  const saved = await readJsonObject<StudyoIssue>(
    admin,
    `${ISSUE_STATE_PREFIX}/${konuId}.json`
  );
  const merged: StudyoIssue = saved
    ? {
        ...seed,
        ...saved,
        scenes: { ...seed.scenes, ...(saved.scenes ?? {}) },
        newspaper: { ...seed.newspaper, ...(saved.newspaper ?? {}) },
        social: { ...seed.social, ...(saved.social ?? {}) },
      }
    : seed;

  const hydrated = await hydrateSignedUrls(admin, [merged], []);
  return hydrated.issues[0] ?? merged;
}

export async function saveStudyoIssue(issue: StudyoIssue): Promise<StudyoIssue> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Supabase bulut bağlantısı yapılandırılmamış.");
  }
  await ensureStudyoBucket(admin);
  const updated: StudyoIssue = {
    ...stripTransientUrls(issue),
    updatedAt: istanbulTimestampIso(),
  };
  await writeJsonObject(
    admin,
    `${ISSUE_STATE_PREFIX}/${issue.konuId}.json`,
    updated
  );
  const hydrated = await hydrateSignedUrls(admin, [updated], []);
  return hydrated.issues[0] ?? updated;
}

export async function appendStudyoRenderJob(
  job: StudyoRenderJob
): Promise<StudyoRenderJob[]> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Supabase bulut bağlantısı yapılandırılmamış.");
  }
  await ensureStudyoBucket(admin);
  const existing =
    (await readJsonObject<StudyoRenderJob[]>(admin, RENDER_QUEUE_PATH)) ?? [];
  const next = [job, ...existing.filter((j) => j.id !== job.id)].slice(0, 30);
  await writeJsonObject(admin, RENDER_QUEUE_PATH, next);
  const hydrated = await hydrateSignedUrls(admin, [], next);
  return hydrated.queue;
}
