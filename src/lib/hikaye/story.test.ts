import { describe, it, expect } from "vitest";
import { mediaUrl, parseStory, storyFilePath, storyProblems, StorySchema, youtubeId, type StoryStep } from "./story";

const adim = (p: Partial<StoryStep> = {}): StoryStep => ({ id: "a1", title: "Un", text: "", media: null, anId: null, ...p });

describe("YouTube kimliği", () => {
  it("bilinen bağlantı biçimlerini tanır", () => {
    const id = "dQw4w9WgXcQ";
    expect(youtubeId(`https://www.youtube.com/watch?v=${id}&t=10`)).toBe(id);
    expect(youtubeId(`https://youtu.be/${id}?si=x`)).toBe(id);
    expect(youtubeId(`youtube.com/shorts/${id}`)).toBe(id);
    expect(youtubeId(`https://m.youtube.com/embed/${id}`)).toBe(id);
    expect(youtubeId(id)).toBe(id);
  });

  it("başka siteyi ve bozuk kimliği reddeder", () => {
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("https://youtube.com/watch?v=kisa")).toBeNull();
    expect(youtubeId("rastgele yazı")).toBeNull();
  });
});

describe("ürün adımları", () => {
  it("dosya yolu ürün klasöründe, ürün kimliği temizlenir", () => {
    expect(storyFilePath("karakilcik", "f1", "video/quicktime")).toBe("urun/karakilcik/f1.mov");
    expect(storyFilePath("../x y", "f1", "image/webp")).toBe("urun/___x_y/f1.webp");
  });

  it("şema boş başlığı ve fazla adımı reddeder", () => {
    expect(StorySchema.safeParse([adim({ title: " " })]).success).toBe(false);
    expect(StorySchema.safeParse(Array.from({ length: 13 }, (_, i) => adim({ id: `a${i}` }))).success).toBe(false);
    expect(StorySchema.parse([{ id: "a1", title: "Un" }])[0]).toEqual(adim());
  });

  it("başka ürünün dosyasını, olmayan anı ve sağlık sözünü yakalar", () => {
    const anlar = new Set(["gece_dolapta"]);
    expect(storyProblems([adim({ media: { kind: "image", path: "urun/baska/f.webp" } })], "karakilcik", anlar)).toEqual([
      "1. adım: dosya bu ürüne ait değil",
    ]);
    expect(storyProblems([adim({ anId: "yok_boyle" })], "karakilcik", anlar)).toEqual(["1. adım: Bilim odasında böyle bir an yok"]);
    expect(storyProblems([adim({ text: "Sindirimi kolay bir ekmek." })], "karakilcik", anlar)[0]).toContain("sindirimi kolay");
    expect(
      storyProblems(
        [adim({ media: { kind: "video", path: "urun/karakilcik/f.mp4" }, anId: "gece_dolapta", text: "Bir gece dolapta bekler." })],
        "karakilcik",
        anlar,
      ),
    ).toEqual([]);
  });

  it("veritabanındaki bozuk adımı atlar", () => {
    expect(parseStory([adim(), { title: 5 }, null])).toHaveLength(1);
    expect(parseStory("bozuk")).toEqual([]);
  });
});

describe("dosya adresi", () => {
  it("önek ile yolu tek eğik çizgiyle birleştirir", () => {
    expect(mediaUrl("https://x.supabase.co/storage/v1/object/public/media/", "urun/a/f.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/media/urun/a/f.webp",
    );
    expect(mediaUrl("https://x/media", "/urun/a/f.webp")).toBe("https://x/media/urun/a/f.webp");
  });
});
