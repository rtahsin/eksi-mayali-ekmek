# Kategoriler Collection Schema

## Collection: `kategoriler`

### Yapı

```
kategoriler/
├── {categoryId}/                    # Auto-generated document ID
│   ├── name: string                # Kategori adı (required, unique)
│   ├── description: string         # Kategori açıklaması (required)
│   ├── imageUrl: string | null     # Kategori görseli URL (optional)
│   ├── isActive: boolean           # Aktif/pasif durumu (default: true)
│   ├── order: number               # Görüntülenme sırası (default: 0)
│   ├── productCount: number        # Kategorideki ürün sayısı (default: 0)
│   ├── iconName: string            # Material icon adı (optional)
│   ├── slug: string                # URL-friendly slug (auto-generated)
│   ├── createdAt: timestamp        # Oluşturulma tarihi (server timestamp)
│   └── updatedAt: timestamp        # Güncellenme tarihi (server timestamp)
```

---

## Field Açıklamaları

### `name` (string, required)

- Kategori adı
- **Unique**: Aynı isimde başka kategori olamaz
- **Validasyon**: 2-50 karakter arası
- **Örnek**: "Ekşi Mayalı Ekmekler", "Tahıllı Ekmekler"

### `description` (string, required)

- Kategori hakkında kısa açıklama
- **Validasyon**: 10-200 karakter arası
- **Örnek**: "Geleneksel ekşi maya ile uzun fermentasyon süreciyle hazırlanan sağlıklı ekmekler"

### `imageUrl` (string | null, optional)

- Kategori görseli URL'si
- Firebase Storage'dan alınan tam URL
- **Default**: null
- **Örnek**: "<https://firebasestorage.googleapis.com/v0/b/>..."

### `isActive` (boolean, required)

- Kategorinin aktif/pasif durumu
- Pasif kategoriler frontend'de gösterilmez
- **Default**: true
- **Değerler**: true | false

### `order` (number, required)

- Kategorilerin görüntülenme sırası
- Küçük sayı önce gösterilir
- **Default**: 0
- **Örnek**: 1, 2, 3, 4...

### `productCount` (number, required)

- Bu kategoriye ait ürün sayısı
- Otomatik hesaplanır ve güncellenir
- **Default**: 0
- **Örnek**: 5, 12, 0

### `iconName` (string, optional)

- Material icon adı (Flutter Icons)
- **Default**: "" (boş string)
- **Desteklenen İconlar**:
  - bakery_dining, local_cafe, coffee, cake, cookie
  - breakfast_dining, lunch_dining, dinner_dining
  - restaurant, local_dining, fastfood, local_pizza
  - shopping_basket, food_bank, icecream
  - emoji_food_beverage, favorite, new_releases, star

### `slug` (string, required)

- URL-friendly kategori slug'ı
- Otomatik oluşturulur (name'den türetilir)
- **Örnek**: "eksi-mayali-ekmekler", "tahilli-ekmekler"

### `createdAt` (timestamp, required)

- Kategorinin oluşturulma tarihi
- Server timestamp (Firestore FieldValue.serverTimestamp())

### `updatedAt` (timestamp, required)

- Kategorinin son güncellenme tarihi
- Her güncellemede otomatik güncellenir

---

## Indexes

### Composite Index 1: Active + Order

```json
{
  "collectionGroup": "kategoriler",
  "fields": [
    {"fieldPath": "isActive", "order": "ASCENDING"},
    {"fieldPath": "order", "order": "ASCENDING"}
  ]
}
```

**Kullanım**: Sadece aktif kategorileri sıralı şekilde getirmek için

---

## Security Rules

```javascript
match /kategoriler/{categoryId} {
  // Herkes kategorileri okuyabilir
  allow read: if true;
  
  // Sadece adminler kategori ekleyebilir, güncelleyebilir ve silebilir
  allow write: if isAdmin();
}
```

---

## CRUD Operations

### CREATE (addCategory)

```dart
await productService.addCategory({
  'name': 'Yeni Kategori',
  'description': 'Kategori açıklaması (min 10 karakter)',
  'imageUrl': 'https://...',  // optional
  'isActive': true,
  'order': 10,
  'iconName': 'bakery_dining',  // optional
});
```

**Otomatik Oluşturulanlar**:

- `slug`: name'den türetilir
- `createdAt`: Server timestamp
- `updatedAt`: Server timestamp
- `productCount`: 0 olarak başlar

**Validasyonlar**:

- name unique olmalı
- name 2-50 karakter arası
- description 10-200 karakter arası

### READ (fetchCategories)

```dart
final categories = await productService.fetchCategories();
```

**Dönen Veri**: `List<Map<String, dynamic>>`
**Sıralama**: order'a göre artan (ascending)

### UPDATE (updateCategory)

```dart
await productService.updateCategory(categoryId, {
  'name': 'Güncellenmiş Ad',
  'description': 'Yeni açıklama',
  'imageUrl': 'https://...',
  'isActive': false,
  'order': 5,
  'iconName': 'cake',
  'oldName': 'Eski Ad',  // İsterseniz ekleyin (ürünleri güncellemek için)
});
```

**Otomatik Güncellenenler**:

- `updatedAt`: Server timestamp
- `slug`: name değişirse yeniden oluşturulur

**Özel Davranışlar**:

- Eğer `oldName` sağlanırsa ve name değişmişse, bu kategoriye ait tüm ürünlerin category field'ı güncellenir

### DELETE (deleteCategory)

```dart
await productService.deleteCategory(categoryId, categoryName);
```

**Güvenlik Kontrolleri**:

- Kategoriye ait ürün varsa silme işlemi iptal edilir
- Kullanıcıya uyarı mesajı gösterilir

### REORDER (reorderCategories)

```dart
await productService.reorderCategories(['id1', 'id2', 'id3']);
```

**Davranış**:

- Verilen ID sırasına göre tüm kategorilerin order field'ı güncellenir
- Batch write ile toplu güncelleme yapılır

---

## İlişkili Koleksiyonlar

### `urunler` (Products)

- Her ürünün `category` field'ı string olarak kategori adını tutar
- Kategori adı değiştiğinde tüm ürünler güncellenir
- Kategori silinmeden önce ürün kontrolü yapılır

---

## Örnek Kategori Verisi

```json
{
  "name": "Ekşi Mayalı Ekmekler",
  "description": "Geleneksel ekşi maya ile uzun fermentasyon süreciyle hazırlanan sağlıklı ekmekler",
  "imageUrl": "https://firebasestorage.googleapis.com/v0/b/eksimayaliekmekweb.appspot.com/o/category-images%2F...",
  "isActive": true,
  "order": 1,
  "productCount": 12,
  "iconName": "bakery_dining",
  "slug": "eksi-mayali-ekmekler",
  "createdAt": Timestamp(seconds: 1702650000, nanoseconds: 0),
  "updatedAt": Timestamp(seconds: 1702650000, nanoseconds: 0)
}
```

---

## Admin Panel İşlemleri

Admin panelinde ([/admin/categories](lib/admin/categories/admin_categories.dart)):

- ✅ Kategori listesi görüntüleme
- ✅ Yeni kategori ekleme
- ✅ Kategori düzenleme
- ✅ Kategori silme (ürün kontrolü ile)
- ✅ Drag & drop ile sıralama
- ✅ Görsel yükleme
- ✅ Icon seçimi
- ✅ Aktif/pasif yapma
- ✅ Arama ve filtreleme

---

## Migration Script

Eğer veritabanınız boşsa, örnek kategoriler eklemek için:

```bash
node scripts/seed_categories.js
```

Bu script 6 örnek kategori ekler ve mevcut verilere dokunmaz.

---

**Son Güncelleme**: 2025-12-15  
**Doküman Versiyonu**: 1.0
