---
name: ekmeklab-vitrin-ux
description: EkmekLab müşteri vitrini (/ , /urun/[slug], /e/[slug], /arac, /bilim), Atölye Kremi tasarım sistemi, Ekmek vs Eşlikçi (Mandıra/Şarküteri) ayrımı, SSR görsel yükleme güvenliği ve K006 sıfır sağlık beyanı kuralları. Müşteri-yüzlü bileşenleri veya sayfaları düzenlerken etkinleştir.
---

# EkmekLab Vitrin & UX Standartları

## 1. Tasarım Sistemi (Atölye Kremi & Fırın Közü)
- Semantik CSS değişkenlerini (`bg-bg`, `bg-cream-surface`, `text-ink`, `text-ink-muted`, `border-line`, `text-accent`) kullan; jenerik parlak mavi/kırmızı renkler yazma.
- `#B4532A` (`--accent`) krem zemin üzerinde gövde metni kontrastını (~4,3:1) geçmez; yalnız büyük başlıklar, rozetler ve buton zeminlerinde (`text-white` ile) kullan.
- Gece/gündüz teması `src/lib/theme/resolveTheme.ts` (`"system" | "light" | "dark"`) üzerinden çalışır; varsayılan `"system"` tercihini bozma.
- Her HTML/CSS/istemci JS değişikliğinden önce `modern-web-guidance` yeteneğini çalıştır (`npx.cmd -y modern-web-guidance@latest search "..."`).

## 2. Ekmek vs Eşlikçi (Mandıra & Şarküteri) Ayrımı
- Bir ürünün ekmek mi yoksa eşlikçi mi olduğunu daima `src/lib/products/grouping.ts` içindeki `isAccompaniment(product)` (veya kategori bazında `isAccompanimentCategory(cat)`) ile belirle; elle `category === "bread"` kontrolü yapma.
- **Eşlikçi ürünlerde (Jersey çiğ süt, ev yoğurdu, sucuk, yumurta, yufka, peynir, kavurma vb.):**
  - Asla `"Günlük Taş Fırın Üretimi"`, `"her somunun ardında"`, `"hidrasyon"`, `"taş değirmen unu"` gibi ekmek metinleri gösterme.
  - Yerine `"Günlük Taze Mandıra & Şarküteri"` (veya `madeToOrder` ise `"Sipariş Üzerine Hazırlanır"`) rozeti ve üretici/kaynak odaklı dil kullan.
  - Görsel yer tutucu olarak `getProductPlaceholder(product.category)` (`bread.svg` vs `accompaniment.svg`) kullan.

## 3. SSR Görsel Yükleme & LCP Güvenliği
- İstemci bileşenlerinde `<img className="opacity-0" onLoad={...}>` kalıbı kullanıyorsan, SSR hydration sırasında önbellekteki görsellerin `onLoad` tetiklenmeden tamamlanabileceğini unutma: daima `imgRef.current?.complete && imgRef.current.naturalWidth > 0` kontrolü yap ve `product.imageUrl` değiştiğinde `imgSrc` durumunu senkronize et.
- Sayfanın ana LCP görselinde `fetchPriority="high"` kullan ve `loading="lazy"` ekleme; ekran altı kartlarda yalnızca `loading="lazy"` kullan (`fetchPriority="low"` ekleme).

## 4. K006 — Sıfır Sağlık Beyanı & Pazarlama Köprüsü
- Vitrin, ürün kartı, `/urun/[slug]`, `/e/[slug]` ve `/bilim` sayfalarında **asla** tıbbi/fizyolojik sağlık vaadi (*"şifa, sağlıklı, sindirimi kolay, bağırsak dostu, kan şekeri, glisemik indeks, insülin, önler, iyileştirir"*) geçemez (`src/lib/knowledge/lint.ts` → `HEALTH_TERMS` / `findHealthTerms`).
- İçerik kapılarında (`/bilim`, `/arac`) ziyaretçiyi tek dokunuşla sıcak fırın ve eşlikçi siparişine (`/` veya `#ekmekler`) bağlayan net dönüşüm bağlantısını koru.
- Windows PowerShell ortamında `rg` kurulu değildir; kod aramalarında `git grep` kullan.
