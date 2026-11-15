"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlipHorizontal2,
  Loader2,
  Mic,
  Pause,
  Play,
  Square,
  X,
} from "lucide-react";
import { extractPhoneticGuides } from "@/lib/studyo/phonetics";
import {
  encodeMonoWav16,
  measureMonoSamples,
  normalizeToBroadcastTarget,
  resampleLinear,
  STUDYO_SAMPLE_RATE,
} from "@/lib/studyo/wav";
import { getErrorMessage } from "@/lib/utils/error";
import type {
  StudyoFormatKey,
  StudyoIssue,
  StudyoScene,
  StudyoVoiceTake,
} from "@/types/studyo";
import {
  registerVoiceTakeInCloud,
  uploadBlobDirectToStudyo,
} from "./directUpload";

interface PrompterDialogProps {
  open: boolean;
  onClose: () => void;
  issue: StudyoIssue;
  format: StudyoFormatKey;
  initialSceneIndex?: number;
  cloudConfigured: boolean;
  onIssueUpdated: (next: StudyoIssue) => void;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

export function PrompterDialog({
  open,
  onClose,
  issue,
  format,
  initialSceneIndex = 0,
  cloudConfigured,
  onIssueUpdated,
}: PrompterDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const scenes: StudyoScene[] = issue.scenes[format] ?? [];
  const [sceneIndex, setSceneIndex] = useState(initialSceneIndex);
  const [fontSizePx, setFontSizePx] = useState(28);
  const [scrollSpeed, setScrollSpeed] = useState(0); // 0 = manuel, 1..5 = otomatik kayma
  const [mirrored, setMirrored] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(STUDYO_SAMPLE_RATE);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setSceneIndex(Math.min(initialSceneIndex, Math.max(0, scenes.length - 1)));
  }, [initialSceneIndex, scenes.length, open]);

  // Native <dialog> aç/kapat (modern-web-guidance `dialog` Rule 1)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Ekran kapanmasını önle (Samsung S24 WakeLock API — HTTPS üzerinde çalışır)
  useEffect(() => {
    if (!open || typeof navigator === "undefined") return;
    let sentinel: WakeLockSentinelLike | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    nav.wakeLock
      ?.request("screen")
      .then((s) => {
        sentinel = s;
      })
      .catch(() => {
        // Pil tasarrufunda sessizce geç
      });
    return () => {
      void sentinel?.release().catch(() => undefined);
    };
  }, [open]);

  // Otomatik prompter kaydırma
  useEffect(() => {
    if (!open || scrollSpeed <= 0) return;
    let rafId = 0;
    let lastTs = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      if (scrollBoxRef.current) {
        scrollBoxRef.current.scrollTop += scrollSpeed * 18 * dt;
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [open, scrollSpeed]);

  const cleanupAudioGraph = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    setIsRecording(false);
    setVuLevel(0);
  }, []);

  useEffect(() => {
    if (!open) {
      cleanupAudioGraph();
    }
    return () => cleanupAudioGraph();
  }, [open, cleanupAudioGraph]);

  const activeScene = scenes[sceneIndex] ?? scenes[0];
  const formatTakes: Record<number, StudyoVoiceTake> =
    issue.voiceTakes[format] ?? {};
  const activeTake = activeScene ? formatTakes[activeScene.sceneNo] : undefined;
  const phoneticItems = activeScene
    ? extractPhoneticGuides(`${activeScene.caption} ${activeScene.voiceText}`)
    : [];

  const startSceneRecording = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setErrorMsg(
        "Tarayıcı mikrofon erişimini desteklemiyor. Lütfen HTTPS bağlantısından (ekmeklab.tr) açın."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: STUDYO_SAMPLE_RATE,
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioContextCtor({ sampleRate: STUDYO_SAMPLE_RATE });
      await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      chunksRef.current = [];
      sampleRateRef.current = ctx.sampleRate;

      processor.onaudioprocess = (ev: AudioProcessingEvent) => {
        const input = ev.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        chunksRef.current.push(copy);

        let peak = 0;
        for (let i = 0; i < input.length; i += 8) {
          const a = Math.abs(input[i] ?? 0);
          if (a > peak) peak = a;
        }
        setVuLevel(Math.min(100, Math.round(peak * 140)));
      };

      // Geri besleme (uğultu) olmaması için sıfır kazançlı düğüme bağla
      const muteGain = ctx.createGain();
      muteGain.gain.value = 0;
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(ctx.destination);

      mediaStreamRef.current = stream;
      audioCtxRef.current = ctx;
      processorRef.current = processor;
      setElapsedSec(0);
      setIsRecording(true);

      const started = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedSec(Math.round(((Date.now() - started) / 1000) * 10) / 10);
      }, 200);
    } catch (err: unknown) {
      cleanupAudioGraph();
      setErrorMsg(
        `Mikrofon açılamadı: ${getErrorMessage(err)}. Tarayıcı adres çubuğundan mikrofon izni verin.`
      );
    }
  };

  const stopAndSaveSceneRecording = async () => {
    if (!activeScene) return;
    const recordedChunks = [...chunksRef.current];
    const sourceRate = sampleRateRef.current;
    cleanupAudioGraph();

    const totalLen = recordedChunks.reduce((acc, c) => acc + c.length, 0);
    if (totalLen < sourceRate * 0.4) {
      setErrorMsg("Kayıt çok kısa (<0.4 sn); sahneyi tekrar okuyun.");
      return;
    }

    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of recordedChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const resampled = resampleLinear(merged, sourceRate, STUDYO_SAMPLE_RATE);
    const normalized = normalizeToBroadcastTarget(resampled, STUDYO_SAMPLE_RATE);
    const stats = measureMonoSamples(normalized, STUDYO_SAMPLE_RATE);
    const wavBuffer = encodeMonoWav16(normalized, STUDYO_SAMPLE_RATE);
    const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

    if (!cloudConfigured) {
      const localUrl = URL.createObjectURL(wavBlob);
      const localTake: StudyoVoiceTake = {
        sceneNo: activeScene.sceneNo,
        format,
        storagePath: `voice/${issue.konuId}/${format}/yerel_sahne_${activeScene.sceneNo}.wav`,
        mimeType: "audio/wav",
        sizeBytes: wavBlob.size,
        durationSec: stats.durationSec,
        peakDbfs: stats.peakDbfs,
        approxLufs: stats.approxLufs,
        recordedAt: new Date().toISOString(),
        signedUrl: localUrl,
      };
      onIssueUpdated({
        ...issue,
        voiceTakes: {
          ...issue.voiceTakes,
          [format]: {
            ...(issue.voiceTakes[format] ?? {}),
            [activeScene.sceneNo]: localTake,
          },
        },
      });
      setStatusNotice(
        `Sahne ${activeScene.sceneNo} tarayıcı belleğine alındı (${stats.durationSec} sn · ${stats.approxLufs} LUFS).`
      );
      return;
    }

    setIsUploading(true);
    try {
      const { storagePath } = await uploadBlobDirectToStudyo({
        category: "voice_take",
        konuId: issue.konuId,
        format,
        sceneNo: activeScene.sceneNo,
        blob: wavBlob,
        mimeType: "audio/wav",
      });

      const updatedIssue = await registerVoiceTakeInCloud({
        konuId: issue.konuId,
        format,
        sceneNo: activeScene.sceneNo,
        storagePath,
        mimeType: "audio/wav",
        sizeBytes: wavBlob.size,
        durationSec: stats.durationSec,
        peakDbfs: stats.peakDbfs,
        approxLufs: stats.approxLufs,
      });

      onIssueUpdated(updatedIssue);
      setStatusNotice(
        `Sahne ${activeScene.sceneNo} buluta kaydedildi (${stats.durationSec} sn · ${stats.approxLufs} LUFS).`
      );

      if (sceneIndex < scenes.length - 1) {
        setSceneIndex((prev) => prev + 1);
        if (scrollBoxRef.current) scrollBoxRef.current.scrollTop = 0;
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      closedby="closerequest"
      onClose={() => {
        cleanupAudioGraph();
        onClose();
      }}
      className="studyo-modal-dialog m-0 p-0 w-screen max-w-none h-dvh max-h-none bg-[#17110F] text-[#FBF6EC] border-0 open:flex open:flex-col"
    >
      {/* Üst S24 Güvenli Bar */}
      <header
        className="flex items-center justify-between gap-2 px-4 py-3 bg-[#211815] border-b border-[#3A2A25]"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#D9A27E]">
            {issue.konuId} · Prompter &amp; 48 kHz Punch-In
          </p>
          <h2 id={titleId} className="font-serif text-base sm:text-lg font-bold truncate">
            Sahne {activeScene?.sceneNo ?? 1} / {scenes.length} — {activeScene?.title}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFontSizePx((v) => Math.max(20, v - 4))}
            aria-label="Yazıyı küçült"
            className="min-w-11 min-h-11 px-2.5 rounded-xl bg-[#2C201C] text-sm font-mono font-bold hover:bg-[#3A2A25]"
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => setFontSizePx((v) => Math.min(46, v + 4))}
            aria-label="Yazıyı büyüt"
            className="min-w-11 min-h-11 px-2.5 rounded-xl bg-[#2C201C] text-sm font-mono font-bold hover:bg-[#3A2A25]"
          >
            A+
          </button>
          <button
            type="button"
            onClick={() => setMirrored((m) => !m)}
            aria-label="Ayna görünümü"
            aria-pressed={mirrored}
            className={`min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl ${
              mirrored ? "bg-[#B4532A] text-white" : "bg-[#2C201C] text-[#FBF6EC]"
            }`}
          >
            <FlipHorizontal2 className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Prompter ekranını kapat"
            className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl bg-[#2C201C] text-[#FBF6EC] hover:bg-[#3A2A25]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Sahne Seçici Şerit */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 bg-[#1D1512] border-b border-[#3A2A25]">
        {scenes.map((sc, idx) => {
          const hasTake = Boolean(formatTakes[sc.sceneNo]);
          const selected = idx === sceneIndex;
          return (
            <button
              key={sc.sceneNo}
              type="button"
              onClick={() => {
                setSceneIndex(idx);
                if (scrollBoxRef.current) scrollBoxRef.current.scrollTop = 0;
              }}
              className={`min-h-11 px-3.5 rounded-xl font-mono text-xs flex items-center gap-1.5 shrink-0 border transition-colors ${
                selected
                  ? "bg-[#B4532A] border-[#D97748] text-white font-bold"
                  : hasTake
                  ? "bg-[#1F3325] border-[#356343] text-[#B7E4C4]"
                  : "bg-[#271D19] border-[#3A2A25] text-[#D8C7B6]"
              }`}
            >
              {hasTake && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
              <span>Sahne {sc.sceneNo}</span>
              <span className="opacity-75">({sc.estimatedSec}s)</span>
            </button>
          );
        })}
      </div>

      {/* Okuma Göz Hizası Metin Alanı */}
      <div
        ref={scrollBoxRef}
        className="flex-1 overflow-y-auto px-5 sm:px-10 py-8 max-w-3xl w-full mx-auto space-y-6"
        style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
      >
        {phoneticItems.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[#271D19] border border-[#49352E]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#D9A27E] self-center">
              Okunuş:
            </span>
            {phoneticItems.map((p) => (
              <span
                key={p.term}
                className="px-2.5 py-1 rounded-lg bg-[#17110F] text-xs font-mono text-[#F6EEDF] border border-[#3A2A25]"
              >
                <strong>{p.term}</strong> → [{p.pronunciation}]
              </span>
            ))}
          </div>
        )}

        <div className="relative pl-4 border-l-4 border-[#B4532A]">
          <p
            className="font-serif leading-relaxed text-[#FBF6EC] tracking-wide"
            style={{ fontSize: `${fontSizePx}px`, textWrap: "pretty" }}
          >
            {activeScene?.voiceText}
          </p>
        </div>

        {sceneIndex < scenes.length - 1 && scenes[sceneIndex + 1] ? (
          <div className="pt-4 border-t border-[#2E221E] opacity-55">
            <p className="text-xs font-mono uppercase text-[#D9A27E] mb-1">
              Sıradaki Sahne ({scenes[sceneIndex + 1]!.sceneNo}):
            </p>
            <p className="text-base leading-relaxed text-[#D8C7B6]">
              {scenes[sceneIndex + 1]!.voiceText}
            </p>
          </div>
        ) : null}

        {activeTake?.signedUrl ? (
          <div className="p-3.5 rounded-2xl bg-[#1E2E23] border border-[#355A40] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#B7E4C4]">
              <span>
                Kayıtlı Take: {activeTake.durationSec} sn · {activeTake.approxLufs} LUFS · Tepe{" "}
                {activeTake.peakDbfs} dBFS
              </span>
            </div>
            <audio
              controls
              preload="metadata"
              src={activeTake.signedUrl}
              className="w-full h-10"
            />
          </div>
        ) : null}

        {statusNotice ? (
          <p className="text-sm font-medium text-[#B7E4C4] bg-[#1E2E23] px-4 py-2.5 rounded-xl border border-[#355A40]">
            {statusNotice}
          </p>
        ) : null}

        {errorMsg ? (
          <p className="text-sm font-medium text-[#FCD6CE] bg-[#491E18] px-4 py-2.5 rounded-xl border border-[#7D342A]">
            {errorMsg}
          </p>
        ) : null}
      </div>

      {/* Alt Başparmak Kayıt & Hız Kontrol Barı */}
      <footer
        className="px-4 py-3 bg-[#211815] border-t border-[#3A2A25] space-y-2.5"
        style={{ paddingBottom: "max(0.85rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Canlı VU Metre */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#D8C7B6] w-16 shrink-0">
            {isRecording ? `${elapsedSec.toFixed(1)} sn` : "Seviye"}
          </span>
          <div className="flex-1 h-2.5 rounded-full bg-[#120D0B] overflow-hidden border border-[#3A2A25]">
            <div
              className={`h-full transition-all duration-75 ${
                vuLevel > 88
                  ? "bg-[#E05A47]"
                  : vuLevel > 35
                  ? "bg-[#4CAF73]"
                  : "bg-[#D9A27E]"
              }`}
              style={{ width: `${vuLevel}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setScrollSpeed((s) => (s === 0 ? 2 : 0))}
            className="min-h-11 px-3 rounded-xl bg-[#2C201C] text-xs font-mono text-[#FBF6EC] inline-flex items-center gap-1.5"
          >
            {scrollSpeed > 0 ? (
              <>
                <Pause className="w-3.5 h-3.5" aria-hidden="true" /> Kaymayı Durdur
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" aria-hidden="true" /> Oto Kaydır
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={sceneIndex <= 0 || isRecording}
            onClick={() => setSceneIndex((i) => Math.max(0, i - 1))}
            aria-label="Önceki sahne"
            className="min-w-12 min-h-12 px-3 rounded-2xl bg-[#2C201C] disabled:opacity-40 inline-flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>

          {isUploading ? (
            <button
              type="button"
              disabled
              className="flex-1 min-h-12 px-5 rounded-2xl bg-[#5C3A2B] text-white font-bold inline-flex items-center justify-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Buluta Kaydediliyor…</span>
            </button>
          ) : isRecording ? (
            <button
              type="button"
              onClick={() => void stopAndSaveSceneRecording()}
              className="flex-1 min-h-12 px-5 rounded-2xl bg-[#C93B2B] hover:bg-[#B13224] text-white font-bold inline-flex items-center justify-center gap-2 shadow-lg"
            >
              <Square className="w-5 h-5 fill-current" aria-hidden="true" />
              <span>Kaydı Bitir &amp; Sahne {activeScene?.sceneNo} Kaydet</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startSceneRecording()}
              className="flex-1 min-h-12 px-5 rounded-2xl bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold inline-flex items-center justify-center gap-2 shadow-lg"
            >
              <Mic className="w-5 h-5" aria-hidden="true" />
              <span>
                {activeTake
                  ? `Sahne ${activeScene?.sceneNo} Yeniden Oku (Punch-In)`
                  : `Sahne ${activeScene?.sceneNo} Kaydet (48 kHz WAV)`}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={sceneIndex >= scenes.length - 1 || isRecording}
            onClick={() => setSceneIndex((i) => Math.min(scenes.length - 1, i + 1))}
            aria-label="Sonraki sahne"
            className="min-w-12 min-h-12 px-3 rounded-2xl bg-[#2C201C] disabled:opacity-40 inline-flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </dialog>
  );
}
