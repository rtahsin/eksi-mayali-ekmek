"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Film, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import {
  CANVAS_9X16_HEIGHT,
  CANVAS_9X16_WIDTH,
  DEFAULT_SAFE_ZONE_BOTTOM_PX,
  DEFAULT_SAFE_ZONE_RIGHT_PX,
  FORMAT_LABELS,
} from "@/lib/studyo/constants";
import { getErrorMessage } from "@/lib/utils/error";
import type { StudyoFormatKey, StudyoIssue } from "@/types/studyo";
import {
  registerReadyOutputInCloud,
  uploadBlobDirectToStudyo,
} from "./directUpload";

interface CanvasReelPreviewProps {
  issue: StudyoIssue;
  format: StudyoFormatKey;
  cloudConfigured: boolean;
  onIssueUpdated: (next: StudyoIssue) => void;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function CanvasReelPreview({
  issue,
  format,
  cloudConfigured,
  onIssueUpdated,
}: CanvasReelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const scenes = issue.scenes[format] ?? [];
  const totalDurationSec = Math.max(
    4,
    scenes.reduce((acc, sc) => acc + Math.max(2.5, sc.estimatedSec), 0)
  );

  const drawFrameAt = useCallback(
    (timeSec: number, includeSafeZoneGuide: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = CANVAS_9X16_WIDTH;
      const H = CANVAS_9X16_HEIGHT;
      const safeRight = DEFAULT_SAFE_ZONE_RIGHT_PX;
      const safeBottom = DEFAULT_SAFE_ZONE_BOTTOM_PX;
      const contentWidth = W - 84 - safeRight;

      // Aktif sahneyi bul
      let acc = 0;
      let activeIdx = 0;
      let sceneProgress = 0;
      for (let i = 0; i < scenes.length; i += 1) {
        const dur = Math.max(2.5, scenes[i]!.estimatedSec);
        if (timeSec <= acc + dur || i === scenes.length - 1) {
          activeIdx = i;
          sceneProgress = Math.min(1, Math.max(0, (timeSec - acc) / dur));
          break;
        }
        acc += dur;
      }

      const scene = scenes[activeIdx];
      const isSeriB = format === "seri_b";

      // Arka plan: Atölye Kremi veya Sıcak Taş Fırın Gecesi
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      if (isSeriB) {
        grad.addColorStop(0, "#241612");
        grad.addColorStop(0.55, "#3B1E1A");
        grad.addColorStop(1, "#180F0C");
      } else {
        grad.addColorStop(0, "#FBF6EC");
        grad.addColorStop(0.6, "#F6EEDF");
        grad.addColorStop(1, "#EDE0CA");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Üst Marka ve Sayı Rozeti
      ctx.fillStyle = isSeriB ? "rgba(251,246,236,0.12)" : "#FFFFFF";
      ctx.strokeStyle = isSeriB ? "rgba(226,211,189,0.28)" : "#E2D3BD";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(64, 96, contentWidth, 96, 28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#B4532A";
      ctx.font = "700 28px monospace";
      ctx.fillText(
        `EKMEKLAB · SAYI #${String(issue.issueNumber).padStart(2, "0")} · ${FORMAT_LABELS[format].badge.toUpperCase()}`,
        96,
        154
      );

      // Başlık
      ctx.fillStyle = isSeriB ? "#FBF6EC" : "#3B1E1A";
      ctx.font = "700 50px Georgia, serif";
      const titleLines = wrapCanvasText(ctx, issue.title, contentWidth).slice(0, 2);
      titleLines.forEach((line, i) => {
        ctx.fillText(line, 64, 270 + i * 62);
      });

      // Orta Görsel Kutu: Seri A -> Canlı Bilim Grafiği | Seri B -> Taş Fırın Hikâye Kartı
      const cardTop = 415;
      const cardHeight = 520;
      ctx.fillStyle = isSeriB ? "rgba(24,15,12,0.72)" : "#FFFFFF";
      ctx.strokeStyle = isSeriB ? "rgba(217,162,126,0.35)" : "#E2D3BD";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(64, cardTop, contentWidth, cardHeight, 36);
      ctx.fill();
      ctx.stroke();

      if (!isSeriB) {
        // Canlı Bilim Grafiği (60 fps ilerlemeli çizim)
        ctx.fillStyle = "#6E5148";
        ctx.font = "600 28px sans-serif";
        ctx.fillText(issue.chart.title, 100, cardTop + 62);

        const pts = issue.chart.points;
        if (pts.length >= 2) {
          const vals = pts.map((p) => p.value);
          const minV = Math.min(...vals) * 0.85;
          const maxV = Math.max(...vals) * 1.1 || 1;
          const gx = 110;
          const gy = cardTop + 120;
          const gw = contentWidth - 96;
          const gh = 300;

          // Izgara çizgileri
          ctx.strokeStyle = "#EFE5D4";
          ctx.lineWidth = 2;
          for (let r = 0; r <= 3; r += 1) {
            const y = gy + (gh * r) / 3;
            ctx.beginPath();
            ctx.moveTo(gx, y);
            ctx.lineTo(gx + gw, y);
            ctx.stroke();
          }

          // Eşik çizgisi
          if (typeof issue.chart.thresholdValue === "number") {
            const ty =
              gy +
              gh -
              ((issue.chart.thresholdValue - minV) / (maxV - minV)) * gh;
            ctx.save();
            ctx.setLineDash([12, 10]);
            ctx.strokeStyle = "#B4532A";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(gx, ty);
            ctx.lineTo(gx + gw, ty);
            ctx.stroke();
            ctx.restore();
          }

          // Eğri
          const globalProg = Math.min(1, (timeSec + 0.8) / totalDurationSec);
          const visibleFloat = 1 + (pts.length - 1) * Math.min(1, globalProg * 1.35);

          ctx.strokeStyle = "#B4532A";
          ctx.lineWidth = 8;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          pts.forEach((pt, idx) => {
            if (idx > Math.ceil(visibleFloat)) return;
            const px = gx + (gw * idx) / (pts.length - 1);
            const py = gy + gh - ((pt.value - minV) / (maxV - minV)) * gh;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();

          pts.forEach((pt, idx) => {
            const px = gx + (gw * idx) / (pts.length - 1);
            const py = gy + gh - ((pt.value - minV) / (maxV - minV)) * gh;
            ctx.fillStyle = "#3B1E1A";
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#3B1E1A";
            ctx.font = "700 26px monospace";
            ctx.fillText(`${pt.value}`, px - 22, py - 18);

            ctx.fillStyle = "#6E5148";
            ctx.font = "500 23px sans-serif";
            ctx.fillText(pt.xLabel, px - 36, gy + gh + 44);
          });
        }
      } else {
        // Seri B Taş Fırın Modu Bilgi Kartı
        ctx.fillStyle = "#D9A27E";
        ctx.font = "700 28px monospace";
        ctx.fillText(
          issue.audioMode === "pure_asmr"
            ? "🔥 SAF TAŞ FIRIN ÇITIRTISI (ASMR + HİKÂYE KARTI)"
            : "🎙️ SESLİ ANLATIM (TAŞ FIRIN SESİ -22 dB DUCKING)",
          100,
          cardTop + 74
        );

        ctx.fillStyle = "#FBF6EC";
        ctx.font = "600 36px Georgia, serif";
        const cueLines = wrapCanvasText(
          ctx,
          `Ürün: ${issue.productName} · Yüklü Gerçek S24 Klip: ${issue.ovenClips.length} adet`,
          contentWidth - 72
        );
        cueLines.forEach((line, i) => {
          ctx.fillText(line, 100, cardTop + 155 + i * 50);
        });

        ctx.fillStyle = "#E2D3BD";
        ctx.font = "400 30px sans-serif";
        const ruleLines = wrapCanvasText(
          ctx,
          `Sofra Eşleşmesi: ${issue.newspaper.pairingNote}`,
          contentWidth - 72
        );
        ruleLines.forEach((line, i) => {
          ctx.fillText(line, 100, cardTop + 290 + i * 44);
        });
      }

      // Kinetik Kelime Vurgulu Altyazı (Safe-Zone üstünde: Y <= H - safeBottom)
      if (scene) {
        const captionBoxBottom = H - safeBottom - 24;
        const captionBoxHeight = 470;
        const captionBoxTop = captionBoxBottom - captionBoxHeight;

        ctx.fillStyle = isSeriB ? "rgba(251,246,236,0.95)" : "#3B1E1A";
        ctx.beginPath();
        ctx.roundRect(64, captionBoxTop, contentWidth, captionBoxHeight, 36);
        ctx.fill();

        ctx.fillStyle = "#B4532A";
        ctx.font = "700 26px monospace";
        ctx.fillText(
          `SAHNE ${scene.sceneNo}/${scenes.length} · ${scene.title.toUpperCase()}`,
          100,
          captionBoxTop + 56
        );

        const words = scene.caption.trim().split(/\s+/);
        const activeWordIdx = Math.min(
          words.length - 1,
          Math.floor(sceneProgress * words.length)
        );

        ctx.font = "700 40px sans-serif";
        const lines = wrapCanvasText(ctx, scene.caption, contentWidth - 72).slice(0, 6);
        let wordCursor = 0;
        lines.forEach((line, lineIdx) => {
          const lineWords = line.split(/\s+/);
          let x = 100;
          const y = captionBoxTop + 126 + lineIdx * 56;
          for (const lw of lineWords) {
            const isHighlighted = wordCursor === activeWordIdx;
            const wWidth = ctx.measureText(`${lw} `).width;
            if (isHighlighted) {
              ctx.fillStyle = "#B4532A";
              ctx.beginPath();
              ctx.roundRect(x - 6, y - 38, wWidth, 48, 10);
              ctx.fill();
              ctx.fillStyle = "#FFFFFF";
            } else {
              ctx.fillStyle = isSeriB ? "#3B1E1A" : "#FBF6EC";
            }
            ctx.fillText(lw, x, y);
            x += wWidth;
            wordCursor += 1;
          }
        });
      }

      // Safe-Zone Görsel Kılavuzu (yalnız önizlemede açıkken çizilir, video dışa aktarımında kapatılır)
      if (includeSafeZoneGuide) {
        ctx.save();
        ctx.fillStyle = "rgba(180, 83, 42, 0.16)";
        ctx.fillRect(0, H - safeBottom, W, safeBottom);
        ctx.fillRect(W - safeRight, 0, safeRight, H - safeBottom);

        ctx.strokeStyle = "#B4532A";
        ctx.setLineDash([14, 10]);
        ctx.lineWidth = 4;
        ctx.strokeRect(16, 16, W - safeRight - 16, H - safeBottom - 16);

        ctx.fillStyle = "#3B1E1A";
        ctx.font = "700 26px monospace";
        ctx.fillText(
          `REELS/TIKTOK SAFE-ZONE KORUMASI (ALT ${safeBottom}px · SAĞ ${safeRight}px BOŞ)`,
          52,
          H - safeBottom + 56
        );
        ctx.restore();
      }
    },
    [format, issue, scenes, totalDurationSec]
  );

  useEffect(() => {
    drawFrameAt(currentTimeSec, showSafeZone);
  }, [currentTimeSec, showSafeZone, drawFrameAt]);

  useEffect(() => {
    if (!playing) return;
    let rafId = 0;
    let prev = performance.now();
    const step = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      setCurrentTimeSec((t) => {
        const next = t + dt;
        if (next >= totalDurationSec) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [playing, totalDurationSec]);

  const exportQuickCloudVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === "undefined") {
      setExportError("Tarayıcınız doğrudan video kaydını (MediaRecorder) desteklemiyor.");
      return;
    }

    setExporting(true);
    setExportError(null);
    setExportNote("9:16 dikey video kareleri gerçek zamanlı işleniyor…");
    setPlaying(false);

    try {
      const candidates = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm",
      ];
      const supportedMime =
        candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
      const baseMime = supportedMime.startsWith("video/mp4")
        ? "video/mp4"
        : "video/webm";

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 4_500_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const donePromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: baseMime }));
        recorder.onerror = () => reject(new Error("Video kodlayıcı hatası."));
      });

      // Hızlı önizleme videosu (Safe-Zone çizgisi kapalı, temiz çıktı)
      const exportDuration = Math.min(totalDurationSec, 18);
      recorder.start(250);

      const started = performance.now();
      await new Promise<void>((resolve) => {
        const renderLoop = (now: number) => {
          const elapsed = (now - started) / 1000;
          const mappedTime = (elapsed / exportDuration) * totalDurationSec;
          drawFrameAt(mappedTime, false);
          if (elapsed >= exportDuration) {
            resolve();
            return;
          }
          window.requestAnimationFrame(renderLoop);
        };
        window.requestAnimationFrame(renderLoop);
      });

      recorder.stop();
      const videoBlob = await donePromise;
      drawFrameAt(0, showSafeZone);

      if (!cloudConfigured) {
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${issue.konuId}_${format}_9x16.${baseMime === "video/mp4" ? "mp4" : "webm"}`;
        a.click();
        setExportNote("9:16 video cihazınıza indirildi.");
        return;
      }

      setExportNote("9:16 video özel bulut kasasına yükleniyor…");
      const { storagePath } = await uploadBlobDirectToStudyo({
        category: "ready_output",
        konuId: issue.konuId,
        format,
        blob: videoBlob,
        mimeType: baseMime,
      });

      const updated = await registerReadyOutputInCloud({
        konuId: issue.konuId,
        kind: "video_9x16",
        format,
        label: `${FORMAT_LABELS[format].short} · Hızlı Bulut Çıktısı (9:16)`,
        storagePath,
        mimeType: baseMime,
        sizeBytes: videoBlob.size,
        durationSec: Math.round(exportDuration * 10) / 10,
        fps: 30,
      });

      onIssueUpdated(updated);
      setExportNote(
        "9:16 video bulut kasasına eklendi! 'Yayın Kasası' sekmesinden telefonunuza indirebilir veya paylaşabilirsiniz."
      );
    } catch (err: unknown) {
      setExportError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-serif text-base font-bold text-[#3B1E1A]">
            Canlı 9:16 Kinetik Önizleme (1080×1920)
          </h3>
          <p className="text-xs text-[#6E5148]">
            Toplam ~{totalDurationSec.toFixed(1)} sn · Reels / TikTok güvenli alan korumalı
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSafeZone((v) => !v)}
          aria-pressed={showSafeZone}
          className={`min-h-11 px-3 rounded-xl text-xs font-mono font-semibold inline-flex items-center gap-1.5 border ${
            showSafeZone
              ? "bg-[#F3E2D4] border-[#B4532A] text-[#8E3D1B]"
              : "bg-white border-[#E2D3BD] text-[#6E5148]"
          }`}
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
          <span>Safe-Zone</span>
        </button>
      </div>

      <div className="mx-auto w-full max-w-[290px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-[#3B1E1A]/20 shadow-md bg-[#17110F]">
        <canvas
          ref={canvasRef}
          width={CANVAS_9X16_WIDTH}
          height={CANVAS_9X16_HEIGHT}
          className="w-full h-full block"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="flex-1 min-h-11 px-4 rounded-xl bg-[#3B1E1A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          {playing ? (
            <>
              <Pause className="w-4 h-4" aria-hidden="true" /> Duraklat
            </>
          ) : (
            <>
              <Play className="w-4 h-4" aria-hidden="true" /> Önizle ({currentTimeSec.toFixed(1)}s)
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setCurrentTimeSec(0);
          }}
          aria-label="Başa sar"
          className="min-w-11 min-h-11 rounded-xl bg-white border border-[#E2D3BD] text-[#3B1E1A] inline-flex items-center justify-center"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        disabled={exporting}
        onClick={() => void exportQuickCloudVideo()}
        className="w-full min-h-11 px-4 py-2.5 rounded-xl bg-[#F3E2D4] hover:bg-[#EAD3BF] text-[#3B1E1A] border border-[#D4B499] text-xs font-semibold inline-flex items-center justify-center gap-2"
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Hızlı 9:16 Video İşleniyor…</span>
          </>
        ) : (
          <>
            <Film className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
            <span>Ev PC Kapalıyken Anında 9:16 Önizleme Videosu Üret</span>
          </>
        )}
      </button>

      {exportNote ? (
        <p className="text-xs text-[#1D5130] bg-[#E5EFE7] border border-[#B4D3BC] rounded-xl px-3 py-2">
          {exportNote}
        </p>
      ) : null}
      {exportError ? (
        <p className="text-xs text-[#8E2A1B] bg-[#FDECE8] border border-[#E8B4A9] rounded-xl px-3 py-2">
          {exportError}
        </p>
      ) : null}
    </div>
  );
}
