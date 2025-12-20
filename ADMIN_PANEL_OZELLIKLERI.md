# Admin Panel Özellikleri

## ✅ Mevcut ve Çalışan Özellikler

### 1. Ürün Yönetimi (`/admin/products`)

- ✅ **Ekleme/Düzenleme/Silme** (Soft Delete)
- ✅ **Ana Görsel Yükleme**: "Yükle" butonu ile bilgisayardan Firebase Storage'a yükleme
- ✅ **Çoklu Ek Görsel**:
  - Çoklu seçim ile toplu yükleme
  - Galeri sürükle-bırak ile yeniden sıralama
  - Her görselde yerinde değiştirme butonu
  - Kapak görseli seçimi (yıldız ikonu)
- ✅ **Toplu İşlemler**:
  - Fiyat yüzde ayarı (+/- %)
  - Stok set (belirli değere ayarla)
  - Stok artır/azalt
  - Soft delete (seçili ürünleri sil)
  - Restore (geri yükle)
- ✅ **Gelişmiş Filtreler**:
  - Kategori, popüler/yeni, aktif/pasif
  - Fiyat aralığı (min-max)
  - Stok aralığı (min-max)
  - Düşük stok uyarısı
- ✅ **Arama**: İsim, açıklama, kategori

### 2. Kategori Yönetimi (`/admin/categories`)

- ✅ **Ekleme/Düzenleme/Silme**
- ✅ **Görsel Yükleme**: "Yükle" butonu ile bilgisayardan Firebase Storage'a yükleme
- ✅ **Sürükle-Bırak Sıralama**: Kategorileri yeniden sıralama ve "Yeni Sıralamayı Kaydet"
- ✅ **Icon Seçimi**: Material icon adı (bakery_dining, local_cafe vb.)
- ✅ **Aktif/Pasif**: Kategori durumu toggle
- ✅ **Ürün Sayısı**: Her kategorideki ürün sayısını gösterir

### 3. Blog Yönetimi (`/admin/blogs`)

- ✅ **Ekleme/Düzenleme/Silme**
- ✅ **Görsel Yükleme**: "Yükle" butonu ile bilgisayardan Firebase Storage'a yükleme
- ✅ **Markdown Desteği**: İçerik alanı Markdown formatında
- ✅ **Etiketler**: Virgülle ayrılmış etiket sistemi
- ✅ **Kategori**: Blog kategorisi
- ✅ **Yazar Bilgisi**: Yazar adı
- ✅ **Tarih**: Otomatik tarih ekleme

### 4. Sipariş Yönetimi (`/admin/orders`)

- ✅ **Liste Görünümü**: Tüm siparişleri görüntüleme
- ✅ **Durum Filtreleme**: Beklemede, Hazırlanıyor, Kargoda, Teslim Edildi
- ✅ **Arama**: Sipariş numarası, müşteri adı

### 5. Müşteri Yönetimi (`/admin/customers`)

- ✅ **Liste Görünümü**: Kayıtlı müşteriler
- ✅ **Arama**: Ad, e-posta, telefon

### 6. Arka Plan Görselleri (`/admin/backgrounds`)

- ✅ **Yükleme**: Bilgisayardan Firebase Storage'a yükleme
- ✅ **Aktif/Pasif**: Görselleri aktif/pasif yapma
- ✅ **Sıralama**: Görselleri yeniden sıralama
- ✅ **Silme**: Görselleri silme
- ✅ **Metadata Düzenleme**: Başlık, açıklama düzenleme

### 7. Denetim Kayıtları (`/admin/audit`)

- ✅ **Tüm İşlem Kayıtları**: Admin işlemleri detaylı log
- ✅ **Filtreleme**:
  - Aksiyon tipi (ürün ekleme, güncelleme, silme, restore, bulk operations vb.)
  - Admin e-posta
  - Tarih aralığı
- ✅ **JSON Detay**: Her kayıt için genişletilebilir JSON veri görünümü
- ✅ **Kopyalama**: JSON'u panoya kopyalama

### 8. Gösterge Paneli (`/admin`)

- ✅ **Özet Görünüm**: Temel istatistikler
- ✅ **Hızlı Erişim**: Diğer sayfalara yönlendirmeler

## 🔐 Güvenlik

### Firebase Storage Kuralları

```text
/product-images/**    → Admin yazma, herkes okuma
/blog-images/**       → Admin yazma, herkes okuma
/category-images/**   → Admin yazma, herkes okuma
/backgrounds/**       → Admin yazma, herkes okuma
```

### Firestore Kuralları

- Admin işlemleri için `isAdmin` claim kontrolü
- Soft delete: `isDeleted`, `deletedAt`, `deletedBy` alanları

### OTP Güvenliği

- 60 saniye süre sınırı
- 5 yanlış denemede hesap kilidi
- Audit log kaydı

## 📝 Audit Log Aksiyonları

### Ürünler

- `product_create`, `product_update`, `product_soft_delete`, `product_restore`
- `bulk_price_adjust`, `bulk_stock_set`, `bulk_stock_adjust`, `bulk_soft_delete`, `bulk_restore`
- `product_image_upload` (Storage)

### Kategoriler

- `category_create`, `category_update`, `category_delete`, `category_reorder`
- `storage_image_upload` (kategori context ile)

### Blog

- Firebase Collection: `blogPostlar` (CRUD işlemleri)
- `storage_image_upload` (blog context ile)

### Arka Plan Görselleri

- `background_image_upload`, `background_image_delete`, `background_image_edit`, `background_image_reorder`

## 🎨 Kullanıcı Deneyimi

### Görsel Yönetimi

- **Tek Tıkla Yükleme**: Her görsel alanında "Yükle" butonu
- **Sürükle-Bırak**: Ürün galerisi ve kategori listesi
- **Önizleme**: Yüklenen görselleri anında görüntüleme
- **Hata Yönetimi**: Başarısız yüklemeler için net mesajlar

### Responsive Tasarım

- Mobil uyumlu (küçük ekranlar için optimize)
- Tablet ve masaüstü desteği

### Filtreleme ve Arama

- Anlık arama (debounce)
- Gelişmiş filtre bottom sheet (ürünler)
- Kayıtlı görünümler hazır (gelecek özellik)

## 🚀 Gelecek Özellikler (Öneri)

### Kısa Vade

- [ ] **CSV İçe/Dışa Aktar**: Ürün ve stok toplu import/export
- [ ] **Dashboard Grafikleri**: Satış, stok, kategori dağılımı
- [ ] **Bildirim Sistemi**: Düşük stok, yeni sipariş bildirimleri

### Orta Vade

- [ ] **Kampanya Yöneticisi**: Tarihli indirim kuralları, kupon kodları
- [ ] **Ürün Varyantları**: Boyut/gramaj seçenekleri
- [ ] **SEO Yönetimi**: Meta title, description, sitemap yenileme

### Uzun Vade

- [ ] **Webhook Entegrasyonu**: Slack/Discord bildirimleri
- [ ] **Gelişmiş Analitik**: Dönüşüm hunisi, sepet analizi
- [ ] **Rol Yönetimi**: Farklı admin seviyeleri (editor, viewer)

## 📂 Dosya Yapısı

```text
lib/
├── admin/
│   ├── admin_router.dart          # Ana admin router
│   ├── admin_routes.dart          # Rota tanımları
│   ├── products/
│   │   ├── admin_products.dart    # Ürün listesi ve toplu işlemler
│   │   └── product_form.dart      # Ürün ekleme/düzenleme formu
│   ├── categories/
│   │   └── admin_categories.dart  # Kategori yönetimi
│   ├── audit/
│   │   └── admin_audit_logs.dart  # Denetim kayıtları
│   └── widgets/
│       ├── admin_drawer.dart      # Sol menü
│       └── admin_app_bar.dart     # Üst bar
├── screens/admin/
│   ├── admin_blogs.dart           # Blog yönetimi
│   ├── admin_orders.dart          # Sipariş yönetimi
│   ├── admin_users.dart           # Müşteri yönetimi
│   └── background_images_screen.dart  # Arka plan görselleri
├── services/
│   ├── product_service.dart       # Ürün CRUD + bulk operations
│   ├── image_service.dart         # Storage upload helper
│   ├── audit_log_service.dart     # Audit log servisi
│   └── auth_service.dart          # OTP + admin claim
└── models/
    ├── product.dart               # Ürün modeli (soft delete fields)
    └── blog_post.dart             # Blog post modeli
```

## 🛠️ Teknik Detaylar

### State Management

- **Provider** + **ChangeNotifier** (ProductService, AuthService)
- **GetIt** (Service Locator)

### Caching

- **SharedPreferences**: Ürün listesi önbellekleme (15 dakika)
- Offline-first strategi: `ConnectionService` ile bağlantı kontrolü

### Image Upload

- **file_picker**: ^8.0.7 (Web destekli)
- **firebase_storage**: ^11.7.7
- Path yapısı: `{entity}-images/{id}/{timestamp}_{sanitizedName}.jpg`
- Audit log: Her yükleme `storage_image_upload` aksiyonu ile kaydedilir

### Form Validation

- Required field'lar işaretli (*)
- Fiyat/stok: Numeric validation
- URL: Empty veya valid URL kontrolü

---

**Son Güncelleme**: 24 Kasım 2025  
**Durum**: ✅ Tüm temel özellikler çalışır durumda
