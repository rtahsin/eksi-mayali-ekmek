# EkmekLab — Tek Kaynaklı Bilim, Kese Kâğıdı ve S24 Çekim El Kitabı

> **Amaç:** 1.500 makalelik dev arşivi, dağınık klasörleri ve ayrı telden çalan web/video taslaklarını **tek bir pratik ürüne** indirmek. Artık web makalesi, kese kâğıdı özeti ve 45 saniyelik S24 Reels senaryosu **aynı sayfanın içindedir**.

---

## 1. Dağınıklık Nasıl Çözüldü? (Tek Huni Mimarisi)

Önceden 5 ayrı yerde duran parçalar tek bir canlı vitrin çatısında birleştirildi:

1. **Canlı Vitrin (`ekmeklab.tr/bilim`):** Açılışta 26 parçalık teknik sözlük karmaşası yerine doğrudan **Taş Fırın Dergisi (`Sayı #01` – `Sayı #05`)** ve **Etkileşimli Deneyler** (`Bayatlama & +4 °C Simülatörü`, `Fırıncı Hesaplayıcıları`, `Efsane Dosyası`) karşılar. 26 teknik referans fişi sayfanın altında kapalı `<details>` çekmecesinde düzenli durur.
2. **Her Dergi Sayısı = 4 Çıktı Birden (`/bilim/sayi/01` .. `05`):**
   - **Okunabilir Makale:** Robotik `[1]` parantezleri ve yapay tekrarlar olmadan, doğrudan mutfak sorusunu çözen akıcı anlatı.
   - **Kese Kâğıdı Özeti:** Her sayının sonunda basılı A5 karta da birebir girecek **"Tezgâhta ve Sofrada 3 Net Kural"**.
   - **S24 45 sn Reels Senaryosu:** Sayfanın altındaki *"Bu Sayının 45 Saniyelik Video Senaryosu"* kutusunu telefondan açıp doğrudan tezgâh başında çekebilirsin.
   - **Sepet Köprüsü:** Okuru doğrudan ilgili taş fırın somununa ve mandıra/şarküteri eşlikçisine (`/#ekmekler`, `/#sarkuteri`) bağlar.
3. **Eski Video Taslakları Arşivlendi:** `content/video/` içindeki eski kopuk metinler `docs/_arsiv/eski_video_taslaklari_v1/` altına kaldırıldı.

---

## 2. Şu An Canlıda Hazır Olan 5 Sayı (Yarın Hemen Kullanılabilir)

| Sayı | Canlı Adres & Kese Kâğıdı QR | 45 sn S24 Reels Konusu | Bağlandığı Ürün / Sepet |
| :---: | :--- | :--- | :--- |
| **#01** | `ekmeklab.tr/bilim/sayi/01` (`?sayi=01`) | *4. Günde Duran Ekşi Mayan Öldü mü? Sakın Çöpe Dökme!* | Günlük Taş Fırın Köy Ekmeği + Ev Yoğurdu |
| **#02** | `ekmeklab.tr/bilim/sayi/02` (`?sayi=02`) | *Çavdar Hamurunu Yoğurursan Neden Çamura Döner?* (+ Canlı Buzdolabı Deneyi) | Kalıp %100 Çavdar + Tereyağı & Kavurma |
| **#03** | `ekmeklab.tr/bilim/sayi/03` (`?sayi=03`) | *100 Bakteriye 1 Maya: Şekeri Nasıl Bölüşüyorlar?* | 24–36 Saat Soğuk Fermantasyonlu Somunlar |
| **#04** | `ekmeklab.tr/bilim/sayi/04` (`?sayi=04`) | *Pencere Testi Yanılsaması: Hamuru Aşırı Yoğurarak Öldürme!* | Taş Değirmen & Atalık Buğday Somunları |
| **#05** | `ekmeklab.tr/bilim/sayi/05` (`?sayi=05`) | *34 Derecenin Sırrı: Tereyağı Sıcak Ekmekte Neden Göl Olmaz?* | **Mandıra & Şarküteri Lansmanı** (Jersey Yoğurt, Tereyağı, Yumurta, Sucuk, Kavurma) |

---

## 3. Fırın Videolarını Çektiğinde "Nasıl Üretiyoruz?" Nasıl Açılır?

1. **Ürün Bazlı Yapılış Adımları (`/urun/[slug]`):** `/admin/urunler` ekranından ilgili ürünün **"Adımlar"** sekmesine girip S24 fotoğraf/kısa videolarını yüklediğinde o ürünün sayfasında otomatik görünür (boş ürünlerde gizlidir).
2. **Ana Sayfa "Nasıl Üretiyoruz?" Bölümü:** Gerçek fırın çekimlerin hazır olduğunda [`src/lib/features.ts`](../src/lib/features.ts) içindeki `nasilUretiyoruz: false` bayrağını `true` yapmamız yeterlidir.
