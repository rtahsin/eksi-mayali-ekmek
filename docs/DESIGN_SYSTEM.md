# 🍞 EkmekLab - Mağaza Vitrini Tasarım Sistemi (Design System)

Bu doküman, EkmekLab müşteri vitrininde (Storefront) geçerli olan renk paletini, tipografi kurallarını, bileşen anatomisini ve mobil ergonomi standartlarını belirleyen tek resmi referans kaynağıdır (Single Source of Truth).

---

## 1. 🎯 Temel Felsefe: "Artisan Cream & Warm Linen"
* **Hedef:** "AI Slop" hissiyatından (parlayan neon kenarlıklar, koyu kripto dashboard'u, gereksiz hap/rozet enflasyonu) tamamen arındırılmış; Kopenhag/Paris artisan fırınları kalitesinde, gözü yormayan, doğal ve sakin bir müşteri deneyimi.
* **Görsel Algı:** Çiğ hastane beyazı (#FFFFFF) DEĞİL; un serpilmiş ahşap tezgah, ham keten ekmek bezi ve taş fırın sıcaklığı.
* **Geçiş Mimarisi (Opsiyon 3A):** Üstte atmosferik koyu taş fırın kapısı (Gece fırını mayalanma hissi), alt kısımda zengin bir geçişle sabahın aydınlık sıcak keten vitrinine (`#FAF7F2`) akış.

---

## 2. 🎨 Renk Paleti & Token Standartları

| Token Adı | HEX Kodu | Kullanım Alanı & Kural |
| :--- | :--- | :--- |
| `canvas-linen` | `#FAF7F2` | Mağaza vitrini ana zemin rengi (Body canvas). Gözü dinlendirir. |
| `surface-cream` | `#FFFFFF` | Ürün kartları, paneller, modal yüzeyleri (Taze un tonu). |
| `surface-subtle` | `#F5EFEB` | Kategori sekmeleri pasif durumu, ikincil kutular. |
| `border-stone` | `#ECE5D8` | Kart kenarlıkları ve ayırıcı çizgiler (Un tozu yumuşaklığı). |
| `border-subtle` | `#F0EAE0` | İkincil ince çizgiler. |
| `text-espresso` | `#211A14` | Başlıklar, ürün adları ve fiyatlar (Simsiyah yerine koyu espresso). |
| `text-wheat` | `#615347` | Açıklama metinleri ve ikincil yazılar (Kavrulmuş buğday). |
| `text-muted` | `#8C7D70` | Yardımcı metinler, gramaj, dipnotlar. |
| `artisan-terracotta` | `#C85A32` | **Birincil Vurgu Rengi (Accent):** Sepete ekle butonları, sipariş aksiyonları. |
| `artisan-terracotta-dark` | `#B34B26` | Buton hover ve aktif basılma durumu. |
| `artisan-terracotta-soft` | `#F7ECE6` | Terakota rozet arka planı (Yumuşak kiremit zemin). |
| `artisan-gold` | `#C59B6D` | İkincil detaylar, yıldızlar, altın sarısı kabuk vurguları. |
| `hero-dark` | `#12100E` | Gece fırını hero banner arka planı. |

---

## 3. 🔤 Tipografi Kuralları (Storefront Strict 2-Font Kuralı)

Vitrin karmaşasını önlemek için müşteri-yüzlü sayfalarda **YALNIZCA 2 FONT** kullanılacaktır:

1. **`font-serif` (Fraunces):**
   * Kullanım Alanı: Tüm ana ve ara başlıklar (`h1`, `h2`, `h3`), ürün kartı başlıkları, fiyat rakamları.
   * Özellik: Asil, editoryal, zanaatkar kimliği.
2. **`font-sans` (Inter):**
   * Kullanım Alanı: Ürün açıklamaları, buton metinleri, sepet listesi, form alanları, rozetler, gramaj etiketleri.
   * Özellik: Modern, temiz, optik olarak yüksek okunabilirlik (WCAG AA uyumlu).

> [!CAUTION]
> **Yasaklı Vitrin Fontları:**
> * `Caveat` (el yazısı) vitrin ürün kartlarında ve genel butonlarda **KULLANILAMAZ**.
> * `JetBrains Mono` vitrin ürün kartlarında ve mağazada **KULLANILAMAZ** (yalnızca kurye ve admin telemetrisinde kullanılabilir).
> * 4 farklı fontun aynı ekranda yarışmasına izin verilmez.

---

## 4. 📱 Mobil Ergonomi & Buton Boyut Kuralları (Sonnet Standartı)

### Kural: "36px Görsel Zarafet + 44px Dokunma Alanı"
Mobilde butonların devasa tuğlalar gibi kaba görünmesini engellerken, dokunmatik kullanım konforunu (Apple HIG & Android Material 44x44px standardı) korumak zorunludur:

1. **Görsel Boyut (Visual Dimensions):**
   * Ürün kartındaki `[Sepete Ekle]` kapsül butonu görsel olarak `h-9` (**36px**) yüksekliktedir.
   * Font boyutu `text-xs` (12px), ağırlığı `font-semibold` veya `font-medium`dur.
   * Kenarları şık kapsül formunda (`rounded-xl` veya `rounded-full`) tasarlanır.

2. **Dokunma Alanı (Touch Target):**
   * Butonun tıklanabilir/dokunulabilir alanı CSS pseudo-element (`relative after:absolute after:-inset-y-1.5 after:-inset-x-2`) veya dokunma kapsayıcısı ile **kesinlikle en az 44x44px** olmalıdır.
   * Kullanıcı butona çok hafif ıskalayarak bassa dahi dokunma tetiklenir; ancak görsel olarak ekranda devasa bir blok kaplamaz.

3. **Ürün Kartı Stepper Kuralı:**
   * Ürün kartında varsayılan olarak `[-] 1 [+]` sayı seçici bulunmaz.
   * Kartta yalnızca tek, derli toplu `[Sepete Ekle]` butonu yer alır. Adet değişimi sepet çekmecesinde veya tıklandıktan sonra zarifçe açılan mikro kontrolde yapılır.

---

## 5. 🏷️ Bilgi Mimarisi & "AI Slop" Temizliği (Product Card Anatomy)

### Vitrin Kartında Kalanlar (Yalın & İştah Açıcı):
1. **Ürün Görseli:** Temiz, nefes alan, `rounded-2xl` çerçeveli, doğal ışıkta ekmek/lezzet fotoğrafı.
2. **Tek Rozet Kuralı:** Kart üzerinde aynı anda 4-5 rozet bulunamaz. Yalnızca ürün **"Ön Sipariş"** ise tek bir zarif terakota rozet (`bg-artisan-terracotta-soft text-artisan-terracotta`) yer alabilir. "Günlük Taze", "Öne Çıkan" vb. kalabalık rozetler kaldırılmıştır.
3. **Başlık:** Fraunces serif, `text-base` veya `text-lg`.
4. **Gramaj:** Küçük ve temiz un tonu etiket (`800g` veya `1 Litre`).
5. **Açıklama:** Tek satır (line-clamp-1 veya kısa 2 satır) iştah kabartan açıklama.
6. **Fiyat & Buton Satırı:** Fiyat (`font-serif font-bold text-lg text-espresso`) ve yanında 36px kapsül `[Sepete Ekle]` butonu.

### Modala Taşınan Zanaat Detayları:
Aşağıdaki teknik/bilimsel veriler kart üzerinden kaldırılıp **Ürün Detay Modalı** içine taşınır:
* Hidrasyon Oranı (*"%78 Su"*)
* 36 Saat Soğuk Fermantasyon açıklaması
* Ata Tohumu un analizleri (*Karakılçık, Kavılca vb.*)
* *"Ustanın Notu: Zanaat & Biyoloji"* editoryal yazısı

---

## 6. 🛒 Sepet Çekmecesi (Cart Drawer) Tasarım Standartları
* **Zemin:** `bg-surface-cream` (#FFFFFF) ve `bg-canvas-linen` (#FAF7F2).
* **Teslimat Günü Seçimi:** Kaba büyük butonlar yerine ince `border-stone` ile çerçevelenmiş zarif sekmeler (tabs).
* **Aksiyon Butonları:** Fosforlu yeşil SaaS butonları yerine, sıcak fırın terakotası (`#C85A32`) veya zengin espresso tonlu, modern ve sakin onay butonu.
