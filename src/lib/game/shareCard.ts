"use client";

/**
 * Paylaşım kartı: ekmeğin çizimi + unvan + puan, Instagram dikey boyutunda PNG (1080×1350).
 * SVG çizimler DOM'dan alınıp tuvale basılır; yazı tipi sayfadaki Fraunces'tır.
 */

function svgToImage(svg: SVGSVGElement, w: number, h: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fontVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

export interface ShareCardInput {
  loaf: SVGSVGElement | null;
  crumb: SVGSVGElement | null;
  title: string;
  total: number;
  levelName: string;
  scores: { kabarma: number; ic: number; kabuk: number; lezzet: number };
}

export async function renderShareCard(input: ShareCardInput): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  const serif = fontVar("--font-fraunces", "Georgia, serif");
  const sans = fontVar("--font-inter", "system-ui, sans-serif");

  ctx.fillStyle = "#F6EEDF";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#3B1E1A";
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  const logo = await loadImage("/logo/logo.png");
  if (logo) ctx.drawImage(logo, W / 2 - 80, 80, 160, 160);

  ctx.textAlign = "center";
  ctx.fillStyle = "#B4532A";
  ctx.font = `700 30px ${sans}`;
  ctx.fillText(`USTA OLABİLİR MİSİN? · ${input.levelName.toLocaleUpperCase("tr-TR")}`, W / 2, 300);

  ctx.fillStyle = "#3B1E1A";
  ctx.font = `600 96px ${serif}`;
  ctx.fillText(input.title, W / 2, 410);
  ctx.font = `700 54px ${sans}`;
  ctx.fillText(`${input.total} / 100`, W / 2, 480);

  // Çizimleri oranını bozmadan, verilen kutunun altına yaslı yerleştir
  const place = async (svg: SVGSVGElement | null, boxW: number, boxH: number, top: number) => {
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const ratio = vb && vb.width ? vb.height / vb.width : 2 / 3;
    const w = Math.min(boxW, boxH / ratio);
    const h = w * ratio;
    ctx.drawImage(await svgToImage(svg, w, h), (W - w) / 2, top + (boxH - h), w, h);
  };
  await place(input.loaf, 860, 360, 500);
  await place(input.crumb, 560, 300, 880);

  const rows: [string, number][] = [
    ["Kabarma", input.scores.kabarma],
    ["İç yapı", input.scores.ic],
    ["Kabuk", input.scores.kabuk],
    ["Lezzet", input.scores.lezzet],
  ];
  rows.forEach(([k, v], i) => {
    const x = 120 + i * 220;
    ctx.fillStyle = "#6E5148";
    ctx.font = `600 26px ${sans}`;
    ctx.fillText(k, x + 90, 1215);
    ctx.fillStyle = "#3B1E1A";
    ctx.font = `700 40px ${sans}`;
    ctx.fillText(String(v), x + 90, 1260);
  });

  ctx.fillStyle = "#B4532A";
  ctx.font = `700 30px ${sans}`;
  ctx.fillText("Sen de dene: ekmeklab.tr/laboratuvar", W / 2, 1300);

  return new Promise((resolve) => cv.toBlob((b) => resolve(b), "image/png"));
}

/** Telefonda paylaşım menüsü, olmazsa indirme */
export async function shareOrDownload(blob: Blob, text: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], "ekmeklab-ekmegim.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: "EkmekLab" });
      return "shared";
    } catch {
      // kullanıcı vazgeçti → indirmeye düşme
      return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ekmeklab-ekmegim.png";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
