import { fitWithin } from "@/lib/bake/log";

// Tarayıcıda çalışır: telefon fotoğrafını yüklemeden önce küçültür.

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export const HEIC_DECODE_ERROR_MESSAGE =
  "HEIC/HEIF fotoğrafı tarayıcıda açılamadı. Samsung S24 Kamera > Ayarlar > Gelişmiş resim seçenekleri altından HEIF resimleri kapatıp JPG çekin veya JPEG/PNG yükleyin.";

export const GENERIC_PHOTO_DECODE_ERROR_MESSAGE =
  "Fotoğraf okunamadı. Lütfen geçerli bir JPG, PNG veya WebP görseli seçin.";

/** Dosya uzantısı veya MIME türüne göre HEIC/HEIF olup olmadığını belirler. */
export function isHeicLikeFile(file: Pick<File, "name" | "type">): boolean {
  const mime = (file.type || "").trim().toLowerCase();
  if (HEIC_MIME_TYPES.has(mime)) return true;
  const name = (file.name || "").trim();
  return /\.(heic|heif)$/i.test(name);
}

/** Tarayıcı görseli çözemediğinde (`img.decode()` hatası) kullanıcıya gösterilecek Türkçe mesajı üretir. */
export function getPhotoDecodeErrorMessage(file: Pick<File, "name" | "type">): string {
  return isHeicLikeFile(file) ? HEIC_DECODE_ERROR_MESSAGE : GENERIC_PHOTO_DECODE_ERROR_MESSAGE;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Uzun kenar 1600 px, webp (desteklemeyen tarayıcıda jpeg). */
export async function shrinkPhoto(file: File, name = "foto"): Promise<File> {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    try {
      await img.decode();
    } catch {
      throw new Error(getPhotoDecodeErrorMessage(file));
    }
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Fotoğraf işlenemedi");
    ctx.drawImage(img, 0, 0, width, height);
    let blob = await toBlob(canvas, "image/webp", 0.82);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.85);
    if (!blob) throw new Error("Fotoğraf işlenemedi");
    return new File([blob], blob.type === "image/webp" ? `${name}.webp` : `${name}.jpg`, { type: blob.type });
  } finally {
    URL.revokeObjectURL(src);
  }
}
