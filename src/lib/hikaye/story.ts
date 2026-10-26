// Ürün sayfasının "Nasıl yapılıyor" adımları: katalog ile Bilim odası arasında köprü olduğu için
// ürün (catalog) modülünün dışında durur; catalog bilim ve knowledge modüllerine bağlanamaz.
import { z } from "zod";
import { findHealthTerms } from "@/lib/knowledge/lint";

// Ürün sayfasındaki "Nasıl yapılıyor" adımlarının saf mantığı: şema, YouTube kimliği, dosya yolu,
// sağlık sözcüğü denetimi. Adımlar product_stories.steps'te (028), dosyalar media/urun/<ürün>/ altında.

export const MAX_STEPS = 12;
/** Kısa klip sınırı (028 ile media bucket'ı 50 MB) */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const STORY_FILE_TYPES = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
} as const;
export type StoryFileType = keyof typeof STORY_FILE_TYPES;

export function isStoryFileType(type: string): type is StoryFileType {
  return Object.prototype.hasOwnProperty.call(STORY_FILE_TYPES, type);
}

export function isVideoType(type: StoryFileType): boolean {
  return type.startsWith("video/");
}

/** Ürün kimliği dosya yoluna güvenle girsin diye yalnız harf, rakam, - ve _ kalır. */
export function storyFolder(productId: string): string {
  return `urun/${productId.replace(/[^A-Za-z0-9_-]/g, "_")}/`;
}

export function storyFilePath(productId: string, fileId: string, type: StoryFileType): string {
  return `${storyFolder(productId)}${fileId}.${STORY_FILE_TYPES[type]}`;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** YouTube bağlantısından (watch, youtu.be, shorts, embed) ya da çıplak kimlikten video kimliği. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (YT_ID.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s.startsWith("http") ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(shorts|embed|live)\/([^/]+)/);
      id = m ? m[2] : null;
    }
  }
  return id && YT_ID.test(id) ? id : null;
}

const StepMediaSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("image"), path: z.string().max(200) }),
  z.object({ kind: z.literal("video"), path: z.string().max(200) }),
  z.object({ kind: z.literal("youtube"), videoId: z.string().regex(YT_ID, "YouTube bağlantısı tanınmadı") }),
]);

export const StoryStepSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().min(1, "Her adımın bir başlığı olmalı").max(80, "Başlık en fazla 80 karakter"),
  text: z.string().trim().max(1200, "Anlatım en fazla 1200 karakter").default(""),
  media: StepMediaSchema.nullable().default(null),
  anId: z.string().regex(/^[a-z0-9_]{1,60}$/).nullable().default(null),
});

export const StorySchema = z.array(StoryStepSchema).max(MAX_STEPS, `En fazla ${MAX_STEPS} adım`);

export type StoryStep = z.infer<typeof StoryStepSchema>;
export type StepMedia = z.infer<typeof StepMediaSchema>;

/**
 * Kaydetmeden önce denetim: dosyalar bu ürünün klasöründe mi, Bilim anı var mı, sağlık
 * sözcüğü var mı (ürün sayfalarında sağlık beyanı yok: MARKA §3). Hata iletileri Türkçe.
 */
export function storyProblems(steps: readonly StoryStep[], productId: string, anIds: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const folder = storyFolder(productId);
  steps.forEach((s, i) => {
    const no = `${i + 1}. adım`;
    if (s.media && s.media.kind !== "youtube" && !s.media.path.startsWith(folder)) out.push(`${no}: dosya bu ürüne ait değil`);
    if (s.anId && !anIds.has(s.anId)) out.push(`${no}: Bilim odasında böyle bir an yok`);
    const terms = findHealthTerms(`${s.title} ${s.text}`);
    if (terms.length) out.push(`${no}: ürün sayfasında sağlık sözü geçemez (${terms.join(", ")})`);
  });
  return out;
}

/** Veritabanındaki adımlar; bozuk adım atlanır (sayfa yine açılır). */
export function parseStory(raw: unknown): StoryStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s) => {
    const parsed = StoryStepSchema.safeParse(s);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Bucket öneki + yol → herkese açık adres. */
export function mediaUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
