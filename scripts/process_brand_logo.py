"""Extract EkmekLab cream seal from designer PDF — minimal pipeline.

Seal = cream disc + dark ink; outside circle = transparent (geometry mask only).
Never color-key black ink. Mark asset = seal copy (no muddy bread crop).

Outputs:
  assets/logo/logo_seal.png, logo.png, logo_512.png, logo_mark.png (= seal)
  assets/images/logo.png
  web favicon + PWA icons (cream circle + centered seal)
  assets/logo/qa_on_cream.png, qa_on_dark.png
"""
from __future__ import annotations

import math
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO_DIR = ROOT / "assets" / "logo"
IMAGES_LOGO = ROOT / "assets" / "images" / "logo.png"
WEB_DIR = ROOT / "web"
WEB_ICONS = WEB_DIR / "icons"
FAVICON = WEB_DIR / "favicon.png"

BRAND_CREAM = (247, 235, 211)  # #F7EBD3
RENDER_SCALE = 6.0


def _find_pdf() -> Path:
    pdfs = sorted(LOGO_DIR.glob("*.pdf"))
    if not pdfs:
        raise SystemExit(f"No PDF found under {LOGO_DIR}")
    return pdfs[0]


def _render_page(pdf: Path, page_index: int = 0, scale: float = RENDER_SCALE) -> Image.Image:
    doc = fitz.open(str(pdf))
    page = doc[page_index]
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=True)
    img = Image.frombytes("RGBA", (pix.width, pix.height), pix.samples)
    doc.close()
    return img


def _is_cream(r: int, g: int, b: int) -> bool:
    return r >= 200 and g >= 175 and b >= 140 and (r + g + b) > 560


def extract_cream_seal(img: Image.Image) -> Image.Image:
    """Isolate cream circular seal; outside = transparent. Geometry only — keep ink."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()

    cream_pts: list[tuple[int, int]] = []
    step = max(2, min(w, h) // 500)
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b, a = pixels[x, y]
            if a < 20:
                continue
            if _is_cream(r, g, b):
                cream_pts.append((x, y))

    if len(cream_pts) < 50:
        raise SystemExit("Could not detect cream seal disc on PDF page")

    xs = [p[0] for p in cream_pts]
    ys = [p[1] for p in cream_pts]
    cx = (min(xs) + max(xs)) / 2.0
    cy = (min(ys) + max(ys)) / 2.0
    radius = max(math.hypot(x - cx, y - cy) for x, y in cream_pts) + step

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_px = out.load()
    r_inner = radius - 0.75
    r_outer = radius + 1.25

    for y in range(h):
        for x in range(w):
            dist = math.hypot(x - cx, y - cy)
            if dist > r_outer:
                continue
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if dist <= r_inner:
                out_px[x, y] = (r, g, b, a)
            elif _is_cream(r, g, b):
                t = 1.0 - (dist - r_inner) / (r_outer - r_inner)
                out_px[x, y] = (r, g, b, max(0, min(255, int(a * t))))

    return out


def trim_transparent(img: Image.Image, padding: int = 4) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(img.width, right + padding)
    bottom = min(img.height, bottom + padding)
    return img.crop((left, top, right, bottom))


def fit_square(img: Image.Image, size: int, bg: tuple[int, int, int, int] | None = None) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    scale = min(size / img.width, size / img.height) * 0.96
    nw, nh = max(1, int(img.width * scale)), max(1, int(img.height * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def cream_circle_icon(seal: Image.Image, size: int, seal_ratio: float = 0.86) -> Image.Image:
    """Cream filled circle + centered seal — readable at favicon sizes."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    from PIL import ImageDraw

    draw = ImageDraw.Draw(canvas)
    draw.ellipse((0, 0, size - 1, size - 1), fill=BRAND_CREAM + (255,))
    inner = max(8, int(size * seal_ratio))
    fitted = fit_square(seal, inner, bg=(0, 0, 0, 0))
    ox = (size - fitted.width) // 2
    oy = (size - fitted.height) // 2
    canvas.paste(fitted, (ox, oy), fitted)
    return canvas


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path.relative_to(ROOT)} ({img.width}x{img.height})")


def write_qa(seal: Image.Image) -> None:
    tile = 280
    cream_bg = Image.new("RGBA", (tile, tile), BRAND_CREAM + (255,))
    dark_bg = Image.new("RGBA", (tile, tile), (26, 26, 26, 255))
    for bg, name in ((cream_bg, "qa_on_cream.png"), (dark_bg, "qa_on_dark.png")):
        fitted = fit_square(seal, 200, bg=(0, 0, 0, 0))
        out = bg.copy()
        ox = (tile - fitted.width) // 2
        oy = (tile - fitted.height) // 2
        out.paste(fitted, (ox, oy), fitted)
        save_png(out, LOGO_DIR / name)


def main() -> None:
    pdf = _find_pdf()
    print(f"Source PDF: {pdf.name}")

    raw = _render_page(pdf, 0)
    seal = trim_transparent(extract_cream_seal(raw), padding=8)
    seal_master = fit_square(seal, 1024, bg=(0, 0, 0, 0))
    seal_512 = fit_square(seal, 512, bg=(0, 0, 0, 0))

    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    save_png(seal_master, LOGO_DIR / "logo_seal.png")
    save_png(seal_master, LOGO_DIR / "logo.png")
    save_png(seal_512, LOGO_DIR / "logo_512.png")
    # Deprecate muddy mark: same seal file so old paths stay sharp
    save_png(seal_master, LOGO_DIR / "logo_mark.png")
    save_png(seal_master, IMAGES_LOGO)

    write_qa(seal)

    WEB_ICONS.mkdir(parents=True, exist_ok=True)
    save_png(cream_circle_icon(seal, 32), FAVICON)
    save_png(cream_circle_icon(seal, 48), WEB_ICONS / "favicon-48.png")
    save_png(cream_circle_icon(seal, 192), WEB_ICONS / "Icon-192.png")
    save_png(cream_circle_icon(seal, 512), WEB_ICONS / "Icon-512.png")
    save_png(cream_circle_icon(seal, 192, seal_ratio=0.80), WEB_ICONS / "Icon-maskable-192.png")
    save_png(cream_circle_icon(seal, 512, seal_ratio=0.80), WEB_ICONS / "Icon-maskable-512.png")

    print("Done.")


if __name__ == "__main__":
    main()
