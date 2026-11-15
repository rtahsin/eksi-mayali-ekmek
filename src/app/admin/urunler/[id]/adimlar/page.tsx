"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
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
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET } from "@/lib/bake/log";
import { shrinkPhoto } from "@/lib/media/shrinkPhoto";
import { MAX_STEPS, mediaUrl, youtubeId, type StoryStep } from "@/lib/hikaye/story";
import { getErrorMessage } from "@/lib/utils/error";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";

const inputCls =
  "w-full bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl px-3 py-2.5 text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/65 focus:outline-none focus:border-[#B4532A]";

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
  const { adminUser } = useAdminAuth();
  const canManageProducts = hasCapability(adminUser?.role, "products.manage");

  const [data, setData] = useState<StoryData | null>(null);
  const [steps, setSteps] = useState<StoryStep[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [ytInput, setYtInput] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; index: number } | null>(null);

  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const deleteTitleId = useId();

  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    if (deleteTarget) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [deleteTarget]);

  const load = useCallback(async () => {
    if (!canManageProducts) return;
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
  }, [id, canManageProducts]);

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

  const isPointerOutsideDialog = (e: React.PointerEvent<HTMLDialogElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  if (!canManageProducts) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white border border-[#E2D3BD] rounded-2xl p-6 text-center space-y-3 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-[#F3E2D4] border border-[#DFB99F] text-[#8E3D1B] flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-xl font-bold text-[#3B1E1A]">Yetki Gerekli</h1>
        <p className="text-sm text-[#6E5148]">Ürün yapılış adımlarını düzenleme yetkiniz bulunmuyor.</p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold transition-colors"
        >
          Komuta Merkezine Dön
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 flex justify-center text-[#6E5148] text-sm gap-2">
        {error ? (
          <span role="alert" className="text-[#7D2114] font-medium">
            {error}
          </span>
        ) : (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" /> Yükleniyor…
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 max-w-3xl mx-auto pb-32">
        <div className="bg-white p-5 rounded-2xl border border-[#E2D3BD] shadow-sm space-y-2">
          <Link href="/admin/urunler" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E5148] hover:text-[#3B1E1A] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Ürünler
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-[#3B1E1A] font-serif">{data.product.name} · Nasıl yapılıyor</h1>
            <a
              href={data.product.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8E3D1B] hover:text-[#3B1E1A] transition-colors"
            >
              Ürün sayfasında gör <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
          <p className="text-xs text-[#6E5148] leading-relaxed">
            Adımlar ürün sayfasında sırayla görünür; boşsa bölüm hiç çıkmaz. Kısa klipler (50 MB&apos;a kadar) buraya, uzun
            anlatımlar YouTube bağlantısıyla. Bilimsel açıklamayı Bilim odasındaki ana bırak. Sağlık sözü (sağlıklı,
            sindirimi kolay…) yazılamaz.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs font-medium text-[#7D2114] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> {error}
          </div>
        )}

        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={s.id} className="bg-white border border-[#E2D3BD] rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-serif font-mono tabular-nums text-2xl font-bold text-[#B4532A] w-10">
                  {String(i + 1).padStart(2, "0")}
                </span>
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
                <div className="relative rounded-xl overflow-hidden border border-[#E2D3BD] bg-[#FBF6EC] max-w-xs">
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
                    className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/95 hover:bg-[#FCECE9] border border-[#E2D3BD] text-[#3B1E1A] hover:text-[#7D2114] shadow-sm flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ) : uploading === s.id ? (
                <div className="flex items-center gap-2 text-xs text-[#6E5148] h-11">
                  <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" /> Yükleniyor… (video birkaç dakika sürebilir)
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="h-11 px-4 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors">
                      <Camera className="w-4 h-4 text-[#8E3D1B]" aria-hidden="true" /> Fotoğraf
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => void upload(s.id, e.target.files?.[0], "image")} />
                    </label>
                    <label className="h-11 px-4 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors">
                      <Film className="w-4 h-4 text-[#8E3D1B]" aria-hidden="true" /> Kısa video
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
                      className="h-11 px-3 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 shrink-0 transition-colors"
                    >
                      <PlaySquare className="w-4 h-4" aria-hidden="true" /> Ekle
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
                  className="w-11 h-11 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  <ArrowUp className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  aria-label="Aşağı taşı"
                  className="w-11 h-11 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  <ArrowDown className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: s.id, index: i })}
                  aria-label="Adımı sil"
                  className="ml-auto h-11 px-3 rounded-xl bg-[#FCECE9] hover:bg-[#F7DDD8] border border-[#E7B7AF] text-[#7D2114] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" /> Sil
                </button>
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => change([...steps, yeniAdim()])}
          disabled={steps.length >= MAX_STEPS}
          className="w-full h-12 rounded-2xl border border-dashed border-[#D3C0A5] bg-white hover:bg-[#FBF6EC] text-[#3B1E1A] text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
        >
          <Plus className="w-4 h-4 text-[#B4532A]" aria-hidden="true" /> Adım ekle {steps.length >= MAX_STEPS && `(en fazla ${MAX_STEPS})`}
        </button>

        <div className="fixed bottom-24 lg:bottom-6 inset-x-4 md:left-auto md:right-6 md:w-80 z-30">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saving || uploading !== null}
            className="w-full h-14 rounded-2xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-base font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Save className="w-5 h-5" aria-hidden="true" />}
            {dirty ? "Kaydet" : saved ? "Kaydedildi" : "Değişiklik yok"}
          </button>
        </div>
      </div>

      <dialog
        ref={confirmDialogRef}
        aria-labelledby={deleteTitleId}
        onCancel={(e) => {
          e.preventDefault();
          setDeleteTarget(null);
        }}
        onPointerDown={(e) => {
          pointerDownOutsideRef.current = e.target === e.currentTarget && isPointerOutsideDialog(e);
        }}
        onPointerUp={(e) => {
          if (e.target === e.currentTarget && pointerDownOutsideRef.current && isPointerOutsideDialog(e)) {
            setDeleteTarget(null);
          }
          pointerDownOutsideRef.current = false;
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white border border-[#E2D3BD] text-[#3B1E1A] p-5 shadow-2xl backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-[2px] backdrop:overflow-hidden backdrop:overscroll-contain"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div>
              <h2 id={deleteTitleId} className="font-serif text-base font-bold text-[#3B1E1A]">
                {deleteTarget.index + 1}. adım silinsin mi?
              </h2>
              <p className="text-xs text-[#6E5148] mt-1 leading-relaxed">
                Adım listeden kaldırılır; değişikliklerin vitrine yansıması için &ldquo;Kaydet&rdquo; butonuna basmalısınız.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-xs font-bold transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = deleteTarget.id;
                  setDeleteTarget(null);
                  change(steps.filter((x) => x.id !== targetId));
                }}
                className="px-4 py-2 rounded-xl bg-[#9B2C1F] hover:bg-[#7D2114] text-white text-xs font-bold transition-colors"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
