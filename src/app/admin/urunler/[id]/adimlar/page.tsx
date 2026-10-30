"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  ExternalLink,
  Film,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  PlaySquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET } from "@/lib/bake/log";
import { shrinkPhoto } from "@/lib/media/shrinkPhoto";
import { MAX_STEPS, mediaUrl, youtubeId, type StoryStep } from "@/lib/hikaye/story";
import { getErrorMessage } from "@/lib/utils/error";

const inputCls =
  "w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-artisan-terracotta";

interface AnSecenegi {
  id: string;
  no: number;
  baslik: string;
}

interface StoryData {
  product: { id: string; name: string; url: string };
  steps: StoryStep[];
  anlar: AnSecenegi[];
  mediaBase: string | null;
}

const yeniAdim = (): StoryStep => ({ id: crypto.randomUUID(), title: "", text: "", media: null, anId: null });

/**
 * Ürünün "Nasıl yapılıyor" adımları: başlık, anlatım, isteğe bağlı fotoğraf / kısa video / YouTube,
 * isteğe bağlı Bilim odası anı. Telefonda kullanılmak üzere; kaydedilince ürün sayfası tazelenir.
 */
export default function ProductStoryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StoryData | null>(null);
  const [steps, setSteps] = useState<StoryStep[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [ytInput, setYtInput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}/story`, { cache: "no-store" });
      const body: StoryData & { error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body);
      setSteps(body.steps);
      setDirty(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Kaydedilmemiş değişiklikle sayfadan çıkarken uyar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (next: StoryStep[]) => {
    setSteps(next);
    setDirty(true);
    setSaved(false);
  };
  const patch = (sid: string, p: Partial<StoryStep>) => change(steps.map((s) => (s.id === sid ? { ...s, ...p } : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };

  const upload = async (sid: string, picked: File | undefined, kind: "image" | "video") => {
    if (!picked) return;
    setUploading(sid);
    setError(null);
    try {
      const file = kind === "image" ? await shrinkPhoto(picked, "adim") : picked;
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}/story/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: file.type, size: file.size }),
      });
      const body: { path?: string; token?: string; kind?: "image" | "video"; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !body.path || !body.token || !body.kind) throw new Error(body.error || "Yükleme başlatılamadı");
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase bağlantısı yok");
      const { error: upErr } = await supabase.storage
        .from(MEDIA_BUCKET)
        .uploadToSignedUrl(body.path, body.token, file, { contentType: file.type });
      if (upErr) throw upErr;
      patch(sid, { media: { kind: body.kind, path: body.path } });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(null);
    }
  };

  const setYoutube = (sid: string) => {
    const vid = youtubeId(ytInput[sid] ?? "");
    if (!vid) return setError("YouTube bağlantısı tanınmadı");
    setError(null);
    patch(sid, { media: { kind: "youtube", videoId: vid } });
    setYtInput((y) => ({ ...y, [sid]: "" }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}/story`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      const body: { steps?: StoryStep[]; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !body.steps) throw new Error(body.error || "Kaydedilemedi");
      setSteps(body.steps);
      setDirty(false);
      setSaved(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="py-20 flex justify-center text-stone-400 text-sm gap-2">
        {error ? <span className="text-red-300">{error}</span> : <><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…</>}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-32">
      <div className="bg-stone-900/80 p-5 rounded-2xl border border-stone-800 space-y-2">
        <Link href="/admin/urunler" className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Ürünler
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-stone-100 font-serif">{data.product.name} · Nasıl yapılıyor</h1>
          <a
            href={data.product.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
          >
            Ürün sayfasında gör <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          Adımlar ürün sayfasında sırayla görünür; boşsa bölüm hiç çıkmaz. Kısa klipler (50 MB'a kadar) buraya, uzun
          anlatımlar YouTube bağlantısıyla. Bilimsel açıklamayı Bilim odasındaki ana bırak. Sağlık sözü (sağlıklı,
          sindirimi kolay…) yazılamaz.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.id} className="bg-stone-900/70 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold text-amber-400 w-10">{String(i + 1).padStart(2, "0")}</span>
              <input
                value={s.title}
                onChange={(e) => patch(s.id, { title: e.target.value.slice(0, 80) })}
                placeholder="Başlık, ör. Gece dolapta"
                aria-label={`${i + 1}. adım başlığı`}
                className={`${inputCls} font-semibold`}
              />
            </div>
            <textarea
              value={s.text}
              onChange={(e) => patch(s.id, { text: e.target.value.slice(0, 1200) })}
              rows={4}
              placeholder="Bu adımda ne yapıyorsun, neden?"
              aria-label={`${i + 1}. adım anlatımı`}
              className={inputCls}
            />

            {s.media ? (
              <div className="relative rounded-xl overflow-hidden border border-stone-700 bg-stone-950 max-w-xs">
                {s.media.kind === "youtube" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- YouTube kapak resmi
                  <img src={`https://i.ytimg.com/vi/${s.media.videoId}/hqdefault.jpg`} alt="YouTube videosu" className="w-full" />
                ) : data.mediaBase && s.media.kind === "video" ? (
                  <video src={`${mediaUrl(data.mediaBase, s.media.path)}#t=0.1`} muted playsInline controls preload="metadata" className="w-full max-h-72" />
                ) : data.mediaBase ? (
                  // eslint-disable-next-line @next/next/no-img-element -- yüklenen fotoğraf önizlemesi
                  <img src={mediaUrl(data.mediaBase, s.media.path)} alt="Adım fotoğrafı" className="w-full" />
                ) : null}
                <button
                  type="button"
                  onClick={() => patch(s.id, { media: null })}
                  aria-label="Görseli kaldır"
                  className="absolute top-2 right-2 w-9 h-9 rounded-full bg-stone-950/90 border border-stone-700 text-stone-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : uploading === s.id ? (
              <div className="flex items-center gap-2 text-xs text-stone-400 h-11">
                <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor… (video birkaç dakika sürebilir)
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <label className="h-11 px-4 rounded-xl bg-stone-800 text-stone-200 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                    <Camera className="w-4 h-4" /> Fotoğraf
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => void upload(s.id, e.target.files?.[0], "image")} />
                  </label>
                  <label className="h-11 px-4 rounded-xl bg-stone-800 text-stone-200 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                    <Film className="w-4 h-4" /> Kısa video
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => void upload(s.id, e.target.files?.[0], "video")}
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    value={ytInput[s.id] ?? ""}
                    onChange={(e) => setYtInput((y) => ({ ...y, [s.id]: e.target.value }))}
                    placeholder="ya da YouTube bağlantısı yapıştır"
                    aria-label={`${i + 1}. adım YouTube bağlantısı`}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setYoutube(s.id)}
                    disabled={!ytInput[s.id]}
                    className="h-11 px-3 rounded-xl bg-stone-800 text-stone-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 shrink-0"
                  >
                    <PlaySquare className="w-4 h-4" /> Ekle
                  </button>
                </div>
              </div>
            )}

            <select
              value={s.anId ?? ""}
              onChange={(e) => patch(s.id, { anId: e.target.value || null })}
              aria-label={`${i + 1}. adım Bilim odası anı`}
              className={inputCls}
            >
              <option value="">Bilim odası bağlantısı yok</option>
              {data.anlar.map((a) => (
                <option key={a.id} value={a.id}>
                  Levha {String(a.no).padStart(2, "0")} · {a.baslik}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Yukarı taşı"
                className="w-11 h-11 rounded-xl bg-stone-800 text-stone-300 flex items-center justify-center disabled:opacity-30"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === steps.length - 1}
                aria-label="Aşağı taşı"
                className="w-11 h-11 rounded-xl bg-stone-800 text-stone-300 flex items-center justify-center disabled:opacity-30"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`${i + 1}. adım silinsin mi?`)) change(steps.filter((x) => x.id !== s.id));
                }}
                aria-label="Adımı sil"
                className="ml-auto h-11 px-3 rounded-xl bg-stone-800 text-red-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Sil
              </button>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => change([...steps, yeniAdim()])}
        disabled={steps.length >= MAX_STEPS}
        className="w-full h-12 rounded-2xl border border-dashed border-stone-700 text-stone-300 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Plus className="w-4 h-4" /> Adım ekle {steps.length >= MAX_STEPS && `(en fazla ${MAX_STEPS})`}
      </button>

      <div className="fixed bottom-16 md:bottom-4 inset-x-4 md:left-auto md:right-6 md:w-80 z-30">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving || uploading !== null}
          className="w-full h-14 rounded-2xl bg-artisan-terracotta text-white text-base font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {dirty ? "Kaydet" : saved ? "Kaydedildi" : "Değişiklik yok"}
        </button>
      </div>
    </div>
  );
}
