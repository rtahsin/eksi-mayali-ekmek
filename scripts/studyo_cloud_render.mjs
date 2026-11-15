#!/usr/bin/env node
/**
 * EkmekLab Bulut Stüdyo — 60 fps H.264 & -14 LUFS Bulut Render İşçisi
 * -------------------------------------------------------------------
 * Ev bilgisayarı kapalıyken GitHub Actions (`studyo-bulut-render.yml`) üzerinde
 * çalışır; özel `studyo` Supabase Storage kovasından sahne seslerini ve S24 taş
 * fırın kliplerini indirir, 1080x1920 60 fps H.264 + EBU R128 (-14 LUFS / -1.5 dBTP)
 * kurguyu derler ve biten MP4'ü doğrudan telefon kasasına (`ready/<KONU>/...`) yazar.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "studyo";
const QUEUE_PATH = "state/render-queue.json";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const TARGET_JOB_ID = (process.env.STUDYO_JOB_ID || "").trim();
const TARGET_KONU_ID = (process.env.STUDYO_KONU_ID || "").trim();
const TARGET_FORMAT = (process.env.STUDYO_FORMAT || "").trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[studyo-cloud-render] Eksik ortam değişkeni: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı olmalıdır."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function istanbulIsoNow() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}+03:00`;
}

async function readJsonFromBucket(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  const text = await data.text();
  return JSON.parse(text);
}

async function writeJsonToBucket(storagePath, payload) {
  const bytes = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) {
    throw new Error(`JSON yazılamadı (${storagePath}): ${error.message}`);
  }
}

async function downloadToFile(storagePath, destFile) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(`Dosya indirilemedi (${storagePath}): ${error?.message || "boş"}`);
  }
  const ab = await data.arrayBuffer();
  fs.writeFileSync(destFile, Buffer.from(ab));
}

function formatSrtTimestamp(sec) {
  const clamped = Math.max(0, sec);
  const totalMs = Math.round(clamped * 1000);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  const pad2 = (n) => String(n).padStart(2, "0");
  const pad3 = (n) => String(n).padStart(3, "0");
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)},${pad3(ms)}`;
}

function sanitizeSubtitleLine(text) {
  return String(text || "")
    .replace(/\r?\n+/g, " ")
    .replace(/[{}]/g, "")
    .trim();
}

function probeDurationSec(filePath, fallbackSec) {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { encoding: "utf8" }
    ).trim();
    const parsed = Number.parseFloat(out);
    if (Number.isFinite(parsed) && parsed > 0.2) {
      return parsed;
    }
  } catch {
    // ffprobe hata verirse sahne hedef süresine dön
  }
  return fallbackSec;
}

function runFfmpeg(args) {
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], {
    stdio: "inherit",
  });
}

async function renderJob(job, issue, workDir) {
  const formatKey = job.format || "kisa_01";
  const scenes = Array.isArray(issue?.scenes?.[formatKey])
    ? issue.scenes[formatKey]
    : [];
  if (scenes.length === 0) {
    throw new Error(`${job.konuId} / ${formatKey} içinde sahne bulunamadı.`);
  }

  const formatVoiceMap =
    issue?.voiceTakes && typeof issue.voiceTakes === "object"
      ? issue.voiceTakes[formatKey] || {}
      : {};
  const ovenClips = Array.isArray(issue.ovenClips) ? issue.ovenClips : [];
  const isPureAsmr =
    formatKey === "seri_b" && issue.audioMode === "pure_asmr";

  // 1. Sahne seslerini hazırla (varsa gerçek kayıt, yoksa sessiz referans kanal)
  const sceneAudioFiles = [];
  const sceneDurations = [];
  let recordedTakeCount = 0;

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const sceneNo = Number(scene.sceneNo) || i + 1;
    const targetSec = Math.max(2, Number(scene.estimatedSec) || 6);
    const matchingTake = !isPureAsmr
      ? formatVoiceMap[sceneNo] || formatVoiceMap[String(sceneNo)] || null
      : null;

    const sceneWav = path.join(workDir, `scene_audio_${i}.wav`);
    if (matchingTake && typeof matchingTake.storagePath === "string") {
      recordedTakeCount += 1;
      const rawAudio = path.join(workDir, `raw_take_${i}`);
      await downloadToFile(matchingTake.storagePath, rawAudio);
      runFfmpeg([
        "-i",
        rawAudio,
        "-ac",
        "2",
        "-ar",
        "48000",
        "-c:a",
        "pcm_s16le",
        sceneWav,
      ]);
      const actualDur = probeDurationSec(sceneWav, targetSec);
      sceneDurations.push(Math.max(1.8, actualDur + 0.18));
    } else {
      runFfmpeg([
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=48000:cl=stereo",
        "-t",
        targetSec.toFixed(2),
        "-c:a",
        "pcm_s16le",
        sceneWav,
      ]);
      sceneDurations.push(targetSec);
    }
    sceneAudioFiles.push(sceneWav);
  }

  const totalDuration = sceneDurations.reduce((acc, d) => acc + d, 0);

  // 2. Sahne seslerini birleştir
  const concatAudioList = path.join(workDir, "audio_list.txt");
  fs.writeFileSync(
    concatAudioList,
    sceneAudioFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"),
    "utf8"
  );
  const stitchedVoiceWav = path.join(workDir, "stitched_voice.wav");
  runFfmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatAudioList,
    "-c:a",
    "pcm_s16le",
    stitchedVoiceWav,
  ]);

  // 3. Görüntü omurgasını oluştur (S24 gerçek taş fırın klipleri veya Stüdyo Koyu 9:16 zemin)
  const baseVideoMp4 = path.join(workDir, "base_video.mp4");
  const downloadedClips = [];
  for (let c = 0; c < ovenClips.length; c += 1) {
    const clip = ovenClips[c];
    if (!clip?.storagePath) continue;
    const ext = path.extname(clip.storagePath) || ".mp4";
    const dest = path.join(workDir, `oven_clip_${c}${ext}`);
    try {
      await downloadToFile(clip.storagePath, dest);
      downloadedClips.push(dest);
    } catch (err) {
      console.warn("[studyo-cloud-render] Fırın klibi atlandı:", err);
    }
  }

  if (downloadedClips.length > 0) {
    const normalizedClips = [];
    const perClipDur = Math.max(2.5, totalDuration / downloadedClips.length);
    for (let idx = 0; idx < downloadedClips.length; idx += 1) {
      const normOut = path.join(workDir, `norm_clip_${idx}.mp4`);
      runFfmpeg([
        "-stream_loop",
        "-1",
        "-i",
        downloadedClips[idx],
        "-t",
        perClipDur.toFixed(2),
        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=60,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        normOut,
      ]);
      normalizedClips.push(normOut);
    }
    const clipListTxt = path.join(workDir, "clip_list.txt");
    fs.writeFileSync(
      clipListTxt,
      normalizedClips.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"),
      "utf8"
    );
    runFfmpeg([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      clipListTxt,
      "-t",
      totalDuration.toFixed(2),
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      baseVideoMp4,
    ]);
  } else {
    // Sıcak Taş Fırın Koyu Stüdyo 9:16 zemin (#1A1311)
    runFfmpeg([
      "-f",
      "lavfi",
      "-i",
      `color=c=0x1A1311:s=1080x1920:r=60:d=${totalDuration.toFixed(2)}`,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=48000:cl=stereo",
      "-shortest",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      baseVideoMp4,
    ]);
  }

  // 4. Safe-Zone Korumalı SRT Altyazı Kartlarını Üret
  const srtLines = [];
  let cursor = 0;
  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const dur = sceneDurations[i];
    const startTs = formatSrtTimestamp(cursor + 0.06);
    const endTs = formatSrtTimestamp(cursor + dur - 0.06);
    const caption = sanitizeSubtitleLine(scene.caption || scene.voiceText);
    const badge = sanitizeSubtitleLine(
      `EKMEKLAB · SAYI #${String(issue.issueNumber || 1).padStart(2, "0")}`
    );
    srtLines.push(`${i + 1}\n${startTs} --> ${endTs}\n${badge}\n${caption}\n`);
    cursor += dur;
  }

  const srtPath = path.join(workDir, "captions.srt");
  fs.writeFileSync(srtPath, srtLines.join("\n"), "utf8");

  // ASS MarginV (1920 yükseklikte alt safe-zone >= 422px koruması)
  const marginV = Math.max(430, Number(job.safeZoneBottomPx) || 440);
  const marginR = Math.max(156, Number(job.safeZoneRightPx) || 160);
  const escapedSrt = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  const subtitleFilter = `subtitles='${escapedSrt}':force_style='PlayResX=1080,PlayResY=1920,FontName=DejaVu Sans,FontSize=46,Bold=1,PrimaryColour=&H00ECF6FB,OutlineColour=&H0011131A,BackColour=&H9911131A,BorderStyle=3,Outline=3,Shadow=0,Alignment=2,MarginL=72,MarginR=${marginR},MarginV=${marginV}'`;

  // 5. Ses Miksajı (Saf ASMR veya -22 dB Fırın Ducking + EBU R128 -14 LUFS) ve Final 60fps Render
  const finalMp4 = path.join(workDir, "final_60fps.mp4");
  const hasAnyVoiceTake = !isPureAsmr && recordedTakeCount > 0;

  if (downloadedClips.length > 0 && isPureAsmr) {
    runFfmpeg([
      "-i",
      baseVideoMp4,
      "-vf",
      `${subtitleFilter},fps=60,format=yuv420p`,
      "-af",
      "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "19",
      "-r",
      "60",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      finalMp4,
    ]);
  } else if (downloadedClips.length > 0 && hasAnyVoiceTake) {
    // Taş fırın ambiyansı -22 dB (0.08) + Tahsin anlatım sesi -> -14 LUFS
    runFfmpeg([
      "-i",
      baseVideoMp4,
      "-i",
      stitchedVoiceWav,
      "-filter_complex",
      `[0:v]${subtitleFilter},fps=60,format=yuv420p[vout];[0:a]volume=0.08[amb];[1:a]volume=1.0[vox];[amb][vox]amix=inputs=2:duration=first:dropout_transition=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]`,
      "-map",
      "[vout]",
      "-map",
      "[aout]",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "19",
      "-r",
      "60",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      finalMp4,
    ]);
  } else {
    const audioFilter = hasAnyVoiceTake
      ? "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
      : "aresample=48000";
    runFfmpeg([
      "-i",
      baseVideoMp4,
      "-i",
      stitchedVoiceWav,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-vf",
      `${subtitleFilter},fps=60,format=yuv420p`,
      "-af",
      audioFilter,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "19",
      "-r",
      "60",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      finalMp4,
    ]);
  }

  const stamp = Date.now();
  const outputStoragePath = `ready/${job.konuId}/${job.konuId}_${formatKey}_60fps_${stamp}.mp4`;
  const mp4Buffer = fs.readFileSync(finalMp4);

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(outputStoragePath, mp4Buffer, {
      contentType: "video/mp4",
      upsert: true,
    });
  if (uploadErr) {
    throw new Error(`Render MP4 yüklenemedi: ${uploadErr.message}`);
  }

  return {
    outputStoragePath,
    sizeBytes: mp4Buffer.byteLength,
    durationSec: Number(totalDuration.toFixed(1)),
  };
}

async function main() {
  const queue = (await readJsonFromBucket(QUEUE_PATH)) || [];
  let targetIdx = -1;

  if (TARGET_JOB_ID) {
    targetIdx = queue.findIndex((j) => j.id === TARGET_JOB_ID);
  }
  if (targetIdx === -1) {
    targetIdx = queue.findIndex(
      (j) =>
        j.status === "queued" &&
        (!TARGET_KONU_ID || j.konuId === TARGET_KONU_ID) &&
        (!TARGET_FORMAT || j.format === TARGET_FORMAT)
    );
  }

  if (targetIdx === -1) {
    console.log("[studyo-cloud-render] Kuyrukta bekleyen iş bulunamadı.");
    return;
  }

  const job = queue[targetIdx];
  const issuePath = `state/issues/${job.konuId}.json`;
  const issue = await readJsonFromBucket(issuePath);
  if (!issue) {
    throw new Error(
      `${issuePath} bulunamadı. Lütfen önce /admin/studyo üzerinden senaryoyu kaydedin.`
    );
  }

  // Durumu processing olarak işaretle
  queue[targetIdx] = {
    ...job,
    status: "processing",
    workerTarget: "github_actions",
    statusMessage: "Bulut 60 fps FFmpeg motoru derliyor...",
    updatedAt: istanbulIsoNow(),
  };
  await writeJsonToBucket(QUEUE_PATH, queue);

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ekmeklab-studyo-"));
  try {
    const result = await renderJob(job, issue, workDir);
    const nowIso = istanbulIsoNow();

    const formatLabels = {
      kisa_01: "Reels #01 (60 fps Master)",
      kisa_02: "Reels #02 (60 fps Master)",
      seri_b: "Taş Fırın Günlüğü (60 fps Master)",
      uzun: "Uzun Belgesel (60 fps Master)",
    };

    const readyAsset = {
      id: `cloud-${job.id}`,
      label: `${job.konuId} · ${formatLabels[job.format] || job.format}`,
      kind: "video_9x16",
      format: job.format,
      storagePath: result.outputStoragePath,
      mimeType: "video/mp4",
      sizeBytes: result.sizeBytes,
      durationSec: result.durationSec,
      lufs: -14,
      fps: 60,
      createdAt: nowIso,
    };

    const refreshedIssue = (await readJsonFromBucket(issuePath)) || issue;
    refreshedIssue.readyAssets = [
      readyAsset,
      ...(Array.isArray(refreshedIssue.readyAssets)
        ? refreshedIssue.readyAssets
        : []),
    ];
    refreshedIssue.status = "ready";
    refreshedIssue.updatedAt = nowIso;
    await writeJsonToBucket(issuePath, refreshedIssue);

    const refreshedQueue = (await readJsonFromBucket(QUEUE_PATH)) || queue;
    const updatedQueue = refreshedQueue.map((item) =>
      item.id === job.id
        ? {
            ...item,
            status: "ready",
            workerTarget: "github_actions",
            outputPath: result.outputStoragePath,
            statusMessage: `Hazır (${result.durationSec} sn · 60 fps · -14 LUFS) — İndir & Paylaş sekmesine düştü.`,
            updatedAt: nowIso,
          }
        : item
    );
    await writeJsonToBucket(QUEUE_PATH, updatedQueue);
    console.log(
      `[studyo-cloud-render] Tamamlandı: ${result.outputStoragePath} (${result.sizeBytes} bayt)`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const refreshedQueue = (await readJsonFromBucket(QUEUE_PATH)) || queue;
    const failedQueue = refreshedQueue.map((item) =>
      item.id === job.id
        ? {
            ...item,
            status: "failed",
            statusMessage: `Bulut derleme hatası: ${message}`,
            updatedAt: istanbulIsoNow(),
          }
        : item
    );
    await writeJsonToBucket(QUEUE_PATH, failedQueue);
    console.error("[studyo-cloud-render] HATA:", message);
    process.exit(1);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main();
