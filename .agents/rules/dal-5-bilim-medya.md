---
trigger: glob
globs: **/content/**, **/src/app/bilim/**, **/src/app/kavram/**, **/src/app/kaynak/**, **/src/app/arama/**, **/src/components/bilim/**, **/src/components/journal/**, **/src/components/editorial/**, **/src/lib/knowledge/**, **/src/lib/bilim/**, **/src/lib/editorial/**, **/arastirma/bilgi_sentezi_v2/**, **/arastirma/medya_hatti/**, **/arastirma/ses/**, **/arastirma/video_studyosu/**, **/arastirma/pazarlama_lansman/**
---

# Dal 5 — Bilim, İçerik & Medya Hattı Kalkanı (`dal-bilim-medya`)

- **Tam Ajan Tanımı:** `.agents/agents/dal-bilim-medya/agent.md` *(Model: FTS5/etiket/Reels için `flash`, kitap sentezi & `K011` için `pro`)*.
- **Doğruluk & Yasaklar:** `bilgi_sentezi.sqlite` FTS5 birincil kaynak; `paket_dogrula.py` + `K011` (`claimHash`) kilidi korunur; `K006` sıfır tıbbi/fizyolojik sağlık vaadi (`lint.ts`) kesindir.
- **Medya & Çakışma Sınırı:** Seri B ürün görselleri %100 gerçek S24 çekimidir; Seri A bilimsel kurguda Flow + Remotion `60fps` + `48 kHz` ses kullanılır. `arastirma/studyo/**`, `/admin/studyo/**` ve `src/lib/studyo/**` alanı `studyo-dal-1..5` uzmanlarına aittir — onlara dokunma!
- **Doğrulama:** Yalnız `arastirma/` değiştiyse `npm run build` koşulmaz (`paket_dogrula.py`); `content/` veya `src/` değiştiyse `npm run typecheck` + `npx vitest run src/app/__checks__/ src/lib/knowledge/ src/lib/bilim/ src/lib/kernel/arch.test.ts`.
