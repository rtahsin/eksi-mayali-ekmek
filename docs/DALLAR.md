# EkmekLab Dal Haritası ve Verimli Çalışma Kılavuzu (`DALLAR.md`)

> **Amaç:** Ana Komuta sohbetinin hafızasını şişirmeden, EkmekLab'ın 6 temiz mimari dalında bağımsız, sıfır-çakışmalı ve kota-verimli (`Flash` / `Pro`) çalışmak.

---

## 1. Nasıl Kullanacağım? (Yeni Sohbet vs Subagent Paneli)

Bu yapı **çift modlu** tasarlandı; yani hem **yeni ayrı sohbet pencerelerinden** hem de **Komuta sohbetinin alt-ajan (subagent) panelinden** aynı dallarla çalışabilirsin:

### Yöntem A — Günlük Tek Dal İşleri İçin: Soldan **Yeni Sohbet (`+ New Conversation`)** Aç *(En Ucuz & En Hızlı Yol)*
Bir dalda (örneğin sadece Vitrin veya sadece Kurye veya sadece Finans/Cari) çalışmak istediğinde **bu ana sohbete yazmana gerek yoktur**:
1. Sol panelden **`+ New Conversation`** ile tertemiz bir sohbet penceresi aç.
2. Sohbet modelini işin karmaşıklığına göre seç:
   - UI / CSS / tablo / metin / makbuz / etiket işi → **`Flash`**
   - 3D sahne / sepet kapasite / muhasebe-storno / kasa mutabakatı / güvenlik & migration → **`Pro`**
3. İlk mesajına ilgili ajanı **`@`** ile ekle (ör. `@.agents/agents/dal-cari-finans/agent.md`) ve ne istediğini yaz.
   - *İpucu:* İlk mesajda `@` ile dal ajanını etiketlemesen bile, ilgili dosyalara dokunduğun anda `.agents/rules/dal-*.md` **`glob` bağlam kalkanı** otomatik devreye girer; yalnızca o dalın kuralları yüklenir, diğer 5 dalın kuralları **0 token** yer.

### Yöntem B — Birden Fazla Dalı Aynı Anda Koşturmak İçin: **Komuta Sohbeti + Sağ Panel `Subagents`**
Aynı anda 2–3 bağımsız dalda iş yürütmek istediğinde veya büyük mimari / `034+` veritabanı geçişi yapacağında:
1. Komuta sohbetine örneğin *"Dal 1 (`dal-vitrin-sepet`) ile ürün kartını düzelt, aynı anda Dal 3 (`dal-kurye-dagitim`) ile kurye ekranına filtre ekle"* dersin.
2. Komuta Merkezi paralel yazıcıları izole çalışma alanıyla (`Workspace: "share"`) arka planda başlatır.
3. Sağdaki **`Subagents`** yan panelinde her atanmış dal için ayrı kart açılır; istersen o kartın üstüne tıklayıp doğrudan o alt-ajana ek yönerge verebilirsin.
4. İş bitince Komuta Merkezi değişiklikleri toplar, `npm run typecheck` + `npm test` + `npm run build` kapısından geçirip tek elde `git push origin main` yapar.

---

## 2. Temiz Mimari Dal Haritası (Sıfır Dosya Çakışması)

| Dal / Ajan | Dosya Sahipliği (`Yazma Kapsamı`) | Önerilen Model | Doğrulama Komutu |
| :--- | :--- | :--- | :--- |
| **`dal-vitrin-sepet`** | `src/app/{page,storefront-ui.css,urun,e,arac,hesabim,siparislerim,siparis-takip}/**`, `src/components/{storefront,cart,atelier,customer,common}/**`, `src/lib/{products,store,design,theme,format,baking,hikaye,calendar,engagement,ordering}/**`, `/api/{products,availability,track,orders/create}` | UI: **`Flash`**<br>3D/sepet/kapasite: **`Pro`** | `npm run typecheck` + `npx vitest run src/lib/ordering/ src/lib/products/ src/lib/design/ src/lib/store/ src/lib/kernel/arch.test.ts` |
| **`dal-firin-operasyon`** | `src/app/admin/{page,layout,siparisler,uretim,urunler,musteriler,ayarlar,baski}/**`, `src/components/admin/**` *(cariler/finans/studyo hariç)*, `src/lib/{production,bake,media,print,notify,settings,order,orders}/**`, `useAdminCatalog`, `useStoreSettings` | UI/tablo: **`Flash`**<br>Hamur/Z-özeti/akış: **`Pro`** | `npm run typecheck` + `npx vitest run src/lib/orders/ src/lib/production/ src/lib/settings/ src/lib/kernel/arch.test.ts src/app/api/admin/orders/` |
| **`dal-kurye-dagitim`** | `src/app/kurye/**`, `src/app/admin/{ekip,kurye}/**`, `src/components/courier/**`, `src/lib/{delivery,courier}/**`, `useCouriers.ts`, `/api/{courier,admin/team,admin/couriers,orders/claim,orders/*/deliver-b2b}/**` | Mobil UI/kart: **`Flash`**<br>Mutabakat & B2B: **`Pro`** | `npm run typecheck` + `npx vitest run src/lib/delivery/ src/app/api/orders/[id]/deliver-b2b/ src/app/api/orders/claim/ src/lib/kernel/arch.test.ts` |
| **`dal-cari-finans`** *(R6 & R7 Kilitli)* | `src/app/admin/{cariler,finans}/**`, `src/app/{fis,ekstre}/**`, `src/components/admin/{cariler,finans}/**`, `src/lib/{cari,finance}/**`, `useCariler`, `useCariProfile`, `useFinanceDashboard`, `/api/admin/{cari,finance}/**`, `/api/{slip,ekstre}/**` | Fiş/CSV/ekran: **`Flash`**<br>Defter/storno/P&L: **`Pro`** | `npm run typecheck` + `npx vitest run src/lib/kernel/arch.test.ts src/lib/cari/ src/lib/finance/ src/app/api/admin/cari/ src/app/api/admin/finance/` |
| **`dal-bilim-medya`** | `content/**`, `src/app/{bilim,kavram,kaynak,arama}/**`, `src/components/{bilim,journal,editorial}/**`, `src/lib/{knowledge,bilim,editorial}/**`, `arastirma/{bilgi_sentezi_v2,medya_hatti,ses,video_studyosu,pazarlama_lansman}/**` | FTS5/etiket/Reels: **`Flash`**<br>Kitap & `K011`: **`Pro`** | Yalnız `arastirma/`: `python -X utf8 arastirma/bilgi_sentezi_v2/araclar/paket_dogrula.py`<br>`content`/`src`: `npm run typecheck` + `npx vitest run src/app/__checks__/ src/lib/knowledge/ src/lib/bilim/` |
| **`dal-cekirdek-guvenlik`** | `src/lib/{kernel,security,supabase,auth,time,utils}/**`, `src/proxy.ts`, `src/app/{auth,admin/login}/**`, `src/types/**`, `supabase/{migrations,tests}/**`, `.github/**` | Her zaman **`Pro`** | `npm run typecheck` + tam `npm test` + `supabase/tests/*.sql` |
| **`bas-elestirmen`** *(Salt Okunur)* | Yazma yok (yalnız denetim) | **`Pro`** | Yok (okuma & birim ekonomi raporu) |
| **`studyo-dal-1..5`** *(Yerel Stüdyo)* | `/admin/studyo/**`, `src/lib/studyo/**`, `arastirma/studyo/**` (Davar, Backend API, Remotion/Gazete, S24 Kokpit, Bulut PWA) | Kendi tanımları geçerlidir | `npx vitest run src/lib/studyo src/app/api/admin/studyo` / Python testleri |

*(Not: İlk 1.000 siparişe kadar `src/components/game` ve `src/lib/game` özellik dondurması altındadır.)*

---

## 3. Hızlı Başlangıç Şablonları (Yeni Sohbette Kopyala-Yapıştır)

- **Vitrin işi (Flash):**
  > `@.agents/agents/dal-vitrin-sepet/agent.md` Sepet çekmecesindeki ürün satır boşluklarını daralt, `typecheck` ve ilgili `vitest` testlerini koş.
- **Kurye / Ekip işi (Pro):**
  > `@.agents/agents/dal-kurye-dagitim/agent.md` `src/lib/delivery/settlement.ts` tek motorunu koruyarak `/kurye` sayfasına teslim edilen nakit/POS/havale özet rozetini ekle.
- **Cari / Finans işi (Pro):**
  > `@.agents/agents/dal-cari-finans/agent.md` `R6`/`R7` mimari sınırlarını koruyarak `/admin/cariler/[id]` içine tarihe göre bakiye özeti ekle.
- **Bilim & Medya işi (Flash):**
  > `@.agents/agents/dal-bilim-medya/agent.md` `KONU-06` için FTS5'ten tam metin kanıtlarını çıkarıp `paket_dogrula.py` ile doğrula.

---

## 4. Altın Çakışma Kuralları
1. **Aynı anda aynı dosyaya iki pencereden dokunma:** Her dalın `Yazma Kapsamı` diğerinden ayrıdır; ortak çekirdek tipi (`src/types/**`, `arch.test.ts`, `apiClient.ts`) gerekiyorsa önce `dal-cekirdek-guvenlik` ile tek pencerede bitir.
2. **Paralel çalışırken `npm run build` koşma:** Next.js `.next/` klasörünü kilitler. Dallar yalnızca `npm run typecheck` + kendi `npx vitest run ...` testlerini koşar; tam `npm run build` + `git push` yalnız iş sonunda tek pencereden yapılır.
3. **Otomatik Kural Tetikleme:** Her dalın odak kuralları [`.agents/rules/`](file:///f:/ekmeklab_app/.agents/rules) altındadır (`dal-1`..`dal-6`); hangi klasörde dosya açarsan o dalın korumaları sessizce devreye girer.
