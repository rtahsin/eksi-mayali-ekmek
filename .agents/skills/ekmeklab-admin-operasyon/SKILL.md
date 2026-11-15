---
name: ekmeklab-admin-operasyon
description: EkmekLab admin paneli (/admin/**), ürün ve eşlikçi katalog yönetimi, Samsung S24 fotoğraf yükleme hattı, sipariş yaşam döngüsü ve simetrik cari ön muhasebe kuralları. Admin sayfaları, /api/admin/** rotaları veya finans/sipariş mantığı üzerinde çalışırken etkinleştir.
---

# EkmekLab Admin, Katalog & Cari Operasyon Kuralları

## 1. Güvenlik, RBAC & Tek Yazar İlkesi
- `src/app/api/admin/**` altındaki her handler ilk iki satırda yetki alanına göre granüler `requireCapability(req, "<capability>")` (`src/lib/security/capabilities.ts` — ör. `orders.ops`, `cari.read`, `cari.hot_sale`, `production.ops`) veya yalnız yöneticiye açık finans/ayar/ekip rotalarında `requireAdmin(req)` çağırır:
  ```ts
  const guard = await requireCapability(req, "orders.ops");
  if (!guard.ok) return guard.response;
  ```
- `staff` rolü yalnız operasyonu görür (`dashboard.ops`, `orders.read`, `orders.ops`, `production.ops`); Z-Özeti, ciro, cari bakiye ve mağaza ayarlarına erişemez.
- İstemci gövdesinden gelen `isAdmin`, `userId`, `cariId` alanlarına asla güvenilmez.
- Sipariş ve cari yazımları yalnızca atomik RPC'ler (`create_order_atomic`, `mark_order_delivered`, `deliver_b2b_order_flexible_atomic`, `record_order_payment`, `cancel_order_atomic`, `record_cari_transaction_atomic`, `record_b2b_hot_sale_atomic`) üzerinden yapılır; RPC hata verirse asla parçalı `insert` fallback'ine düşülmez (`500` dönülür).

## 2. Ekmek & Eşlikçi Katalog Girişi (`/admin/urunler`)
- **Taş Fırın Kapasitesi Koruması:** Eşlikçi kategorilerinde (`isAccompanimentCategory(category)` — `mandira`, `sarkuteri`, `gurme`, `pantry`, `kiler`, `peynir`, `tereyag`, `sut`, `yogurt`, `yumurta`, `sucuk`, `yufka`, `kavurma`) `capacityUnits` varsayılan olarak **`0`** olmalıdır ki taş fırın somun kotasını tüketmesin. Ekmek kategorilerinde varsayılan `1`'dir.
- **Kategoriye Duyarlı Form Etiketleri:** Eşlikçi düzenlenirken un/hidrasyon alanları zorlanmaz; `masterclass` JSON anahtarları (`flourHeritage`, `technique`, `sensory`, `storage`) veritabanı şemasını değiştirmeden arayüzde eşlikçiye uygun etiketlerle (*"Üretici & Kaynak Hikâyesi"*, *"Üretim / Hazırlık Yöntemi"*, *"Doku & Lezzet Notları"*, *"Tüketim & Saklama"*) gösterilir.
- **Yer Tutucu Koruması:** `productToForm` içinde `/images/categories/` ve `/images/placeholders/` ile başlayan yer tutucu yollar `null` olarak normalize edilir; veritabanına sahte görsel URL'si yazılmaz.

## 3. Samsung S24 Fotoğraf Yükleme Hattı
- Görseller istemcide `src/lib/media/shrinkPhoto.ts` ile `<= 1600px` WebP (`<= 3.5 MB`) formatına küçültülüp `/api/admin/products/image-upload` (`product-images` bucket) rotasına yüklenir.
- Tarayıcının çözemediği `.heic` / `.heif` dosyalarında kullanıcıya açık Türkçe yönlendirme gösterilir (*"HEIC formatı tarayıcıda açılamadı; S24 kamera ayarlarından JPG seçin veya JPEG/PNG yükleyin"*).

## 4. Cari Hesap, B2B, Kurye & Makbuz Kuralları
- **Simetrik Bakiye:** `Bakiye = Toplam Borç (satis) - Toplam Alacak (tahsilat)`. Her fişte o işlemin `balance_after` değeri gösterilir.
- Müşteri-yüzlü `/fis/[id]` ve `/ekstre/[id]` sayfalarında **asla** yeşil WhatsApp paylaşım butonu bulunmaz; yalnızca PNG ve UTF-8 BOM + `;` ayraçlı CSV indirilebilir.
- **B2B Sıfır-Sürtünme & Ekip/Kurye Operasyonu:** `/admin/**` ve `/kurye` ekranları Açık Kurumsal "Atölye Kremi" temasındadır. B2B cariler için 10 sn Hızlı Sipariş Matrisi (`CariQuickOrderModal` + *Son Siparişi Doldur*), haftalık sabit rutin üretimi (`standing_order`), araçtan sıcak satış (`hot-sale`) ve kapıda esnek fire/iade teslimatı (`/deliver-b2b`) kullanılır. `/admin/ekip` üzerinden Google OAuth veya Google'sız telefon kuryeleri yönetilir; mahalle/apartman kümelemesi ve planlı atama vs *"Yolda"* ayrımı korunur.
- `K006` gereği ürün adı, açıklama ve detay alanları kaydedilmeden önce `src/lib/knowledge/lint.ts` (`findHealthTerms`) denetiminden geçer.

## 5. CFO Finans, Gider Defteri & Tedarikçi Carileri (`/admin/finans`)
- `/admin/finans`, `/api/admin/finance` ve `/api/admin/finance/suppliers` rotaları yalnızca `requireAdmin(req)` (`dashboard.finance` / `admin` & `superadmin`) yetkisine açıktır; `staff` ve `courier` kesinlikle erişemez.
- **Çifte Sayım Koruması (`src/lib/cari/finance.ts`):** Perakende ciro `orders.cari_id IS NULL` (`teslim_edildi`), perakende nakit `payments.cari_transaction_id IS NULL` (`completed`), B2B cari ciro ve tahsilat ise `account_transactions` (storno edilmemiş `satis` / `tahsilat`, `account_type !== "gider"`) üzerinden toplanır.
- **Simetrik Gider & Tedarikçi Defteri:** `financial_records` (`gider`/`gelir`/`storno_*`) ve `supplier_transactions` (`alis`/`odeme`/`storno_*`) kayıtları asla silinmez veya tutarları doğrudan değiştirilmez; hatalı girişlerde yalnızca storno (ters kayıt) kesilir ve tedarikçi bakiyesi `Σ delta` ile yeniden hesaplanır.
- Dışa aktarımlar `buildCsvContent` (`\uFEFF` UTF-8 BOM + `;`) ile üretilir; tüm tarihler `Europe/Istanbul` takvim günüdür (`toIstanbulDateStr`).
