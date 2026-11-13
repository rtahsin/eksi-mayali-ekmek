---
name: ekmeklab-admin-operasyon
description: EkmekLab admin paneli (/admin/**), ürün ve eşlikçi katalog yönetimi, Samsung S24 fotoğraf yükleme hattı, sipariş yaşam döngüsü ve simetrik cari ön muhasebe kuralları. Admin sayfaları, /api/admin/** rotaları veya finans/sipariş mantığı üzerinde çalışırken etkinleştir.
---

# EkmekLab Admin, Katalog & Cari Operasyon Kuralları

## 1. Güvenlik & Tek Yazar İlkesi
- `src/app/api/admin/**` altındaki her handler ilk iki satırda `requireAdmin(req)` çağırır:
  ```ts
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  ```
- İstemci gövdesinden gelen `isAdmin`, `userId`, `cariId` alanlarına asla güvenilmez.
- Sipariş ve cari yazımları yalnızca atomik RPC'ler (`create_order_atomic`, `mark_order_delivered`, `record_order_payment`, `cancel_order_atomic`, `record_cari_transaction_atomic`) üzerinden yapılır; RPC hata verirse asla parçalı `insert` fallback'ine düşülmez (`500` dönülür).

## 2. Ekmek & Eşlikçi Katalog Girişi (`/admin/urunler`)
- **Taş Fırın Kapasitesi Koruması:** Eşlikçi kategorilerinde (`isAccompanimentCategory(category)` — `mandira`, `sarkuteri`, `gurme`, `pantry`, `kiler`, `peynir`, `tereyag`, `sut`, `yogurt`, `yumurta`, `sucuk`, `yufka`, `kavurma`) `capacityUnits` varsayılan olarak **`0`** olmalıdır ki taş fırın somun kotasını tüketmesin. Ekmek kategorilerinde varsayılan `1`'dir.
- **Kategoriye Duyarlı Form Etiketleri:** Eşlikçi düzenlenirken un/hidrasyon alanları zorlanmaz; `masterclass` JSON anahtarları (`flourHeritage`, `technique`, `sensory`, `storage`) veritabanı şemasını değiştirmeden arayüzde eşlikçiye uygun etiketlerle (*"Üretici & Kaynak Hikâyesi"*, *"Üretim / Hazırlık Yöntemi"*, *"Doku & Lezzet Notları"*, *"Tüketim & Saklama"*) gösterilir.
- **Yer Tutucu Koruması:** `productToForm` içinde `/images/categories/` ve `/images/placeholders/` ile başlayan yer tutucu yollar `null` olarak normalize edilir; veritabanına sahte görsel URL'si yazılmaz.

## 3. Samsung S24 Fotoğraf Yükleme Hattı
- Görseller istemcide `src/lib/media/shrinkPhoto.ts` ile `<= 1600px` WebP (`<= 3.5 MB`) formatına küçültülüp `/api/admin/products/image-upload` (`product-images` bucket) rotasına yüklenir.
- Tarayıcının çözemediği `.heic` / `.heif` dosyalarında kullanıcıya açık Türkçe yönlendirme gösterilir (*"HEIC formatı tarayıcıda açılamadı; S24 kamera ayarlarından JPG seçin veya JPEG/PNG yükleyin"*).

## 4. Cari Hesap, Fiş & Makbuz Kuralları
- **Simetrik Bakiye:** `Bakiye = Toplam Borç (satis) - Toplam Alacak (tahsilat)`. Her fişte o işlemin `balance_after` değeri gösterilir.
- Müşteri-yüzlü `/fis/[id]` ve `/ekstre/[id]` sayfalarında **asla** yeşil WhatsApp paylaşım butonu bulunmaz; yalnızca PNG ve UTF-8 BOM + `;` ayraçlı CSV indirilebilir.
- `K006` gereği ürün adı, açıklama ve detay alanları kaydedilmeden önce `src/lib/knowledge/lint.ts` (`findHealthTerms`) denetiminden geçer.
