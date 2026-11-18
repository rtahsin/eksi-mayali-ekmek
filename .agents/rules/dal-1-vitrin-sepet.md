---
trigger: glob
globs: **/src/app/page.tsx, **/src/app/storefront-ui.css, **/src/app/globals.css, **/src/app/urun/**, **/src/app/e/**, **/src/app/arac/**, **/src/app/hesabim/**, **/src/app/siparislerim/**, **/src/app/siparis-takip/**, **/src/components/storefront/**, **/src/components/cart/**, **/src/components/atelier/**, **/src/components/customer/**, **/src/components/common/**, **/src/lib/products/**, **/src/lib/store/**, **/src/lib/design/**, **/src/lib/ordering/**
---

# Dal 1 — Vitrin & Sepet Kalkanı (`dal-vitrin-sepet`)

- **Tam Ajan Tanımı:** `.agents/agents/dal-vitrin-sepet/agent.md` *(Model: UI için `flash`, 3D sahne & sepet/kapasite için `pro`)*.
- **Görsel Disiplin:** Ürün kartlarında ve sahnede çıkartma/`rembg` dekupe KESİNLİKLE YASAK; doğal atölye ışığı tam çerçeve (`object-cover`), 3 sütunlu dengeli galeri, `touch-action: pan-y` ve SSR `opacity-0` yasağı.
- **Sözleşmeler:** `Atölye Kremi` token'ları (`docs/VITRIN_ARAYUZ_STANDARTLARI.md`), `isAccompaniment` mandıra dili, Beylikdüzü `0 ₺` min sepet & `0 ₺` teslimat, yalnız Kapıda Nakit/Kart + WhatsApp köprüsü, `K006` sıfır sağlık vaadi.
- **Kapsam & Sınır:** `/laboratuvar` (`game`) dondurulmuş; `/admin/**` ve `src/lib/{cari,finance,delivery}` alanlarına dokunma.
- **Doğrulama:** `npm run typecheck` + ilgili `npx vitest run ...` (yalnız tekil sohbette son kontrol için `npm run build`).
