"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  FileText,
  Flame,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Rocket,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  Wand2,
} from "lucide-react";
import { evaluateDirectorCoach } from "@/lib/studyo/coach";
import {
  DEFAULT_SAFE_ZONE_BOTTOM_PX,
  DEFAULT_SAFE_ZONE_RIGHT_PX,
  FORMAT_LABELS,
  PUBLISH_CHANNEL_META,
} from "@/lib/studyo/constants";
import { checkK006Compliance, sanitizeK006Text } from "@/lib/studyo/k006";
import { estimateSpeechSeconds, extractPhoneticGuides } from "@/lib/studyo/phonetics";
import {
  decodeWavToMonoFloat32,
  measureMonoSamples,
  stitchSceneTakesToMasterWav,
  STUDYO_SAMPLE_RATE,
} from "@/lib/studyo/wav";
import { getErrorMessage } from "@/lib/utils/error";
import type {
  StudyoFormatKey,
  StudyoIssue,
  StudyoPublishChannel,
  StudyoRenderJob,
  StudyoScene,
  StudyoWorkspacePayload,
} from "@/types/studyo";
import { CanvasReelPreview } from "./CanvasReelPreview";
import {
  registerOvenClipInCloud,
  registerReadyOutputInCloud,
  registerVoiceTakeInCloud,
  uploadBlobDirectToStudyo,
} from "./directUpload";
import { GazeteSheetModal } from "./GazeteSheetModal";
import { PrompterDialog } from "./PrompterDialog";

type MainStepTab = "senaryo" | "ses" | "kurgu" | "yayin";

interface StudyoClientProps {
  initialWorkspace: StudyoWorkspacePayload;
}

export function StudyoClient({ initialWorkspace }: StudyoClientProps) {
  const baseId = useId();
  const [issues, setIssues] = useState<StudyoIssue[]>(initialWorkspace.issues);
  const [renderQueue, setRenderQueue] = useState<StudyoRenderJob[]>(
    initialWorkspace.renderQueue
  );
  const [cloudConfigured, setCloudConfigured] = useState(
    initialWorkspace.cloudConfigured
  );
  const [githubDispatchConfigured, setGithubDispatchConfigured] = useState(
    initialWorkspace.githubDispatchConfigured
  );

  const [selectedKonuId, setSelectedKonuId] = useState<string>(
    initialWorkspace.issues[0]?.konuId ?? "KONU-01"
  );
  const [activeFormat, setActiveFormat] = useState<StudyoFormatKey>("kisa_01");
  const [showLongMode, setShowLongMode] = useState(false);
  const [activeTab, setActiveTab] = useState<MainStepTab>("senaryo");
  const [searchQuery, setSearchQuery] = useState("");

  // Düzenlenebilir sahne tamponu
  const activeIssue = useMemo(
    () =>
      issues.find((i) => i.konuId === selectedKonuId) ??
      issues[0]!,
    [issues, selectedKonuId]
  );

  const [draftScenes, setDraftScenes] = useState<StudyoScene[]>(
    activeIssue?.scenes[activeFormat] ?? []
  );
  const [dirty, setDirty] = useState(false);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [prompterOpen, setPrompterOpen] = useState(false);
  const [prompterSceneIdx, setPrompterSceneIdx] = useState(0);
  const [gazeteOpen, setGazeteOpen] = useState(false);

  useEffect(() => {
    if (!activeIssue) return;
    setDraftScenes(activeIssue.scenes[activeFormat] ?? []);
    setDirty(false);
  }, [activeIssue?.konuId, activeIssue?.updatedAt, activeFormat, activeIssue]);

  const replaceIssueInState = useCallback((updated: StudyoIssue) => {
    setIssues((prev) =>
      prev.map((item) => (item.konuId === updated.konuId ? updated : item))
    );
  }, []);

  const refreshWorkspace = useCallback(async () => {
    setErrorMessage(null);
    setBusyMessage("Bulut durumu yenileniyor…");
    try {
      const res = await fetch("/api/admin/studyo", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as
        | (StudyoWorkspacePayload & { error?: string })
        | null;
      if (!res.ok || !data?.issues) {
        throw new Error(data?.error || "Bulut stüdyosu yüklenemedi.");
      }
      setIssues(data.issues);
      setRenderQueue(data.renderQueue);
      setCloudConfigured(data.cloudConfigured);
      setGithubDispatchConfigured(data.githubDispatchConfigured);
      setToastMessage("Bulut stüdyosu eşitlendi.");
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusyMessage(null);
    }
  }, []);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter(
      (i) =>
        i.konuId.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.subtitle.toLowerCase().includes(q) ||
        String(i.issueNumber) === q
    );
  }, [issues, searchQuery]);

  // Canlı K006, Fonetik ve Yönetmen Koçu hesaplamaları
  const combinedDraftText = useMemo(
    () => draftScenes.map((s) => `${s.caption}\n${s.voiceText}`).join("\n"),
    [draftScenes]
  );

  const k006Report = useMemo(
    () => checkK006Compliance(combinedDraftText),
    [combinedDraftText]
  );

  const phoneticGuides = useMemo(
    () => extractPhoneticGuides(combinedDraftText),
    [combinedDraftText]
  );

  const coachReport = useMemo(
    () =>
      evaluateDirectorCoach(
        draftScenes,
        activeFormat,
        DEFAULT_SAFE_ZONE_BOTTOM_PX,
        DEFAULT_SAFE_ZONE_RIGHT_PX
      ),
    [draftScenes, activeFormat]
  );

  const formatTakes = activeIssue?.voiceTakes[activeFormat] ?? {};
  const recordedSceneCount = draftScenes.filter((s) =>
    Boolean(formatTakes[s.sceneNo])
  ).length;
  const isApproved = Boolean(
    activeIssue?.approvedFormats.includes(activeFormat) && !dirty
  );

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setErrorMessage("Panoya kopyalanamadı.");
    }
  };

  const updateSceneText = (index: number, nextVoice: string) => {
    setDraftScenes((prev) =>
      prev.map((sc, idx) =>
        idx === index
          ? {
              ...sc,
              voiceText: nextVoice,
              caption: nextVoice,
              estimatedSec: estimateSpeechSeconds(nextVoice),
            }
          : sc
      )
    );
    setDirty(true);
    setToastMessage(null);
  };

  const addScene = () => {
    setDraftScenes((prev) => {
      const nextNo = prev.length + 1;
      const sample = "Yeni sahne metnini buraya yazın.";
      return [
        ...prev,
        {
          sceneNo: nextNo,
          title: `Sahne ${nextNo}`,
          caption: sample,
          voiceText: sample,
          estimatedSec: estimateSpeechSeconds(sample),
          visualCue: `${activeIssue.konuId} Görsel #${nextNo}`,
          flowPrompt: `9:16 vertical sourdough bakery visual for ${activeIssue.konuId} scene ${nextNo}.`,
          mechanismBeat: activeIssue.defaultBeat,
        },
      ];
    });
    setDirty(true);
  };

  const removeScene = (index: number) => {
    if (draftScenes.length <= 2) return;
    setDraftScenes((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((sc, idx) => ({ ...sc, sceneNo: idx + 1 }))
    );
    setDirty(true);
  };

  const handleSanitizeK006Local = () => {
    let totalReplaced = 0;
    setDraftScenes((prev) =>
      prev.map((sc) => {
        const v = sanitizeK006Text(sc.voiceText);
        const c = sanitizeK006Text(sc.caption);
        totalReplaced += v.replacedCount + c.replacedCount;
        return {
          ...sc,
          voiceText: v.cleaned,
          caption: c.cleaned,
          estimatedSec: estimateSpeechSeconds(v.cleaned),
        };
      })
    );
    setDirty(true);
    setToastMessage(
      totalReplaced > 0
        ? `${totalReplaced} sağlık ifadesi fizikokimyasal karşılığına dönüştürüldü.`
        : "Metin zaten %100 K006 uyumlu."
    );
  };

  const saveScriptToCloud = async (autoSanitize: boolean = false) => {
    setErrorMessage(null);
    setBusyMessage("Senaryo buluta kaydediliyor…");
    try {
      const res = await fetch("/api/admin/studyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_script",
          konuId: activeIssue.konuId,
          format: activeFormat,
          scenes: draftScenes,
          autoSanitizeK006: autoSanitize,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        issue?: StudyoIssue;
        error?: string;
      };
      if (!res.ok || !body.issue) {
        throw new Error(body.error || "Senaryo kaydedilemedi.");
      }
      replaceIssueInState(body.issue);
      setDirty(false);
      setToastMessage("Senaryo buluta kaydedildi.");
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusyMessage(null);
    }
  };

  const approveScriptInCloud = async () => {
    setErrorMessage(null);
    if (dirty) {
      await saveScriptToCloud(false);
    }
    setBusyMessage("K006 kalite kapısı doğrulanıyor…");
    try {
      const res = await fetch("/api/admin/studyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_script",
          konuId: activeIssue.konuId,
          format: activeFormat,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        issue?: StudyoIssue;
        error?: string;
      };
      if (!res.ok || !body.issue) {
        throw new Error(body.error || "Senaryo onaylanamadı.");
      }
      replaceIssueInState(body.issue);
      setToastMessage(
        `${FORMAT_LABELS[activeFormat].short} senaryosu onaylandı! Şimdi 'Prompter & Ses' sekmesinden okuyabilirsiniz.`
      );
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusyMessage(null);
    }
  };

  const regenerateDraftInCloud = async () => {
    setErrorMessage(null);
    setBusyMessage("Çoklu-Beyin K006 uyumlu taslak üretiyor…");
    try {
      const res = await fetch("/api/admin/studyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "synthesize_draft",
          konuId: activeIssue.konuId,
          format: activeFormat,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        issue?: StudyoIssue;
        usedAi?: boolean;
        error?: string;
      };
      if (!res.ok || !body.issue) {
        throw new Error(body.error || "Taslak üretilemedi.");
      }
      replaceIssueInState(body.issue);
      setToastMessage(
        body.usedAi
          ? "Gemini ile yeni 9:16 sahne planı üretildi."
          : "Kanıt çapasından yapılandırılmış sahne planı yenilendi."
      );
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusyMessage(null);
    }
  };

  // Harici ses dosyası (DJI Osmo Mic 2 WAV/M4A) yükleme
  const handleExternalVoiceFile = async (
    sceneNo: number,
    file: File | undefined
  ) => {
    if (!file) return;
    setErrorMessage(null);
    setBusyMessage(`Sahne ${sceneNo} ses dosyası buluta yükleniyor…`);
    try {
      const mimeType = file.type || "audio/wav";
      let durationSec = 6;
      let peakDbfs = -3.0;
      let approxLufs = -14.5;

      if (mimeType.includes("wav") || file.name.toLowerCase().endsWith(".wav")) {
        const ab = await file.arrayBuffer();
        const decoded = decodeWavToMonoFloat32(ab);
        const st = measureMonoSamples(decoded.samples, decoded.sampleRate);
        durationSec = st.durationSec;
        peakDbfs = st.peakDbfs;
        approxLufs = st.approxLufs;
      }

      const { storagePath } = await uploadBlobDirectToStudyo({
        category: "voice_take",
        konuId: activeIssue.konuId,
        format: activeFormat,
        sceneNo,
        blob: file,
        mimeType,
      });

      const updated = await registerVoiceTakeInCloud({
        konuId: activeIssue.konuId,
        format: activeFormat,
        sceneNo,
        storagePath,
        mimeType,
        sizeBytes: file.size,
        durationSec,
        peakDbfs,
        approxLufs,
      });
      replaceIssueInState(updated);
      setToastMessage(`Sahne ${sceneNo} ses kaydı buluta eklendi.`);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusyMessage(null);
    }
  };

  // Kaydedilmiş sahneleri tarayıcıda 48 kHz -14 LUFS tek Master WAV olarak birleştirip kasaya atma
  const stitchAllScenesInCloud = async () => {
    setErrorMessage(null);
    const orderedTakes = draftScenes
      .map((s) => formatTakes[s.sceneNo])
      .filter((t): t is NonNullable<typeof t> => Boolean(t?.signedUrl));

    if (orderedTakes.length === 0) {
      setErrorMessage("Birleştirmek için önce en az 1 sahne kaydedin.");
      return;
    }

    setBusyMessage("Sahne kayıtları 48 kHz -14 LUFS Master WAV olarak birleştiriliyor…");
    try {
      const segments: Array<{ samples: Float32Array; sampleRate: number }> = [];
      for (const take of orderedTakes) {
        const res = await fetch(take.signedUrl!);
        const ab = await res.arrayBuffer();
        const decoded = decodeWavToMonoFloat32(ab);
        segments.push(decoded);
      }

      const { wavBuffer, stats } = stitchSceneTakesToMasterWav(segments, 180);
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

      if (!cloudConfigured) {
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeIssue.konuId}_${activeFormat}_master_48k.wav`;
        a.click();
        setToastMessage(
          `Master WAV indirildi (${stats.durationSec} sn · ${stats.approxLufs} LUFS).`
        );
        return;
      }

      const { storagePath } = await uploadBlobDirectToStudyo({
        category: "ready_output",
        konuId: activeIssue.konuId,
        format: activeFormat,
        blob: wavBlob,
        mimeType: "audio/wav",
      });

      const updated = await registerReadyOutputInCloud({
        konuId: activeIssue.konuId,
        kind: "master_wav",
        format: activeFormat,
        label: `${FORMAT_LABELS[activeFormat].short} · 48 kHz Master Ses (${stats.approxLufs} LUFS)`,
        storagePath,
        mimeType: "audio/wav",
        sizeBytes: wavBlob.size,
        durationSec: stats.durationSec,
        lufs: stats.approxLufs,
        fps: Math.round(STUDYO_SAMPLE_RATE / 1000),
      });

      replaceIssueInState(updated);
      setToastMessage(
        `${orderedTakes.length} sahne birleştirildi (${stats.durationSec} sn · ${stats.approxLufs} LUFS) ve Yayın Kasasına eklendi!`
      );
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusyMessage(null);
    }
  };

  // Samsung S24 Taş Fırın Video Klibi Yükleme (doğrudan Supabase Storage, 100 MB sınır)
  const handleOvenClipUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setBusyMessage(`${files.length} adet taş fırın klibi doğrudan buluta yükleniyor…`);
    try {
      let latestIssue = activeIssue;
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]!;
        const mimeType = file.type || "video/mp4";
        const { storagePath } = await uploadBlobDirectToStudyo({
          category: "oven_clip",
          konuId: activeIssue.konuId,
          format: "seri_b",
          blob: file,
          mimeType,
        });

        latestIssue = await registerOvenClipInCloud({
          konuId: activeIssue.konuId,
          label: file.name.replace(/\.[^.]+$/, "").slice(0, 80) || `Taş Fırın Klibi #${i + 1}`,
          storagePath,
          mimeType,
          sizeBytes: file.size,
        });
      }
      replaceIssueInState(latestIssue);
      setToastMessage(`${files.length} taş fırın klibi buluta yüklendi!`);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDeleteMedia = async (params: {
    target: "voice_take" | "oven_clip" | "ready_output";
    format?: StudyoFormatKey;
    sceneNo?: number;
    itemId?: string;
  }) => {
    setErrorMessage(null);
    setBusyMessage("Kayıt siliniyor…");
    try {
      const res = await fetch("/api/admin/studyo/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          konuId: activeIssue.konuId,
          ...params,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        issue?: StudyoIssue;
        error?: string;
      };
      if (!res.ok || !body.issue) {
        throw new Error(body.error || "Silinemedi.");
      }
      replaceIssueInState(body.issue);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusyMessage(null);
    }
  };

  const toggleSeriBAudioMode = async (mode: "voice_ducking" | "pure_asmr") => {
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/studyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_audio_mode",
          konuId: activeIssue.konuId,
          audioMode: mode,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        issue?: StudyoIssue;
        error?: string;
      };
      if (!res.ok || !body.issue) {
        throw new Error(body.error || "Ses modu güncellenemedi.");
      }
      replaceIssueInState(body.issue);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const queueCloudRender60Fps = async () => {
    setErrorMessage(null);
    if (dirty) {
      await saveScriptToCloud(false);
    }
    setBusyMessage("60 fps Master Render kuyruğa ekleniyor…");
    try {
      const res = await fetch("/api/admin/studyo/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          konuId: activeIssue.konuId,
          format: activeFormat,
          safeZoneBottomPx: DEFAULT_SAFE_ZONE_BOTTOM_PX,
          safeZoneRightPx: DEFAULT_SAFE_ZONE_RIGHT_PX,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        job?: StudyoRenderJob;
        queue?: StudyoRenderJob[];
        dispatched?: boolean;
        error?: string;
      };
      if (!res.ok || !body.queue) {
        throw new Error(body.error || "Render kuyruğuna eklenemedi.");
      }
      setRenderQueue(body.queue);
      setToastMessage(
        body.dispatched
          ? "GitHub Actions 60 fps bulut render işçisi tetiklendi! Bittiğinde Yayın Kasasına düşecek."
          : "60 fps iş bulut kuyruğuna eklendi! Ev PC işçisi veya GitHub Actions çalıştığında otomatik derlenir."
      );
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusyMessage(null);
    }
  };

  const togglePublishChannel = async (channel: StudyoPublishChannel) => {
    try {
      const res = await fetch("/api/admin/studyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_channel",
          konuId: activeIssue.konuId,
          channel,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        issue?: StudyoIssue;
        error?: string;
      };
      if (res.ok && body.issue) {
        replaceIssueInState(body.issue);
      }
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const shareFromMobile = async (title: string, text: string, url?: string | null) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          ...(url ? { url } : {}),
        });
        return;
      } catch {
        // Kullanıcı iptal ettiyse sessiz geç
      }
    }
    await copyText(`share-${title}`, text);
  };

  const visibleFormats: StudyoFormatKey[] = showLongMode
    ? ["kisa_01", "kisa_02", "seri_b", "uzun"]
    : ["kisa_01", "kisa_02", "seri_b"];

  const stepTabs: Array<{
    id: MainStepTab;
    label: string;
    badge?: string;
  }> = [
    {
      id: "senaryo",
      label: "1. Senaryo & Koç",
      badge: `${coachReport.totalScore}p`,
    },
    {
      id: "ses",
      label: "2. Prompter & Ses",
      badge: `${recordedSceneCount}/${draftScenes.length}`,
    },
    {
      id: "kurgu",
      label: "3. Fırın & 60fps",
      badge: activeIssue.ovenClips.length > 0 ? `${activeIssue.ovenClips.length} klip` : undefined,
    },
    {
      id: "yayin",
      label: "4. Yayın & Gazete",
      badge:
        activeIssue.readyAssets.length > 0
          ? `${activeIssue.readyAssets.length} hazır`
          : undefined,
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Üst Bulut Durum ve Hızlı Erişim Kartı */}
      <section className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E5EFE7] border border-[#B4D3BC] text-xs font-mono font-semibold text-[#1D5130]">
                <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                {cloudConfigured ? "7/24 Bulut Aktif (HTTPS)" : "Yerel Önizleme Modu"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F3E2D4] text-xs font-mono font-semibold text-[#8E3D1B]">
                9:16 Dikey Odaklı · ~45 dk/hafta
              </span>
            </div>
            <h1
              className="font-serif text-xl sm:text-2xl font-bold text-[#3B1E1A]"
              style={{ textWrap: "balance" }}
            >
              EkmekLab Bulut İçerik &amp; Medya Stüdyosu
            </h1>
            <p className="text-xs sm:text-sm text-[#6E5148]" style={{ textWrap: "pretty" }}>
              Evde olmasanız bile telefonunuzdan senaryo onaylayın, Prompter ile 48 kHz ses
              kaydedin, taş fırın kliplerini yükleyin ve hazır 9:16 çıktıları indirin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPrompterSceneIdx(0);
                setPrompterOpen(true);
              }}
              className="min-h-11 px-4 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xs"
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
              <span>Prompter Aç</span>
            </button>
            <button
              type="button"
              onClick={() => void refreshWorkspace()}
              aria-label="Bulut verisini yenile"
              className="min-w-11 min-h-11 rounded-xl bg-white border border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F6EEDF] inline-flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 25 Sayı Hızlı Seçici Şerit */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label
              htmlFor={`${baseId}-issue-search`}
              className="text-xs font-mono uppercase tracking-wider text-[#6E5148]"
            >
              25 Haftalık Sayı Cephaneliği (#01–#25)
            </label>
            <input
              id={`${baseId}-issue-search`}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sayı veya konu ara (ör. çavdar, pH)…"
              className="min-h-10 px-3 py-1.5 rounded-xl bg-white border border-[#E2D3BD] text-xs text-[#3B1E1A] w-full sm:w-64"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filteredIssues.map((item) => {
              const selected = item.konuId === activeIssue.konuId;
              return (
                <button
                  key={item.konuId}
                  type="button"
                  onClick={() => setSelectedKonuId(item.konuId)}
                  className={`min-h-11 px-3.5 py-2 rounded-xl border text-left shrink-0 transition-colors ${
                    selected
                      ? "bg-[#3B1E1A] border-[#3B1E1A] text-[#FBF6EC]"
                      : item.status === "ready"
                      ? "bg-white border-[#C7B398] text-[#3B1E1A] hover:bg-[#F3E9D6]"
                      : "bg-[#F6EEDF] border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="font-bold">
                      #{String(item.issueNumber).padStart(2, "0")}
                    </span>
                    <span>· {item.konuId}</span>
                    {item.status === "ready" ? (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          selected ? "text-[#7CE09A]" : "text-[#1D5130]"
                        }`}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <div className="text-xs font-semibold max-w-[180px] truncate">
                    {item.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Format Seçici + İsteğe Bağlı Uzun Mod */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap border-t border-[#E2D3BD]">
          <div className="flex items-center gap-1.5 flex-wrap">
            {visibleFormats.map((fmt) => {
              const active = activeFormat === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setActiveFormat(fmt)}
                  className={`min-h-11 px-3.5 rounded-xl text-xs font-semibold border transition-colors ${
                    active
                      ? "bg-[#B4532A] border-[#9C4421] text-white"
                      : "bg-white border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F6EEDF]"
                  }`}
                >
                  {FORMAT_LABELS[fmt].short}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !showLongMode;
              setShowLongMode(next);
              if (!next && activeFormat === "uzun") {
                setActiveFormat("kisa_01");
              }
            }}
            aria-pressed={showLongMode}
            className="min-h-11 px-3 rounded-xl text-xs font-mono text-[#6E5148] hover:text-[#3B1E1A] bg-[#F6EEDF] border border-[#E2D3BD] inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showLongMode ? "Uzun Mod Açık" : "Uzun Bölüm / Kitap"}</span>
          </button>
        </div>
      </section>

      {/* Bildirim ve Hata Bantları */}
      {busyMessage ? (
        <div className="rounded-xl bg-[#F3E2D4] border border-[#D4B499] px-4 py-3 text-xs sm:text-sm font-medium text-[#3B1E1A] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#B4532A] shrink-0" aria-hidden="true" />
          <span>{busyMessage}</span>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="rounded-xl bg-[#E5EFE7] border border-[#B4D3BC] px-4 py-3 text-xs sm:text-sm font-medium text-[#1D5130] flex items-center justify-between gap-2">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs underline shrink-0"
          >
            Kapat
          </button>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl bg-[#FDECE8] border border-[#E8B4A9] px-4 py-3 text-xs sm:text-sm font-medium text-[#8E2A1B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {/* 4 Adımlı Mobil Sekme Çubuğu (`modern-web-guidance` `tabs` uyumlu) */}
      <div className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] overflow-hidden">
        <div
          focusgroup="tablist nomemory"
          aria-label="İçerik üretim adımları"
          className="studyo-tablist border-b border-[#E2D3BD] bg-white px-2 no-scrollbar"
        >
          {stepTabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`${baseId}-tab-${tab.id}`}
                type="button"
                aria-selected={selected}
                focusgroupstart={selected ? "" : undefined}
                onClick={(e) => {
                  setActiveTab(tab.id);
                  e.currentTarget.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                  });
                }}
                className="studyo-tab-btn min-h-12 px-4 py-3 text-xs sm:text-sm font-semibold text-[#3B1E1A] inline-flex items-center gap-2"
              >
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#F6EEDF] border border-[#E2D3BD] font-mono text-[11px] text-[#6E5148]">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* PANEL 1: SENARYO & KOÇ */}
        <div
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-senaryo`}
          hidden={activeTab !== "senaryo"}
        >
          <div className="p-4 sm:p-6 space-y-5">
            {/* Sayı Üst Özeti + K006 & Koç Skoru */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-4 rounded-2xl bg-[#F6EEDF] border border-[#E2D3BD] space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-mono text-[#6E5148]">
                    {activeIssue.partLabel} · {activeIssue.ftsPaperCount} Tam Metin Kanıt
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                      isApproved
                        ? "bg-[#E5EFE7] text-[#1D5130] border border-[#B4D3BC]"
                        : "bg-white text-[#6E5148] border border-[#E2D3BD]"
                    }`}
                  >
                    {isApproved ? "Senaryo Onaylı" : "İnceleme Bekliyor"}
                  </span>
                </div>
                <h2 className="font-serif text-lg font-bold text-[#3B1E1A]">
                  Sayı #{String(activeIssue.issueNumber).padStart(2, "0")}: {activeIssue.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#3B1E1A]/90 leading-relaxed">
                  <strong>Çekirdek Mekanizma:</strong> {activeIssue.coreMechanism}
                </p>
                <p className="text-xs font-mono text-[#6E5148]">
                  Çapa Makaleler: {activeIssue.anchorPapers.join(" · ")}
                </p>
              </div>

              {/* Yönetmen Koçu + K006 Durumu */}
              <div className="p-4 rounded-2xl bg-white border border-[#E2D3BD] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#6E5148]">
                    Yönetmen Koçu
                  </span>
                  <span className="font-mono text-xl font-bold text-[#3B1E1A]">
                    {coachReport.totalScore}/100
                  </span>
                </div>

                <div className="space-y-1.5">
                  {coachReport.checks.map((chk) => (
                    <div
                      key={chk.id}
                      className="flex items-start gap-2 text-xs leading-snug"
                    >
                      <span
                        className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          chk.passed ? "bg-[#1D5130]" : "bg-[#B4532A]"
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-[#3B1E1A]">
                          {chk.label}:{" "}
                        </span>
                        <span className="text-[#6E5148]">{chk.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {!k006Report.passed ? (
                  <button
                    type="button"
                    onClick={handleSanitizeK006Local}
                    className="w-full min-h-11 px-3 rounded-xl bg-[#B4532A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <Wand2 className="w-4 h-4" aria-hidden="true" />
                    <span>
                      K006 Sağlık Terimlerini Fizikokimyasal Arındır (
                      {k006Report.violationCount})
                    </span>
                  </button>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-[#E5EFE7] border border-[#B4D3BC] text-xs font-medium text-[#1D5130] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>K006 Sıfır Sağlık Beyanı Doğrulandı</span>
                  </div>
                )}
              </div>
            </div>

            {/* Fonetik Latince Telaffuz Kartları */}
            {phoneticGuides.length > 0 ? (
              <div className="p-3.5 rounded-2xl bg-white border border-[#E2D3BD] space-y-2">
                <p className="text-xs font-mono uppercase tracking-wider text-[#6E5148]">
                  Seslendirme Telaffuz Rehberi ({phoneticGuides.length} terim)
                </p>
                <div className="flex flex-wrap gap-2">
                  {phoneticGuides.map((g) => (
                    <div
                      key={g.term}
                      title={g.note}
                      className="px-3 py-1.5 rounded-xl bg-[#F6EEDF] border border-[#E2D3BD] text-xs"
                    >
                      <strong className="text-[#3B1E1A]">{g.term}</strong>{" "}
                      <span className="font-mono text-[#8E3D1B]">
                        [{g.pronunciation}]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Sahne Listesi */}
            <div className="space-y-3">
              {draftScenes.map((scene, idx) => {
                const take = formatTakes[scene.sceneNo];
                return (
                  <div
                    key={scene.sceneNo}
                    className="p-4 rounded-2xl bg-white border border-[#E2D3BD] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#3B1E1A] text-[#FBF6EC] font-mono text-xs font-bold">
                          Sahne {scene.sceneNo}
                        </span>
                        <span className="text-xs font-semibold text-[#3B1E1A]">
                          {scene.title}
                        </span>
                        <span className="text-xs font-mono text-[#6E5148]">
                          ~{scene.estimatedSec} sn
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPrompterSceneIdx(idx);
                            setPrompterOpen(true);
                          }}
                          className="min-h-10 px-3 rounded-xl bg-[#F6EEDF] hover:bg-[#EFE3CE] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1.5"
                        >
                          <Mic className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
                          <span>{take ? "Yeniden Oku" : "Sahneyi Oku"}</span>
                        </button>

                        {activeFormat !== "seri_b" && scene.flowPrompt ? (
                          <button
                            type="button"
                            onClick={() =>
                              void copyText(
                                `flow-${scene.sceneNo}`,
                                scene.flowPrompt
                              )
                            }
                            className="min-h-10 px-3 rounded-xl bg-white border border-[#E2D3BD] text-xs font-mono text-[#6E5148] hover:text-[#3B1E1A] inline-flex items-center gap-1"
                          >
                            {copiedKey === `flow-${scene.sceneNo}` ? (
                              <Check className="w-3.5 h-3.5 text-[#1D5130]" aria-hidden="true" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>Flow</span>
                          </button>
                        ) : null}

                        {draftScenes.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => removeScene(idx)}
                            aria-label={`Sahne ${scene.sceneNo} sil`}
                            className="min-w-10 min-h-10 rounded-xl text-[#6E5148] hover:text-[#8E2A1B] hover:bg-[#FDECE8] inline-flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <textarea
                      value={scene.voiceText}
                      onChange={(e) => updateSceneText(idx, e.target.value)}
                      rows={3}
                      aria-label={`Sahne ${scene.sceneNo} metni`}
                      className="w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 py-2.5 text-sm text-[#3B1E1A] leading-relaxed focus:outline-none focus:border-[#B4532A]"
                    />

                    <p className="text-[11px] font-mono text-[#6E5148]">
                      Görsel Planı: {scene.visualCue}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Alt Eylem Çubuğu */}
            <div className="flex items-center justify-between gap-2.5 flex-wrap pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={addScene}
                  className="min-h-11 px-3.5 rounded-xl bg-white border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Sahne Ekle</span>
                </button>

                <button
                  type="button"
                  onClick={() => void regenerateDraftInCloud()}
                  className="min-h-11 px-3.5 rounded-xl bg-[#F6EEDF] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
                  <span>Bulutta Taslak Yenile</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void saveScriptToCloud(false)}
                  className="min-h-11 px-4 rounded-xl bg-white border border-[#3B1E1A] text-xs sm:text-sm font-bold text-[#3B1E1A]"
                >
                  Buluta Kaydet {dirty ? "•" : ""}
                </button>

                <button
                  type="button"
                  onClick={() => void approveScriptInCloud()}
                  className="min-h-11 px-5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Senaryoyu Onayla</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: PROMPTER & 48 kHz PUNCH-IN SES */}
        <div
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-ses`}
          hidden={activeTab !== "ses"}
        >
          <div className="p-4 sm:p-6 space-y-5">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#3B1E1A] text-[#FBF6EC] flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-xs font-mono uppercase text-[#D9A27E]">
                  HTTPS Mobil Mikrofon &amp; Sahne Bazlı Punch-In
                </p>
                <h2 className="font-serif text-lg sm:text-xl font-bold">
                  Tam Ekran S24 Prompter ({recordedSceneCount}/{draftScenes.length} Sahne Hazır)
                </h2>
                <p className="text-xs sm:text-sm text-[#E2D3BD]">
                  Sürçtüğünüzde tüm videoyu baştan okumayın; yalnız tek sahneyi 48 kHz WAV
                  olarak yeniden okuyun.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setPrompterSceneIdx(0);
                    setPrompterOpen(true);
                  }}
                  className="min-h-12 px-5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold inline-flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" aria-hidden="true" />
                  <span>Tam Ekran Prompter &amp; Kayıt</span>
                </button>

                <button
                  type="button"
                  disabled={recordedSceneCount === 0}
                  onClick={() => void stitchAllScenesInCloud()}
                  className="min-h-12 px-4 rounded-xl bg-[#FBF6EC] text-[#3B1E1A] disabled:opacity-45 text-xs sm:text-sm font-bold inline-flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
                  <span>Sahneleri -14 LUFS Master WAV Birleştir</span>
                </button>
              </div>
            </div>

            {/* Sahne Bazlı Ses Kartları + DJI Osmo Harici Dosya Yükleme */}
            <div className="space-y-3">
              {draftScenes.map((scene, idx) => {
                const take = formatTakes[scene.sceneNo];
                return (
                  <div
                    key={scene.sceneNo}
                    className="p-4 rounded-2xl bg-white border border-[#E2D3BD] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#8E3D1B]">
                            Sahne {scene.sceneNo}
                          </span>
                          {take ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#E5EFE7] text-[#1D5130] font-mono text-[11px] font-semibold">
                              {take.durationSec} sn · {take.approxLufs} LUFS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[#F6EEDF] text-[#6E5148] font-mono text-[11px]">
                              Kayıt Yok
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#3B1E1A] leading-relaxed">
                          {scene.voiceText}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setPrompterSceneIdx(idx);
                            setPrompterOpen(true);
                          }}
                          className="min-h-11 px-3.5 rounded-xl bg-[#B4532A] text-white text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Mic className="w-4 h-4" aria-hidden="true" />
                          <span>{take ? "Punch-In Yenile" : "Mikrofonla Oku"}</span>
                        </button>

                        <label className="min-h-11 px-3.5 rounded-xl bg-[#F6EEDF] hover:bg-[#EFE3CE] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1.5 cursor-pointer">
                          <Upload className="w-4 h-4 text-[#6E5148]" aria-hidden="true" />
                          <span>WAV / Osmo Yükle</span>
                          <input
                            type="file"
                            accept="audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/mpeg,audio/webm,.wav,.m4a,.mp3"
                            className="sr-only"
                            onChange={(e) => {
                              const picked = e.target.files?.[0];
                              e.target.value = "";
                              void handleExternalVoiceFile(scene.sceneNo, picked);
                            }}
                          />
                        </label>

                        {take ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleDeleteMedia({
                                target: "voice_take",
                                format: activeFormat,
                                sceneNo: scene.sceneNo,
                              })
                            }
                            aria-label={`Sahne ${scene.sceneNo} ses kaydını sil`}
                            className="min-w-11 min-h-11 rounded-xl bg-white border border-[#E2D3BD] text-[#6E5148] hover:text-[#8E2A1B] inline-flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {take?.signedUrl ? (
                      <audio
                        controls
                        loading="lazy"
                        preload="metadata"
                        src={take.signedUrl}
                        className="w-full h-10"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PANEL 3: TAŞ FIRIN KLİPLERİ & 60 FPS KURGU */}
        <div
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-kurgu`}
          hidden={activeTab !== "kurgu"}
        >
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sol: S24 Taş Fırın Klipleri + Seri B Ses Modu + Bulut Render Kuyruğu */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-4 rounded-2xl bg-[#F6EEDF] border border-[#E2D3BD] space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#3B1E1A] flex items-center gap-2">
                      <Flame className="w-5 h-5 text-[#B4532A]" aria-hidden="true" />
                      <span>Seri B — S24 Gerçek Taş Fırın Klipleri (3–5 Klip)</span>
                    </h2>
                    <p className="text-xs text-[#6E5148]">
                      Kameradan doğrudan çekin veya galeriden seçin (50 MB&apos;a kadar
                      doğrudan Supabase Bulut yüklemesi; yapay zekâ ekmek görüntüsü yasaktır).
                    </p>
                  </div>

                  <label className="min-h-11 px-4 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shrink-0">
                    <Camera className="w-4 h-4" aria-hidden="true" />
                    <span>S24 Klip Çek / Yükle</span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const list = e.target.files;
                        void handleOvenClipUpload(list);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {/* Seri B Çift Ses Modu Anahtarı */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void toggleSeriBAudioMode("voice_ducking")}
                    aria-pressed={activeIssue.audioMode === "voice_ducking"}
                    className={`min-h-12 p-3 rounded-xl border text-left transition-colors ${
                      activeIssue.audioMode === "voice_ducking"
                        ? "bg-[#3B1E1A] border-[#3B1E1A] text-[#FBF6EC]"
                        : "bg-white border-[#E2D3BD] text-[#3B1E1A]"
                    }`}
                  >
                    <div className="text-xs font-bold">
                      🎙️ Sesli Anlatım (Ducking -22 dB)
                    </div>
                    <div className="text-[11px] opacity-80">
                      Sesiniz önde, taş fırın çıtırtısı arkada hafif duyulur
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleSeriBAudioMode("pure_asmr")}
                    aria-pressed={activeIssue.audioMode === "pure_asmr"}
                    className={`min-h-12 p-3 rounded-xl border text-left transition-colors ${
                      activeIssue.audioMode === "pure_asmr"
                        ? "bg-[#3B1E1A] border-[#3B1E1A] text-[#FBF6EC]"
                        : "bg-white border-[#E2D3BD] text-[#3B1E1A]"
                    }`}
                  >
                    <div className="text-xs font-bold">
                      🔥 Saf Taş Fırın ASMR + Hikâye Kartı
                    </div>
                    <div className="text-[11px] opacity-80">
                      Mikrofon okuması gerekmez; saf çıtırtı ve kinetik yazı
                    </div>
                  </button>
                </div>

                {/* Yüklü Klipler */}
                {activeIssue.ovenClips.length === 0 ? (
                  <p className="text-xs font-mono text-[#6E5148] bg-white rounded-xl p-3 border border-[#E2D3BD]">
                    Bu sayı için henüz S24 taş fırın klibi yüklenmedi. Fırın başındayken
                    yukarıdaki butonla 3–5 kısa dikey klip yükleyin.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeIssue.ovenClips.map((clip) => (
                      <div
                        key={clip.id}
                        className="p-3 rounded-xl bg-white border border-[#E2D3BD] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#3B1E1A] truncate">
                            #{clip.slotOrder} · {clip.label}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleDeleteMedia({
                                target: "oven_clip",
                                itemId: clip.id,
                              })
                            }
                            aria-label={`${clip.label} klibini sil`}
                            className="min-w-9 min-h-9 rounded-lg text-[#6E5148] hover:text-[#8E2A1B] inline-flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                        {clip.signedUrl ? (
                          <video
                            controls
                            loading="lazy"
                            preload="metadata"
                            playsInline
                            width={270}
                            height={480}
                            src={clip.signedUrl}
                            className="w-full rounded-lg bg-black aspect-[9/16] object-cover"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 60 fps Master Bulut Render Kuyruğu */}
              <div className="p-4 rounded-2xl bg-white border border-[#E2D3BD] space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#3B1E1A]">
                      60 fps Master H.264 Render Kuyruğu (Bulut &amp; Ev İşçisi)
                    </h3>
                    <p className="text-xs text-[#6E5148]">
                      {githubDispatchConfigured
                        ? "GitHub Actions bulut işçisi bağlı — ev bilgisayarınız kapalıyken bile bulutta derlenir."
                        : "Kuyruğa alınan işler GitHub Actions ('studyo-bulut-render') veya ev bilgisayarınızdaki 'bulut_isci.py' tarafından 60 fps derlenip Yayın Kasasına bırakılır."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void queueCloudRender60Fps()}
                    className="min-h-11 px-4 rounded-xl bg-[#3B1E1A] hover:bg-[#522B25] text-white text-xs font-bold inline-flex items-center gap-2"
                  >
                    <Rocket className="w-4 h-4 text-[#D9A27E]" aria-hidden="true" />
                    <span>60 fps Master Render Başlat ({FORMAT_LABELS[activeFormat].short})</span>
                  </button>
                </div>

                {renderQueue.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {renderQueue.slice(0, 6).map((job) => (
                      <div
                        key={job.id}
                        className="p-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] flex items-center justify-between gap-3 flex-wrap text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-[#3B1E1A]">
                            {job.konuId} · {FORMAT_LABELS[job.format].short}
                          </span>
                          <p className="text-[#6E5148]">{job.statusMessage}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full font-mono font-bold uppercase text-[10px] ${
                              job.status === "ready"
                                ? "bg-[#E5EFE7] text-[#1D5130]"
                                : job.status === "failed"
                                ? "bg-[#FDECE8] text-[#8E2A1B]"
                                : "bg-[#F3E2D4] text-[#8E3D1B]"
                            }`}
                          >
                            {job.status}
                          </span>
                          {job.outputSignedUrl ? (
                            <a
                              href={job.outputSignedUrl}
                              download
                              className="min-h-9 px-3 rounded-lg bg-[#B4532A] text-white font-bold inline-flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>İndir</span>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Sağ: Canlı 9:16 Önizleme ve Anında Cihaz Üstü Video Çıktısı */}
            <div className="lg:col-span-5">
              <CanvasReelPreview
                issue={activeIssue}
                format={activeFormat}
                cloudConfigured={cloudConfigured}
                onIssueUpdated={replaceIssueInState}
              />
            </div>
          </div>
        </div>

        {/* PANEL 4: YAYIN KASASI & OTOMATİK A5 GAZETE */}
        <div
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-yayin`}
          hidden={activeTab !== "yayin"}
        >
          <div className="p-4 sm:p-6 space-y-6">
            {/* Hazır Çıktılar Kasası */}
            <div className="p-4 rounded-2xl bg-[#F6EEDF] border border-[#E2D3BD] space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#3B1E1A]">
                    📲 Hazır Videolar, Master Ses &amp; A5 Kese Kâğıdı Gazetesi
                  </h2>
                  <p className="text-xs text-[#6E5148]">
                    Telefonunuza tek dokunuşla indirin veya doğrudan Instagram / TikTok /
                    WhatsApp&apos;a paylaşın.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setGazeteOpen(true)}
                  className="min-h-11 px-4 rounded-xl bg-[#3B1E1A] text-white text-xs font-bold inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-[#D9A27E]" aria-hidden="true" />
                  <span>A5 Kese Kâğıdı Gazetesini Aç (QR)</span>
                </button>
              </div>

              {activeIssue.readyAssets.length === 0 ? (
                <p className="text-xs font-mono text-[#6E5148] bg-white rounded-xl p-3.5 border border-[#E2D3BD]">
                  Bu sayı için henüz bulut kasasında işlenmiş MP4/WAV bulunmuyor. &ldquo;3.
                  Fırın &amp; 60fps&rdquo; sekmesinden anında 9:16 video üretebilir veya 60 fps
                  Master Render kuyruğunu başlatabilirsiniz.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeIssue.readyAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-3.5 rounded-xl bg-white border border-[#E2D3BD] space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#3B1E1A]">
                            {asset.label}
                          </span>
                          <p className="text-[11px] font-mono text-[#6E5148]">
                            {(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                            {asset.durationSec ? ` · ${asset.durationSec} sn` : ""}
                            {asset.lufs ? ` · ${asset.lufs} LUFS` : ""}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteMedia({
                              target: "ready_output",
                              itemId: asset.id,
                            })
                          }
                          aria-label={`${asset.label} çıktısını sil`}
                          className="min-w-9 min-h-9 rounded-lg text-[#6E5148] hover:text-[#8E2A1B] inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>

                      {asset.signedUrl && asset.kind === "video_9x16" ? (
                        <video
                          controls
                          loading="lazy"
                          preload="metadata"
                          playsInline
                          width={270}
                          height={480}
                          src={asset.signedUrl}
                          className="w-full max-w-[240px] mx-auto rounded-lg bg-black aspect-[9/16]"
                        />
                      ) : null}

                      {asset.signedUrl && asset.kind === "master_wav" ? (
                        <audio
                          controls
                          loading="lazy"
                          preload="metadata"
                          src={asset.signedUrl}
                          className="w-full h-10"
                        />
                      ) : null}

                      {asset.signedUrl ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={asset.signedUrl}
                            download
                            className="flex-1 min-h-11 px-3 rounded-xl bg-[#B4532A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-4 h-4" aria-hidden="true" />
                            <span>Telefona İndir</span>
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              void shareFromMobile(
                                activeIssue.title,
                                activeIssue.social.reelsCaption,
                                asset.signedUrl
                              )
                            }
                            className="min-h-11 px-3.5 rounded-xl bg-[#F6EEDF] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center gap-1.5"
                          >
                            <Share2 className="w-4 h-4" aria-hidden="true" />
                            <span>Paylaş</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platforma Hazır Açıklama Metinleri & Tek Tık Kopyala */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-[#E2D3BD] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-sm font-bold text-[#3B1E1A]">
                    Instagram Reels (@ekmeklabtr) Metni
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      void copyText("reels-cap", activeIssue.social.reelsCaption)
                    }
                    className="min-h-10 px-3 rounded-xl bg-[#F6EEDF] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1.5"
                  >
                    {copiedKey === "reels-cap" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#1D5130]" aria-hidden="true" /> Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Kopyala
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#3B1E1A] whitespace-pre-line bg-[#FBF6EC] p-3 rounded-xl border border-[#E2D3BD]">
                  {activeIssue.social.reelsCaption}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E2D3BD] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-sm font-bold text-[#3B1E1A]">
                    TikTok (@ekmek.lab) &amp; Eşlikçi Sepet Çağrısı
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        "tiktok-cap",
                        `${activeIssue.social.tiktokCaption}\n\n${activeIssue.social.accompanimentCta}`
                      )
                    }
                    className="min-h-10 px-3 rounded-xl bg-[#F6EEDF] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1.5"
                  >
                    {copiedKey === "tiktok-cap" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#1D5130]" aria-hidden="true" /> Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Kopyala
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#3B1E1A] whitespace-pre-line bg-[#FBF6EC] p-3 rounded-xl border border-[#E2D3BD]">
                  {activeIssue.social.tiktokCaption}
                  {"\n\n"}
                  {activeIssue.social.accompanimentCta}
                </p>
              </div>
            </div>

            {/* 7 Kanallı Haftalık Yayın Kontrol Çizelgesi */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2D3BD] space-y-3">
              <h3 className="font-serif text-sm font-bold text-[#3B1E1A]">
                Haftalık Yayın Kontrol Listesi ({activeIssue.publishedChannels.length}/
                {PUBLISH_CHANNEL_META.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {PUBLISH_CHANNEL_META.map((ch) => {
                  const checked = activeIssue.publishedChannels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => void togglePublishChannel(ch.id)}
                      aria-pressed={checked}
                      className={`min-h-12 px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors ${
                        checked
                          ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                          : "bg-[#FBF6EC] border-[#E2D3BD] text-[#3B1E1A]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{ch.label}</div>
                        <div className="text-[11px] font-mono opacity-75 truncate">
                          {ch.handle}
                        </div>
                      </div>
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          checked ? "text-[#1D5130]" : "text-[#C7B398]"
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tam Ekran Mobil Prompter Modal (<dialog>) */}
      <PrompterDialog
        open={prompterOpen}
        onClose={() => setPrompterOpen(false)}
        issue={activeIssue}
        format={activeFormat}
        initialSceneIndex={prompterSceneIdx}
        cloudConfigured={cloudConfigured}
        onIssueUpdated={replaceIssueInState}
      />

      {/* A5 Kese Kâğıdı Gazetesi Modal (<dialog>) */}
      <GazeteSheetModal
        open={gazeteOpen}
        onClose={() => setGazeteOpen(false)}
        issue={activeIssue}
      />
    </div>
  );
}
