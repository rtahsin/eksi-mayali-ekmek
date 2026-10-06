# EkmekLab Sipariş Akışı Denetimi — 6 Ekim 2026

> Kapsam: sepet → bilgi → konum/teslimat → ödeme yöntemi → onay → takip/geçmiş, mobil öncelikli.
> Bu dosya bir **öneri belgesidir**; hiçbir kod değiştirilmedi. Plan tek kaynağı hâlâ `docs/YOL_HARITASI.md`; bu belgedeki "istek denetimi" kısmı o planın güncellenmesi için girdidir.

## 0. Özet

**Ana hüküm:** Sipariş akışının **arka ucu sağlam** (fiyat sunucuda, atomik RPC, idempotency, hız sınırı, hard-fail, imzalı takip, maskeli takip). Sorun **ön yüzde, ekonomide ve edinim yolunda**. Yeniden yazmaya gerek yok; sepet çekmecesi onarılmalı.

**En önemli 5 hata/sürtünme**
1. Sabit alt panel 375×812 ekranda **303 px = %37** yer tutuyor; üç sipariş düğmesi forma bakmadan görünüyor, hata mesajı **tek tek** ve tek satırda geliyor (#1).
2. Tüm girdiler **12 px** → iOS Safari odaklanınca sayfayı yakınlaştırır (#2).
3. Çekmece açılınca tarayıcı geçmişine kayıt eklenmiyor → telefonun **Geri tuşu siteden çıkarır** (#3).
4. Onay kutusu açık renkli çekmecede **koyu dolu kare** çiziliyor; işaretli mi değil mi anlaşılmıyor (#2).
5. Ham teknik hata metni müşteriye gösterilebiliyor: `create/route.ts:415-418` (#5).

**En önemli 5 fırsat**
1. **Teslimat ücreti 150 ₺, 145 ₺'lik ekmeğe biniyor** (tek ekmek = 295 ₺). Bu kod değil, iş kararı (#6).
2. QR iniş sayfası yok (`/e/<slug>` 404) ve ürün sayfasında "Sepete ekle" ilk ekranda değil (#7).
3. Hiç ölçüm yok: QR taraması, sepet açma, sipariş sayısı bilinmiyor (#8).
4. "İlk sipariş" bayrağı + kapasite ayarı: sahte siparişe karşı en ucuz koruma (#9).
5. Konum paylaşımının görünür rıza satırı yok; KVKK sayfası artık olmayan "canlı takip"i anlatıyor (#10).

**3 "yapma":** WhatsApp Business API / SMS doğrulama, zorunlu harita iğnesi, canlı sipariş takibi. Gerekçeler §7'de.

**Stratejik itiraz (kısa):** Doğrudan müşteri trafiği bugün ≈ 0 ve etiket+QR henüz basılmadı. Bu yüzden sürtünme cilası bir **bütçe sınırına** tabi: P0 paketi (1-2 gün) QR'dan gelen ilk ziyaretçiyi yakmamak için yeterli; geri kalanı ancak **bir ay gerçek veri** sonra. Tekrar sipariş, abonelik, Telegram düğmeleri şimdi yapılırsa erken optimizasyon olur.

---

## 1. Yöntem ve sınırlar (dürüst not)

- **Çok ajanlı denetim iki kez kullanım sınırına çarptı** (21 ajan, ~3 milyon token yandı, sıfır sonuç). Bu belgedeki her bulgu bu yüzden **tek geçişte, benim tarafımdan** koddan okunarak ya da canlı gözlemle çıkarıldı; bağımsız doğrulayıcı katman **yok**.
- Etiketler: `[kod]` dosya:satır okundu · `[canlı]` 375×812 mobil görünümde ölçüldü · `[kaynak]` web kaynağı · `[mantık]` çıkarım · `[tahmin]` benim maliyet/etki tahminim.
- **Okunanlar:** `CartDrawer`, `CheckoutActions`, `useCartStore`, `createOrder`, `api/orders/create`, `OrderSuccessModal`, `useStoreSettings`, `deviceOrders`, `availability.ts`, `MobileCartBar`, `siparis-takip/[id]`, `api/orders/[id]`, `.../cancel`, `telegram.ts`, `normalize.ts`, admin sipariş detayı (grep ile), yasal sayfalar (grep ile).
- **Okunmayanlar:** `create_order_atomic` SQL gövdesi (014/015/018), `claim` rotası, `/hesabim/siparisler`, `useOrderHistory`, admin "Bugün", paket/performans analizi, gerçek cihaz, Instagram uygulama içi tarayıcı.
- **Canlı tur** 3000 portundaki **başka bir sohbetin dev sunucusunda** yapıldı (hangi dal olduğunu doğrulamadım); `/api/settings` ve `/api/availability` değerleri o sunucunun bağlı olduğu veritabanından geldi (büyük olasılıkla canlı). Sipariş **gönderilmedi**; yalnız boş formla istemci doğrulaması denendi.
- Hukuki maddeler **hukuki görüş değildir**; "avukat/mali müşavir teyit etsin" notu taşır.
- Maliyetler `[tahmin]`: tek geliştirici-günü, test dahil.

---

## 2. İsteklerin denetimi

Denetlenen "istekler": bu görevdeki mesajın hedefi ve akış sırası; `YOL_HARITASI.md` §2/§8 kararları; `AGENTS.md` kuralları.

| # | İstek / karar | Hüküm | Kanıt | Öneri |
|---|---|---|---|---|
| 1 | Akış "sepet → bilgi → konum/teslimat → **ödeme yöntemi** → **onay** → takip/geçmiş" (6 adım) | **Yanlış çerçeve** | `[kod]` Bugün tek çekmece; ödeme yöntemi ile onay **aynı dokunuş** (3 buton, `CheckoutActions.tsx:147-189`); tarih ürünle, konum adresle iç içe | Altı adım yerine **üç blok, tek ekran**: Ne zaman / Nereye / Özet+Onay. "Ödeme yöntemi" ayrı adım olmasın, özetin içinde 2 seçenek olsun |
| 2 | "Mobil öncelikli, **en az sürtünmeli ve güvenilir**" | **Çelişkili ikili** | `[mantık]` Güvenilirlik araçları (onay kutusu, konum, telefon doğrulama, harita iğnesi) hep müşteriye iş yükler | Güvenilirliği **müşteriden operatöre** kaydır: sipariş akışına alan ekleme, Tahsin'in ilk siparişte telefonla teyidini kolaylaştır (#9) |
| 3 | "Sipariş takibi/**geçmişi**" | **Takip geçerli, geçmiş erken** | `[kod]` Takip sayfası tam (`siparis-takip/[id]/page.tsx`); geçmiş için iki paralel yüzey var, "tekrar sipariş" yok; trafik yok (`YOL_HARITASI.md` §1) | Geçmişe yatırım yapma; tekrar sipariş ancak tekrar eden müşteri görünce (#14) |
| 4 | §8 Faz 1 varsayılanı: ücretsiz eşik **1000 ₺**, altında **150 ₺** | **Yanlış kalibre** | `[canlı]` `/api/settings`: 150 / 1000; ürünler 95–320 ₺; vitrinde "1.000 ₺ üzeri ücretsiz · altında 150 ₺" | Bu Tahsin'in iş kararı; ama "tek ekmek = %103 teslimat zammı" bilinçli mi? (#6) |
| 5 | §8 adres seçeneği (4) "ilk sipariş yalnız kapıda ödeme" | **Eski** | `[kod]` Online ödeme yok; **zaten bütün siparişler kapıda** | Listeden çıkar |
| 6 | §8 seçenek (1) "haritada iğne zorunlu" | **Yanlış** | `[kod]` `lat/lng` zaten isteğe bağlı ve **işe yarıyor** (admin sipariş detayında yol tarifi `siparisler/[id]/page.tsx:173`, kuryede navigasyon `CourierActiveStopCard.tsx:26`). Eski dalda "harita zorunluluğunu kaldır" commit'i var (`24c0aab`, yalnız başlığını okudum) | Zorunlu yapma; isteğe bağlı kalsın ama **görünür** olsun (#10) |
| 7 | §8 seçenek (2) yapılandırılmış adres, (3) WhatsApp doğrulama, (5) otomatik engel | **Erken / pahalı** | `[mantık]` Telefon zaten zorunlu ve Tahsin kendi teslim ediyor; hacim yok | (3) yerine ilk sipariş teyidi (#9); diğerleri veri gelince |
| 8 | `AGENTS.md` §3: takipte "tek tıkla arama / WhatsApp / **navigasyon**" | **Kısmen uygulanmış, kural eski** | `[kod]` `siparis-takip/[id]/page.tsx:305-318` arama + WhatsApp var; müşteriye navigasyon anlamsız | Kuralı "arama/WhatsApp" olarak daralt |
| 9 | `AGENTS.md` §3: "büyük butonlar, yüksek kontrast, tek elle" | **Sepette uygulanmamış** | `[kod]` `CartDrawer.tsx`: 18× `text-[10px]`, 9× `text-[11px]`; girdiler 12 px; `[canlı]` ana CTA kontrastı 4.23:1 (<4.5), `espresso-muted` yardımcı metin 3.98:1 | #2 |
| 10 | KVKK sayfası: "Canlı Konum Paylaşımı… canlı takip… doğruluk mesafesi" | **Eski** | `[kod]` `kvkk/page.tsx:80,94`; GPS yayını Faz 3a-2'de kaldırıldı, yalnız tek seferlik lat/lng saklanıyor | Metni gerçeğe uydur (#10) |
| 11 | Roadmap: Telegram mesajında kişisel veri yok | **Geçerli** ama bedeli var | `[kod]` `telegram.ts:32-39`: yalnız mahalle/ürün/tutar; adres/telefon için admin'e girmek gerekiyor | Koru; PII'siz **"ilk sipariş" bayrağı** ekle (#9) |
| 12 | "WhatsApp'ta anlaşma" bir ödeme yöntemi olarak üçüncü buton | **Yanlış kategori** | `[kod]` `CheckoutActions.tsx:177-189`: bu bir **iletişim kanalı**, ödeme yöntemi değil | Ödeme: 2 seçenek; "WhatsApp'a yaz" ikincil bağlantı |
| 13 | §2 müşteri girişi: Google + misafir, e-posta kodu kapalı | **Geçerli** | `[kod]` `AuthModal.tsx:14,157` bayrakla gizli; başarı modalında "hesabına kaydet" teklifi var | Değiştirme |

**Çelişki:** `AGENTS.md` "mobil ergonomi" kuralı ↔ mevcut sepet (satır 9). **Eskimiş belgeler:** `docs/UX_REVIEW.md`, `CHECKOUT_RELIABILITY_SCOPE.md` Flutter dönemine ait; kimse okumasın (Faz 5'te arşivlenecek).

---

## 3. Bugünkü akış ve korunacaklar

**Akış `[kod][canlı]`:** vitrin (2 sütun kart, "+" ile ekle) → alt sepet barı ("145 ₺ · Ücretsiz teslimata 855 ₺ kaldı · Sepete Git") → sepet çekmecesi (ilerleme çubuğu, teslimat kutusu, **tarih çipleri**, ürünler, öneriler, form: ad/telefon/mahalle/adres/not, "Konumumu ekle") → sabit alt panel (toplam, onay kutusu, **Kapıda Nakit / Kapıda Kart / WhatsApp'ta konuşalım**) → `POST /api/orders/create` → başarı modalı (sipariş no, teslim, ödeme, toplam, WhatsApp, takip, "hesabına kaydet") → `/siparis-takip/<no>?t=<token>` ve `/siparislerim` (cihaz hafızası).

**Korunacaklar (kanıtlı iyi kararlar):**
- Fiyat, ücret, ürün durumu **yalnız sunucuda** (`create/route.ts:226-280`); istemci fiyatına güvenilmiyor.
- Zod şeması, mahalle listesi sunucuda doğrulanıyor, 10/IP + 5/telefon hız sınırı **veritabanında** (`rateLimiter.ts`), idempotency anahtarı, RPC hatasında **hard-fail** (AGENTS.md uyumlu).
- Tarih/kapasite için tek kaynak (`availability.ts`), tarih listesi sepete göre yeniden hesaplanıyor (250 ms debounce, `useStoreSettings.ts:84-91`) ve 409'da tazeleniyor.
- Takipte kişisel veri maskeli, imzalı token + telefonun son 4 hanesi, iptal yarışına karşı `STATUS_CHANGED` (`cancel/route.ts:134-140`).
- Ürün sayfasında "Hemen Sipariş Ver & Sepeti İncele" yolu var `[canlı]`; sepet barı ücretsiz teslimat ilerlemesini gösteriyor.
- Tarih çiplerinde pasif günün nedeni **listeleniyor** (`CartDrawer.tsx:311-317`) — "neden yalnız title'da" hipotezim kısmen yanlıştı.
- Lat/lng gerçekten kullanılıyor (admin + kurye navigasyonu).

---

## 4. Fikirler ve bulgular (öncelik sırasıyla)

Etiket sırası: **Ne / Neden / Etki / Maliyet / Risk.** Doğrulama her fikirde sonda.

### P0 — bu hafta (toplam ≈ 2 gün), QR basılmadan önce şart

**#1 Sipariş panelini sadeleştir: tek CTA, hepsi birden inline hata** `[kod][canlı]`
- **Ne:** (a) Üç butonu **tek birincil buton** yap: "Siparişi onayla · 295 ₺", altında tek satır "Sipariş vermek ödeme yükümlülüğü doğurur; ödeme kapıda". (b) Ödeme yöntemi (Nakit/Kart) formun içinde 2'li seçim; "WhatsApp'a yaz" ikincil bağlantı. (c) Onay metni tek satıra insin. (d) `validateForm` **tüm hataları aynı anda** döndürsün, ilgili alanın altında göstersin ve ilk hatalı alana kaydırıp odaklasın. (e) Telefon doğrulamasını sunucuyla aynı fonksiyonla yap (`CheckoutActions.tsx:55` ≥10 hane; sunucu `05XXXXXXXXX` ister, `create/route.ts:97-102`) — şimdi 212'li sabit numara istemciden geçip sunucuda 400 yiyor.
- **Neden:** `[canlı]` 375×812'de alt panel 303 px, kaydırılan gövde 431 px; hata çıkınca panel 54 px daha büyüyor. Boş formda "Lütfen ad ve soyadınızı giriniz" çıkıyor ve **yalnız ilk** sorunu söylüyor (`CheckoutActions.tsx:51-63`): telefon, mahalle, adres, onay için ayrı ayrı basmak gerekir. Klavye açılınca gövdede neredeyse hiçbir şey kalmaz `[mantık]`. Düğmeler "sipariş ver" demiyor; Mesafeli Sözleşmeler Yönetmeliği Madde 8'e göre tüketici, **siparişi onaylamadan hemen önce** ödeme yükümlülüğü hakkında açıkça bilgilendirilmeli, aksi halde siparişe bağlı olmayabilir `[kaynak]` ([mevzuat.gov.tr](https://mevzuat.gov.tr/File/GeneratePdf?mevzuatNo=20237&mevzuatTur=KurumVeKurulusYonetmeligi&mevzuatTertip=5), [Resmî Gazete 2014](https://resmigazete.gov.tr/eskiler/2014/11/20141127-6.htm); madde metnini arama özetinden aldım, tam metni açıp doğrulamadım; ibarenin tam sözcüklerini avukat teyit etsin).
- **Etki:** mobil tamamlama oranı için tek en büyük kaldıraç; sayı veremem (ölçüm yok). Tahsin'in iş yükü değişmez.
- **Maliyet:** 1–1,5 gün. Backend aynı kalır (`paymentMethod` enum'u değişmiyor).
- **Risk:** düşük (yalnız UI). `CheckoutActions` için vitest yok; telefon fonksiyonunu `src/lib` içine alıp teste bağla.
- **Doğrulama:** 375×667'de klavye açıkken tüm alanlara ulaşılıyor; boş forma basınca her eksik alan işaretli ve sayfa ilkine kayıyor.

**#2 Form hijyeni paketi** `[canlı][kod][kaynak]`
- **Ne:** girdiler ≥16 px; onay kutusu için `color-scheme: light` ya da özel kutu; `enterKeyHint`, mahalle için `autoComplete="address-level3"`; çekmece alt panelinde `env(safe-area-inset-bottom)`; ana CTA için `terracotta-dark` (beyaz üstünde 5,31:1; şimdiki `terracotta` 4,23:1); `text-espresso-muted` yardımcı metni `espresso-wheat` yap (3,98 → 7,40:1); 10 px etiketleri 12 px'e çıkar.
- **Neden:** `[canlı]` 6 girdinin hepsi 12 px; iOS Safari 16 px altı girdide odak zoom'u yapar `[kaynak]` ([guidefari](https://guidefari.com/safari-ios-input-zoom/), [Rick Strahl](https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Textbox-Auto-Zooming-and-ViewPort-Sizing)). Onay kutusu `checked=false` iken koyu dolu kare çiziliyor (`color-scheme: dark`, açık zeminde). `viewport-fit=cover` var ama çekmece altında safe-area yok (`git grep safe-area` yalnız `MobileCartBar` ve admin nav).
- **Etki:** iOS'ta forma dokununca sayfanın zıplamaması; durumu okunur kutu. Orta.
- **Maliyet:** 0,5 gün. **Risk:** form yoğunluğu artar, düzen kayar; ekran görüntüsüyle bak.

**#3 Geri tuşu çekmeceyi/başarı modalını kapatsın** `[kod][canlı]`
- **Ne:** çekmece açılınca `history.pushState`, `popstate`'te kapat; modal için aynısı.
- **Neden:** `[canlı]` çekmece açıkken `history.length = 1`; `git grep pushState|popstate -- src` boş. Geri tuşu müşteriyi önceki sayfaya (Instagram/WhatsApp) atar.
- **Etki:** Instagram/WhatsApp'tan gelenlerde sipariş terkini azaltır `[mantık]`. **Maliyet:** 0,5 gün. **Risk:** geçmiş dizisi hataları (çift kayıt); iOS'ta test.

**#4 `Mah.` temizleme regex'i bozuk** `[kod][node testi]`
- **Ne:** `CartDrawer.tsx:134` `/s+Mah(.|allesi)?$/i` → `\s` ve `\.` eksik. `stripMah` zaten `useCartStore.ts:82`'de ve sunucuda `normalizeNeighborhood` var; ortak fonksiyona al.
- **Neden:** Node'da "Barış Mah.", "Barış Mahallesi", "Adnan Kahveci Mah" **değişmeden** döndü. Sonuç: "Bu adresi kaydet" teklifi kayıtlı adres zaten varken yine çıkar ve kayıt yinelenir. Etki alanı, adreslerin başka yerde "Mah." ile kaydedilmesine bağlı (bu akıştan kaydedilenler "Barış" olarak yazılıyor, `CartDrawer.tsx:141-146`); kapsamını doğrulamadım.
- **Etki:** küçük. **Maliyet:** 0,1 gün + vitest. **Risk:** yok.

**#5 Müşteriye ham hata metni gitmesin** `[kod]`
- **Ne:** `create/route.ts:415-418` `getErrorMessage(error)` yerine sabit Türkçe mesaj; ayrıntı yalnız Sentry'ye.
- **Neden:** `rateLimiter.ts:40-47` `RATE_LIMITER_UNAVAILABLE` / `RATE_LIMIT_CHECK_FAILED: <supabase hata metni>` fırlatır; bu `try` içinde olduğundan metin 500 yanıtında olduğu gibi çıkar ve çekmecede kırmızı kutuda görünür. Aynı kalıp `[id]/route.ts:159-161` ve `cancel/route.ts:157-159`'da da var.
- **Etki:** nadir ama güveni kıran an. **Maliyet:** 0,25 gün. **Risk:** yok (hard-fail davranışı korunur).

**#6 Teslimat ücreti kararı (Tahsin'e)** `[canlı]`
- **Ne:** 150 ₺ / 1000 ₺ eşiği gözden geçir. Kodsuz seçenekler: eşiği 300–400 ₺'ye çek; ya da 150 ₺'yi bilinçli tutup **paket** ürünü (örn. "Haftalık: 3 köy ekmeği + tereyağı") tanımla (015'te `bundle_items` var); ya da ilk sipariş ücretsiz (QR kampanyası).
- **Neden:** `[canlı]` vitrin metni "1.000 ₺ üzeri ücretsiz · altında 150 ₺"; köy ekmeği 150 ₺, karakılçık 145 ₺. Tek ekmek siparişi **295 ₺**. Eşik ≈ 7 ekmek. Bu, kapıdan satışta en sert fiyat engelidir `[mantık]`; tek kişilik teslimat maliyeti (yakıt, zaman) gerçek, o yüzden karar Tahsin'in.
- **Etki:** tek ürünlü siparişleri açıp kapatır; **ben kestiremem**. **Maliyet:** 0 (admin ayarı) / paket tanımı 0,25 gün. **Risk:** marj.

### P1 — QR etiketleri basılmadan önce

**#7 QR iniş yolu ve mobil ürün sayfası** `[canlı]`
- **Ne:** `/e/<slug>` → ürün sayfasına yönlendir ve `?n=<kod>`'u saklayıcıya yaz; ürün sayfasında **yapışkan "Evine getirelim · 145 ₺" çubuğu**; ilk ekranı 510 px görsel ve 3 güven kutusu tüketmesin.
- **Neden:** `[canlı]` `/e/koy-ekmegi` → 404. Ürün sayfasında fiyat ilk ekranın altında (~740 px), "Sepete Ekle" ilk ekranda görünmüyor, kaydırmak gerekiyor. Etiket projesinin tek anlamı bu yol (`project-state` notu).
- **Etki:** edinim yolunun tamamı buna bağlı; sayı veremem. **Maliyet:** 1–1,5 gün. **Risk:** düşük; sunucu tarafı `ref` işlemi yoksa #8 ile birlikte yap.

**#8 En küçük ölçüm** `[kod][mantık]`
- **Ne:** `funnel_events(event, ref, day, order_id?)` tablosu; 5 olay: `scan` (iniş), `cart_open`, `checkout_start` (ilk alan odağı), `order_ok`, `order_error(code)`. Kişisel veri yok. Sentry'de sipariş-5xx için Tahsin'e uyarı kuralı (kodsuz) açık mı kontrol et.
- **Neden:** `package.json`'da analitik bağımlılığı yok, `git grep gtag|plausible|posthog` boş; yalnız Sentry var. K1 olayında siparişler günlerce görünmez kalmıştı (`YOL_HARITASI.md` §3).
- **Etki:** "çalışıyor mu" sorusunu cevaplar; ay sonunda hangi P2'nin gerektiğini söyler. **Maliyet:** 0,5–1 gün. **Risk:** düşük; **ekleyici migration, uygulamadan ÖNCE** (`create_order_atomic`'e dokunma; `ref`'i ayrı olay satırıyla bağla). 019/020 Faz 4'e ayrılı, bir sonraki boş numarayı kullan, `app_migrations` + `supabase/tests` kuralı geçerli.

**#9 İlk sipariş bayrağı + kapasite** `[kod][canlı]`
- **Ne:** (a) Sipariş kaydından önce `orders` içinde bu telefon var mı bak; Telegram mesajına PII'siz `🆕 İlk sipariş (teyit et)` ekle. (b) Admin ayarında `dailyBreadCapacity` belirle.
- **Neden:** telefon doğrulanmıyor; tek koruma 10/IP + 5/telefon (`create/route.ts:157,221`), 10 dk'da 10 sahte sipariş geçer. `[canlı]` `/api/availability` bugün dahil 8 günün hepsini `remainingCapacity: null` döndürüyor: sınırsız sipariş. Kapasite konunca bekleyen siparişler kapasiteden düşer (`availability.ts:19-20,123`: iptal hariç tüm rezervasyonlar kullanılan kapasiteye sayılır) — sahte sipariş kapasite kilitleyebilir; ilk sipariş teyidi bunu da kapatır.
- **Etki:** boş adrese ekmek götürme riskini ucuza azaltır. **Maliyet:** (a) 0,5 gün, (b) 0. **Risk:** düşük.

**#10 Konum rızası ve KVKK metni** `[kod]`
- **Ne:** "Konumumu ekle" altına **görünür** tek satır ("Yalnızca kapını bulmak için kuryeye gösterilir"); düğmeyi 10 px'ten büyüt; `kvkk/page.tsx:80,94` metnini gerçek davranışa uydur (canlı takip yok, doğruluk mesafesi saklanmıyor); **saklama/silme süresini doğrula** (`customer_locations` temizliği var ama `orders.customer_lat/lng` silinmiyor olabilir — doğrulamadım).
- **Neden:** rıza metni yalnız `title` özniteliğinde (`CartDrawer.tsx:553`), mobilde görünmez; `locationConsentAt` tıklamayla yazılıyor.
- **Etki:** hukuki risk + güven. **Maliyet:** 0,5 gün + avukat. **Risk:** metin değişince `TERMS_VERSION` artırılmalı (`src/lib/legal.ts`).

**#11 Yasal ve güven paketi (avukat/Tarım Müdürlüğü)** `[kod][canlı] doğrulanmadı`
- **Ne:** (a) Tek onay kutusunda "Mesafeli Satış + KVKK **onaylıyorum**" (`CheckoutActions.tsx:117-138`) → aydınlatma bilgilendirme olarak ayrı, kutu yalnız sözleşme için (aydınlatmanın onay gerektirmediğine dair genel bilgi; teyit gerekli). (b) Ürün sayfalarında **içerik/alerjen bilgisi yok** (`git grep alerjen|içindekiler` boş) — uzaktan satışta ne zorunlu, teyit et. (c) `ProductModal.tsx:225` sağlık çağrışımlı cümle ("gluten kısmen parçalanır… daha rahat tolere") sipariş yüzeyinde; bellek notu "sağlık iddiası kartlara konmaz". (d) Ana sayfada "MAYA: 8 YILLIK CANLI" (Tahsin sitede yazmasını **istemedi**), "SOĞUK MAYALAMA: 36 SAAT" (Tahsin'in doğruladığı bilgi: bir ekmek ~24 saatte yapılır; 36 saat onaylanmış bir rakam değil) ve ürün sayfasında "36 Saat", "%100 Temiz Sıfır Katkı". (e) Vitrinde "Jersey **Çiğ** Sütü (3 Litre)" ve peynir/yoğurt/kavurma satışı: işletme kaydı/etiket/çiğ süt kuralları için Tarım Müdürlüğü'ne **soru**; ben kural iddia etmiyorum.
- **Neden:** güven kırıcı, doğrulanamayan iddialar ilk kez gelen ziyaretçide ters tepki doğurur `[mantık]`; sıralı metin düzeltmeleri ucuz.
- **Etki:** yasal risk + marka tutarlılığı. **Maliyet:** (c)(d) 0,25 gün; (a)(b)(e) avukat/müdürlük. **Risk:** metin sürümü.

**#12 `sanitizeInput` kesme işaretini siliyor** `[kod]`
- **Ne:** `rateLimiter.ts:56` `[<>'"`;]` karakterlerini siliyor; ad, adres ve notta uygulanıyor (`create/route.ts:286-288`). React çıktıyı zaten kaçırıyor; yalnız kontrol karakterlerini ve HTML etiketini at.
- **Neden:** "Ali'nin Sk." → "Alinin Sk.", "Kapıya asın; zil bozuk" → noktalı virgül kaybı. Kuryenin okuduğu adres bozuluyor.
- **Etki:** küçük ama sessiz veri bozulması. **Maliyet:** 0,25 gün + vitest. **Risk:** düşük (React kaçışı geçerli; başka tüketici — Telegram/CSV — metni nasıl kullanıyor, bak).

### P2 — bir ay veri gelince

**#13 Müşteri takibinde 5 aşama → 3** `[kod][mantık]`: `ORDER_STATUS_FLOW` (`normalize.ts:7`) 5 durum; Tahsin elle günceller. Atlanırsa müşteri "Sipariş alındı"da kalır. Göster: Alındı · Hazırlanıyor (hazirlaniyor+firinda) · Yolda · Teslim. 0,25 gün; risk yok.

**#14 Tekrar sipariş** `[kod]`: müşteri tarafında yok (`git grep` yalnız kurye ekranında "Reorder"). `/api/orders/[id]` kalemlerde `productId` döndürmüyor (`route.ts:132-137`); yetkili görünüme eklenmeli. 1 gün. Yalnız tekrar eden müşteri görülürse.

**#15 Idempotency anahtarı gövdeye bağlı olsun** `[kod]`: anahtar yalnız sepet imzasına bağlı (`CheckoutActions.tsx:44-49`), sunucu anahtar bulunca **gövdeyi karşılaştırmadan** eski siparişi döner (`create/route.ts:175-189`). Ağ koptu → sipariş aslında oluştu → müşteri adres/ödeme düzeltip yeniden bastı → eski sipariş "başarı" diye gösterilir. Dar senaryo. Anahtara `customerInfo+paymentMethod` özeti kat: 0,25 gün. SQL v3'ü okumadım.

**#16 Telegram'dan tek dokunuşla "Kabul"** `[mantık]`: satır içi düğme + webhook; PII'siz kalır. 1,5 gün + gizli anahtar. Önce Tahsin'in admin'e girme sürtünmesini ölç.

**#17 Teslim penceresi** `[canlı]`: 14:00–18:00 dört saat. Slot yapma; **"yola çıkarken yazacağım"** satırı + admin'de hazır "Yolda" WhatsApp metni (admin detayda `handleShareWhatsApp` var, `siparisler/[id]/page.tsx:142`; içeriğini doğrulamadım). 0,25 gün.

**#18 Küçükler:** `/api/settings` ve `/api/products` sayfa yüklemede **ikişer kez** çağrılıyor `[canlı]` (paylaşılan önbellek); sepette "Bu cihazdan bilgilerimi sil" bağlantısı (`customerInfo` localStorage'da kalıcı `[canlı]`; tekrar sipariş için yararlı, ortak cihazda riskli). 0,5 gün.

**Bekleyen ama şimdi dokunma:** sepet açık zeminli (linen), vitrin ve takip koyu; Faz 4 krem tasarımla çözülecek, ayrı iş açma.

---

## 5. Sıfırdan yapsaydım

**Tez:** *Tek ekran, ürün sayfasından başlayan, 60 saniyelik, doğrulamayı operatöre yaslayan sipariş.*

1. **Giriş:** QR → `/e/<slug>` = ürün sayfası, yapışkan "Evine getirelim · 145 ₺". İlk ekranda fiyat + tek CTA.
2. **Tek sayfa sipariş (alt sayfa):** üç blok.
   - *Ne zaman:* en erken uygun gün **önceden seçili**; yalnız birden fazla gün varsa çipler. Satış penceresi olan ürünlerde ("Gece Yarısı") etiket: "Cumartesi teslim · son sipariş Perşembe 20:00 · 14 adet kaldı".
   - *Nereye:* **önce telefon**, sonra ad, mahalle (seçim), açık adres, isteğe bağlı "Konumumu kullan" + görünür rıza satırı. Cihaz hafızasından otomatik dolar.
   - *Özet:* ürünler (adet düzenlenebilir), teslimat ücreti, toplam; ödeme **2 seçenek** (kapıda nakit / kapıda kart); "WhatsApp'a yazmak istiyorum" ikincil bağlantı.
3. **Tek CTA:** "Siparişi onayla · 295 ₺" + ödeme yükümlülüğü satırı + sözleşme bağlantıları. Tüm hatalar alan altında, hepsi birden.
4. **Onay:** sayfa, modal değil: sipariş no, teslim, "takip linkini WhatsApp'a gönder", ara/WhatsApp tek dokunuş, "hesabına kaydet".
5. **Operatör (Tahsin):** Telegram'da PII'siz mesaj + "🆕 ilk sipariş" bayrağı; kabul tek dokunuş (webhook, sonra); durum **3 aşama**; kapasite ve "sipariş almayı kapat" telefondan.
6. **Ekonomi:** teslimat ücreti sepet bazlı kademeli + paketler; ilk sipariş kampanyası ayardan.
7. **Ölçüm:** 5 olay, `ref` kaynak kodu, kişisel veri yok.
8. **Bilerek yok:** zorunlu üyelik, online ödeme, SMS doğrulama, harita iğnesi zorunluluğu, canlı takip, WhatsApp Business API, 5 aşamalı zaman çizelgesi.

**Neden bu:** ilk kez gelen kişi (QR) sipariş için fazla alan, adım ve belirsizlikle karşılaşmamalı; güvenilirlik müşteriden değil operatörden gelsin (Tahsin gerektiğinde telefon açabiliyor ve teslimatı kendisi yapıyor). Hacim düşük olduğu için ek altyapı (SMS, API, rol) maliyeti getirisini aşar `[mantık]`.

---

## 6. Fark ve geçiş maliyeti

| Alan | Bugün | İdeal | Değişim | Maliyet `[tahmin]` | Migration |
|---|---|---|---|---|---|
| Alt panel + 3 buton | 303 px, 3 düğme | tek CTA, 2'li ödeme | değiştir | 1–1,5 g | yok |
| Doğrulama | ilk hata, panelde | hepsi, alan altında | değiştir | (yukarıdakine dahil) | yok |
| Form hijyeni (16 px, kutu, safe-area, kontrast) | 12 px, koyu kutu | okunur, zoom'suz | değiştir | 0,5 g | yok |
| Geri tuşu | siteden çıkar | çekmeceyi kapatır | ekle | 0,5 g | yok |
| Ürün sayfası / QR | `/e/` 404, CTA 1,1 ekran aşağıda | `/e/<slug>`, yapışkan CTA | ekle | 1–1,5 g | yok |
| Ölçüm | yok | 5 olay | ekle | 0,5–1 g | **ekleyici tablo, uygulamadan ÖNCE** |
| İlk sipariş bayrağı | yok | Telegram'da | ekle | 0,5 g | yok |
| Konum rızası + KVKK | `title` içinde | görünür satır | değiştir | 0,5 g + avukat | yok (+ `TERMS_VERSION`) |
| Zaman çizelgesi | 5 aşama | 3 aşama | değiştir | 0,25 g | yok |
| Tekrar sipariş | yok | tek dokunuş | ekle | 1 g | yok |
| Başarı **modalı → sayfa** | modal | sayfa | — | 1 g | yok |
| Telegram düğmeleri | yok | kabul | ekle | 1,5 g | yok |

**Toplam:** P0 ≈ 2–2,5 gün; P0+P1 ≈ 5–6,5 gün; tam ideal ≈ 10–12 gün.
**Yayın sırası (`YOL_HARITASI.md` §7):** önce ekleyici migration (`funnel_events`), sonra uygulama; geri kalanı migration'sız.
**Taşıma:** başarı modalını sayfaya çevirme (modal çalışıyor, değer az), hesap/cihaz hafızası yapısı (iyi), atomik RPC ve hız sınırı (dokunma).
**Dürüst hüküm:** geçiş "yeniden yazmak" değil; mevcut çekmeceyi 5–6 günde ideale yaklaştırmak mümkün. Hacim görmeden P2'ye girme.

---

## 7. Yapma listesi

- **WhatsApp Business API / SMS doğrulama:** şablon onayı, konuşma/mesaj ücreti ve iş yükü getirir; hacim yok `[mantık]`. Yerine ilk sipariş teyidi (#9) ve admin'deki hazır WhatsApp metni.
- **Zorunlu harita iğnesi:** zaten isteğe bağlı konum işe yarıyor; zorunluluk sürtünme (eski dal bunu kaldırmıştı).
- **Canlı sipariş takibi / kurye GPS:** Faz 3a-2'de bilerek kaldırıldı; KVKK yükü.
- **Yapılandırılmış adres alanları:** telefon + Tahsin'in kendi teslimatı varken marjinal.
- **Otomatik engelleme/itibar puanı, A/B test:** trafik yok.
- **Abonelik/haftalık otomatik sipariş:** önce tekrar eden müşteri var mı görülsün; "Gece Yarısı" için sipariş penceresi etiketi yeter.
- **Başarı modalını sayfaya çevirmek:** değeri düşük.
- **Sepet temasını şimdi uydurmak:** Faz 4 ile gelir.

---

## 8. Tahsin'e açık sorular

1. 150 ₺ teslimat ücreti ve 1000 ₺ eşiği **bilinçli mi**? Tek ekmek siparişi 295 ₺ oluyor (#6).
2. Günlük kapasite kaç ekmek? Admin'de `dailyBreadCapacity` boş; bugün dahil 8 gün sınırsız sipariş alıyor (#9).
3. Yeni gelen müşteriyi **sen mi arayacaksın** (ilk sipariş teyidi) yoksa sadece bayrak yeterli mi?
4. Ana sayfadaki "MAYA: 8 YILLIK CANLI" ve "36 saat" ifadelerini kaldıralım mı? (Bellek: maya yaşını sitede yazmamamı istemiştin; bir ekmeğin ~24 saatte yapıldığını söylemiştin, 36 saatin neyi ölçtüğünü bilmiyorum.)
5. Çiğ süt, peynir, yoğurt, kavurma: işletme kaydı/izni konusunda Tarım Müdürlüğü'ne **sen mi** soracaksın? Ben kural iddia etmiyorum.

---

## 9. Ek: çürüyen / zayıflayan hipotezlerim

- "Pasif tarih nedeni yalnız `title`'da": **kısmen yanlış**; ilk 3 neden listeleniyor (`CartDrawer.tsx:311-317`).
- "Takip bağlantısı yalnız modalda kalır": **zayıf**; `Siparişlerim`, "Linki kopyala" ve WhatsApp mesajı (işletmeye giden metne link konuyor) var; kaybolan link için telefon son 4 hane yolu da var.
- "Lat/lng kullanılmıyor": **yanlış**; admin ve kurye navigasyonu kullanıyor.
- "Tek ürünlü hızlı sipariş yok": **yanlış**; ürün sayfasında "Hemen Sipariş Ver" var.
- Kapsam dışı kalanlar için §1.
