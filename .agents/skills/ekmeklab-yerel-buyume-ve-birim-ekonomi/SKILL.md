---
name: ekmeklab-yerel-buyume-ve-birim-ekonomi
description: EkmekLab Beylikdüzü yerel büyüme motoru, 30 somun/gün taş fırın kapasite ekonomisi, 0 ₺ teslimat + apartman kümeleme, B2C Ekmek+Eşlikçi sepet lifti, B2B şarküteri/kafe rutinleri ve K006 uyumlu pazarlama yürütme rehberi.
---

# EkmekLab Yerel Büyüme ve Birim Ekonomi Rehberi

EkmekLab için büyüme kararlarını, kampanya önceliklerini ve kârlılık analizlerini tek bir taş fırının fiziksel gerçekliği (**30 somun/gün** tam zamanlı üretim limiti, Beylikdüzü 11 mahalle, **0 ₺ teslimat / 0 ₺ alt sepet limiti**) üzerine kurar.

---

## 1. Tek Taş Fırın Fiziksel Gerçekliği & 30 Somun Matematiği

- **Kısıtlı Somun, Yüksek Katma Değer:** Günde 30 somun çıkarılabilen bir fırında ciroyu artırmanın üç yolu vardır:
  1. **Kapasiteyi Özel Fırın Günlerine Ayırmak:** *Kalıp Çavdar*, *Yudane Tost/Burger* gibi yüksek birim marjlı ve B2B + B2C ortak talepli ürünlerin haftalık günlerini kilitlemek.
  2. **Eşlikçi (Mandıra / Şarküteri) Sepet Lifti:** Fırın taşı 30 ekmekte dolsa da *Jersey Çiğ Sütü*, köy yumurtası, fermente sucuk, peynir, tereyağı ve günlük yufka fırın kapasitesi tüketmez (`capacity_units = 0`). 0 ₺ teslimat maliyetini tek bir siparişe 1-2 eşlikçi ekleyerek telafi et.
  3. **B2B Sabit Rutin + Kapı Önü Sıfır Sürtünme:** *Ofsüt*, *Yerumda* gibi şarküteri/kafe carilerinde haftalık sabit rutinle taban hacmi garantile; kurye elindeki fazla ekmeği araçtan sıcak satış (`hot-sale`) ile ek ciroya çevir.

---

## 2. Beylikdüzü 0 ₺ Teslimat & Apartman Kümeleme Motoru

- **Kural (`bakery_settings.operational_settings`):** `shippingFee = 0`, `freeShippingThreshold = 0`, `minBasketAmount = 0`, aktif mahalleler `Adnan Kahveci, Barış, Beykent, Büyükşehir, Cumhuriyet, Dereağzı, Gürpınar, Kavaklı, Marmara, Sahil, Yakuplu` (11 mahalle).
- **Lojistik Kaldıraç (`src/lib/delivery/maps.ts`):**
  - Aynı apartman veya siteden 2+ komşu siparişi çıktığında tek kurye durağıyla teslimat başı süre/yakıt %50+ düşer.
  - Admin dağıtım kokpitindeki mahalle & apartman küme şeridini kullanarak aynı binadaki siparişleri aynı kuryeye tek tıkla bağla.
- **Saha Kaldıracı — Kraft Paket QR Etiketi (`?etiket=1`):**
  - Şarküteri rafındaki her somun pencereli kraft kese kâğıdında taşır; üzerindeki QR müşteriyi doğrudan `https://ekmeklab.tr/?etiket=1` kapısından ilk siparişe getirir.
  - Şarküteride ekmeği alan komşu doğrudan WhatsApp sepet köprüsü veya 2 adımlı vitrinle abonelik/tekrar siparişe dönüşür.

---

## 3. Bilim + K006 (Sıfır Sağlık Beyanı) Kuralı

- **K006 Anayasası:** Vitrin, sosyal medya, kese kâğıdı gazetesi ve B2B broşürlerde *asla* "sağlıklı, şifa, iyileştirir, tedavi, önler, korur, bağırsak dostu, sindirimi kolay, kan şekeri, insülin, glisemik indeks" yazılmaz.
- **Doğru Çerçeve:** *"Hamurda, fırında ve sofrada fizikokimyasal olarak ne olur?"* — pH düşüşü, laktik asit fermantasyonu, proteoliz, nişasta jelatinizasyonu, kabuk Maillard reaksiyonu, kramb su bağlama kapasitesi.
- **Yerel Araçlar (`ekmeklab-komuta` MCP):**
  - `bilim_tam_metin_ara`: 2.541 akademik tam metin + kıvılcım kartında kanıtlı DOI/alıntı bulur.
  - `k006_saglik_beyani_denetle`: Yayına çıkacak her metni K006 ihlaline karşı denetler.
  - `tas_firin_ve_sepet_ekonomisi`: Kampanya senaryosunun fırın doluluk % ve sepet katkısını hesaplar.
  - `drive_medya_kutusu_durumu`: `G:\Drive'ım\ekmeklab_ses` altındaki ses/video havuzunu denetler.

---

## 4. Haftalık CEO Büyüme Kontrol Listesi

1. **Katalog Eksiksizliği:** Fotoğrafsız veya açıklaması eksik aktif ürün bırakma (`image_url IS NULL` vitrin dönüşümünü düşürür).
2. **Eşlikçi Çapraz Satışı:** Fırın kapasitesini yemeyen mandıra/şarküteri ürünlerinin (`Jersey Çiğ Sütü`, yumurta, sucuk, yufka) sepette tek tık önerilmesini koru.
3. **B2B Mutabakat Disiplini:** Anlaşmalı fiyat (`custom_prices`) + haftalık sabit rutin (`standing_order`) + kredi limiti radarını düzenli takip et; açık bakiyeler için admin makbuz modalından imzalı ekstre linki gönder.
4. **Dönüşüm Ölçümü (`funnel_events`):** Vitrin görüntüleme → sepete ekleme → sipariş tamamlama düşüşlerini haftalık izle; QR etiketli raf müşterilerinin dönüşümünü ayrı ölç.
