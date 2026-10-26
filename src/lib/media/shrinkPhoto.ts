import { fitWithin } from "@/lib/bake/log";

// Tarayıcıda çalışır: telefon fotoğrafını yüklemeden önce küçültür.

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Uzun kenar 1600 px, webp (desteklemeyen tarayıcıda jpeg). */
export async function shrinkPhoto(file: File, name = "foto"): Promise<File> {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
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
