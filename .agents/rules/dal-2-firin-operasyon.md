---
trigger: glob
globs: **/src/app/admin/page.tsx, **/src/app/admin/layout.tsx, **/src/app/admin/siparisler/**, **/src/app/admin/uretim/**, **/src/app/admin/urunler/**, **/src/app/admin/musteriler/**, **/src/app/admin/ayarlar/**, **/src/app/admin/baski/**, **/src/lib/production/**, **/src/lib/bake/**, **/src/lib/orders/**, **/src/lib/order/**, **/src/lib/settings/**, **/src/app/api/admin/orders/**, **/src/app/api/admin/products/**, **/src/app/api/admin/production/**, **/src/app/api/admin/customers/**, **/src/app/api/admin/settings/**
---

# Dal 2 — Fırın Operasyon & Admin Kalkanı (`dal-firin-operasyon`)

- **Tam Ajan Tanımı:** `.agents/agents/dal-firin-operasyon/agent.md` *(Model: UI/tablo için `flash`, hamur matematiği & sipariş yaşam döngüsü için `pro`)*.
- **Tema & UX:** Yalnız Açık Kurumsal `Atölye Kremi / Sıcak Taş` (`#F6EEDF`, `#FFFFFF`/`#FBF6EC`, `#3B1E1A`, `#6E5148`, `#E2D3BD`, `#B4532A`). Native `alert/confirm/prompt` YASAK; mağaza şalterinde `<dialog>` onayı zorunlu.
- **Yetki & Eşzamanlılık:** Her API route `requireCapability` / `requireAdmin` taşır (`staff` Z-özeti/ciro/cari/ayar göremez). Durum güncellemede `.eq("status", currentStatus)` optimistic lock (`409`); Z-özelinde `courierRetailCashTotal` uyumu (`admin/page.tsx`).
- **Kapsam Dışı:** `/admin/cariler`, `/admin/finans`, `/admin/ekip`, `/admin/studyo`, `/kurye`, `src/lib/{cari,finance,delivery,studyo}` bu dalın dışındadır.
- **Doğrulama:** `npm run typecheck` + ilgili `npx vitest run ...`.
