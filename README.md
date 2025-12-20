<!-- Bu README; teknik bilmeyen kullanıcılar ve temel yöneticiler için sade Türkçe rehberdir. Geliştirici notları alt kısımdadır. -->

# Ekşi Mayalı Ekmek Web Uygulaması

Bu platform; ekşi mayalı ekmek ve benzeri ürünleri çevrimiçi görüntüleme, sepete ekleme, sipariş verme, sipariş durum takibi ve yöneticiyseniz içerik yönetimi imkânı sunar.

## 1. Hızlı Özet

- Müşteri: Ürünleri gör, sepete ekle, sipariş ver, durumunu izle.
- Destek: Sipariş durumunu günceller, müşteriye yardımcı olur.
- Editör: Ürün/kategori içerik ve görsel düzenleme.
- Admin / Superadmin: Tüm yönetim, rol atama, denetim.
- Soft Delete: Silinen ürünler geri yüklenebilir.
- Audit Log: Kritik işlemler kayıt altındadır.

## 2. Müşteri Rehberi

### 2.1 Giriş & Kayıt

1. Giriş veya Kayıt butonuna basın.
2. Google tek tık veya e‑posta ile kayıt seçeneklerinden birini seçin.
3. E‑posta seçtiyseniz gelen OTP (kod) ile doğrulayın.
4. Profil bilgilerinizi daha sonra güncelleyebilirsiniz.

### 2.2 Ürün İnceleme

- Kategorilerden veya ana sayfadan ürünlere ulaşın.
- Ürün detayında fiyat, açıklama ve stok bilgisi görünür.
- İndirim varsa hesaplanmış indirimli fiyat otomatik gösterilir.

### 2.3 Sepet & Sipariş

1. Ürünü sepete ekleyin.
2. Sepette adetleri ayarlayın, onaylayın.
3. Adres ve iletişim bilgilerinizi doğrulayın.
4. Sipariş oluşturulur ve ilk durum (örn. Hazırlanıyor) atanır.

### 2.4 Durum Takibi

- Sipariş detayında durum geçmişi (tarihçe) listelenir.
- Her değişiklikte zaman ve işlemi yapan kişi kayıtlıdır.

### 2.5 Arka Plan Görselleri

- Yönetici tarafından ayarlanır; aktif olmayanlar gösterilmez.

## 3. Yönetim Paneli (Yetkili Roller)

Yalnız yetkili roller (editor, support, admin, superadmin) paneli görür.

### 3.1 Roller

| Rol | Amaç | Örnek Yetkiler |
|-----|------|----------------|
| user | Müşteri | Ürün görüntüleme, sipariş verme |
| support | Destek | Sipariş durum güncelleme |
| editor | İçerik | Ürün/kategori düzenleme |
| admin | Yönetim | Ürün/kategori CRUD, görsel, toplu işlemler, rol atama |
| superadmin | Üst | Admin + ileri güvenlik denetimi |

### 3.2 Ürün Yönetimi

- Ürün ekle/düzenle (isim, açıklama, fiyat, stok).
- Soft delete ile sil (geri yüklenebilir).
- Geri yükleme ile aktif et.
- Çoklu seçim + toplu işlemler (fiyat yüzdesi, stok set, stok arttırma).
- Silinenleri Göster anahtarı ile filtre.

### 3.3 Kategori Yönetimi

- Ekle/düzenle/sil.
- `iconName` ile ikon tanımla.
- Sürükle-bırak sıralama ve kaydet.
- Aktif/Pasif görünürlük.

### 3.4 Arka Plan Görselleri

- Yükleme, sıralama (drag & drop), aktif/pasif.
- `linkTarget` seçeneği ile tıklamada yönlendirme.

### 3.5 Sipariş Durumları

- Destek veya yetkili rol günceller.
- Otomatik statusHistory ve audit kaydı.

### 3.6 Audit Log

Kayıt altına alınan örnek işlemler:

- Ürün silme / geri yükleme / toplu fiyat / toplu stok
- Kategori CRUD + sıralama
- Arka plan görsel işlemleri
- Rol değişiklikleri
- Sipariş durum geçişleri

### 3.7 Soft Delete Mantığı

- `isDeleted`, `deletedAt`, `deletedBy` alanları set edilir.
- Varsayılan listeler silinenleri içermez.
- Geri yükleme alanları temizler.

### 3.8 OTP Güvenliği

- 60 sn yeniden gönderim bekleme.
- Belirli hatalı deneme sınırında geçici blok.

### 3.9 Loglama

- `print` yerine seviyeli Logger (debug/info/warn/error).

## 4. Güvenlik

- Rol tabanlı Firestore & Storage kuralları.
- `isAdmin` claim: Bazı yazma işlemleri için gerekli.
- Audit log izlemesi: Hatalı veya kötü niyetli işlem tespiti.
- Soft delete: Veri kaybına karşı koruma.

## 5. SSS

1. Ürün silince yok mu olur? → Hayır, geri yüklenebilir.
2. Fiyat neden değişik görünüyor? → Yüzde ayarı sonrası otomatik hesap.
3. Siparişim uzun süre Hazırlanıyor? → Üretim süreci; destekle iletişime geçin.
4. Arka plan niye değişti? → Admin yeni görseli aktif etti.
5. İkonu olmayan kategori? → Varsayılan simge veya sadece metin.
6. Neden OTP? → Hızlı ve güvenli giriş politikası.

## 6. Sorun Giderme

- Giriş olmuyor: Çerezleri temizleyip tekrar deneyin, spam klasörüne bakın.
- Görseller yavaş: Büyük dosya; optimize önerilir.
- Ürün eksik: Silinenleri Göster kapalı veya kategori pasif.
- Sıralama kayboldu: Drag sonrası Kaydet tuşu atlandı.
- OTP tekrar çalışmıyor: 60 sn dolmamış veya limit blokladı.

## 7. İpuçları

- Toplu fiyat değişiminden önce seçimi kontrol edin.
- İkon adlarını tutarlı formatla verin.
- Arka planı sık değiştirmeyin; deneyimi stabilize edin.
- Silinen ürünleri dönemsel gözden geçirin.

## 8. Kavramlar

- Soft Delete: Silmek yerine gizleme işaretlemesi.
- Audit Log: Kritik yönetim işlemleri kaydı.
- OTP: Tek kullanımlık doğrulama kodu.
- Claim: Kimlik belirtecindeki özel işaret.
- CRUD: Create/Read/Update/Delete.

## 9. Gelecek (Plan)

- Performans metrikleri (frame timing).
- Soft delete & toplu testler.
- İdempotent işlem kimliği.
- Profil kritik alan audit.
- Kuralları daha granular daraltma.

## 10. Destek

Öneri veya sorun için destek kanalına (e‑posta/form) ulaşın.

---

## 11. Geliştirici Notları

### 11.1 Teknolojiler

- Flutter, Firebase (Auth/Firestore/Storage/Functions/Hosting)
- Provider + GetIt

### 11.2 Mimari Özet

- Katmanlar: models, services, providers, screens, widgets, utils, domain, data, core, constants.
- AuditLogService → `admin_logs` koleksiyonu.
- Ürün modeli soft delete alanları içerir.
- Bulk işlemler Firestore batch.

### 11.3 Önemli Dosyalar

- `lib/services/product_service.dart` (CRUD, soft delete, bulk, kategori reorder)
- `lib/models/product.dart`
- `lib/services/audit_log_service.dart`
- `firestore.rules`, `storage.rules`
- `functions/` OTP & rate limit

### 11.4 Test Durumu

Minimum test; genişletme planlandı.

### 11.5 Dağıtım Özet

```bash
firebase deploy --only hosting,firestore:rules,storage:rules
```

### 11.6 İpuçları

- Audit log devre dışı bırakmayın.
- Performans ölçümü ana iş parçacığını bloklamasın.
- İdempotency için işlem kimliği saklayın.

### 11.7 Güvenlik

- Geniş match desenlerini daraltın.
- OTP rate limit loglarını inceleyin.

### 11.8 Olası İyileştirmeler

- Full-text arama.
- Görsel optimizasyon (thumbnail/webp).
- Gelişmiş admin filtreleri.

## 12. Katkı

Pull request veya issue açmadan önce güvenlik etkisini değerlendirin.

## 13. Lisans

Özel lisans varsa burada belirtin.

## 14. Hızlı Özet Kartı

- Ürünleri gör, sepete ekle, sipariş ver.
- Silinen ürünler geri yüklenebilir.
- Kategori & görsel düzeni admin kontrolünde.
- Sipariş durumları izlenebilir.
- Audit log şeffaflık sağlar.

Sorularınız varsa iletmekten çekinmeyin. İyi kullanımlar!
