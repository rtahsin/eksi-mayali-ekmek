# 🍞 EkmekLab · Zanaat & Bilim Odaklı E-Ticaret Platformu

EkmekLab; Beylikdüzü'nde ata tohumları, canlı ekşi maya ve geleneksel soğuk fermantasyon teknikleriyle üretim yapan artisan fırın ve şarküteri işletmesinin modern dijital platformudur.

Proje; yüksek performanslı **Next.js müşteri vitrini** ile operasyonel **Flutter Web yönetim panelini** tek bir Firebase altyapısı üzerinde buluşturan hibrit bir mimariye sahiptir.

---

## 🏗️ Mimari Yapı ve Birlikte Yaşama Stratejisi

```
ekmeklab_app/
├── src/                     # Next.js Müşteri Vitrini (Storefront & Kütüphane)
│   ├── app/                 # Next.js App Router sayfaları (/, /kutuphane, /api)
│   ├── components/          # React UI bileşenleri (storefront, cart, atelier, journal)
│   ├── hooks/               # Custom React hook'ları (useProducts, useJournal)
│   ├── lib/                 # İstemci kütüphaneleri (Firebase, sepet Zustand store, sipariş)
│   └── types/               # Merkezi TypeScript tip tanımları
├── lib/                     # Flutter Web Operasyon & Yönetim Paneli
│   ├── admin/               # İşletme yönetim ekranları (/admin, /admin-mobile)
│   ├── services/            # Flutter servis katmanı (auth, order, product)
│   └── models/              # Dart veri modelleri
├── functions/               # Firebase Cloud Functions (Node.js 22 Backend)
│   ├── index.js             # Sipariş doğrulama (createOrderSecure), OTP, webhook'lar
│   └── src/                 # Yardımcı servisler ve bildirim mantığı
├── public/                  # Statik medya varlıkları (logo, aktif fırın görselleri)
├── docs/                    # Detaylı operasyon, denetim ve şema dokümanları
├── firestore.rules          # Firestore güvenlik ve yetki kuralları
├── storage.rules            # Firebase Storage erişim kuralları
├── firebase.json            # Firebase Hosting ve emülatör yapılandırması
└── instructions.md          # Proje geliştirme & mimari ana yönergesi
```

### 1. 🛍️ Müşteri Vitrini (Next.js 16)
- **Teknoloji**: Next.js (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Zustand, Framer Motion.
- **Odak**: Hızlı yükleme, SEO optimizasyonu, akıcı sepet deneyimi ve fırıncılık bilimi bülteni (`/kutuphane`).
- **Özellikler**:
  - Taş fırın ekmekleri, ön sipariş ve şarküteri seçkisi kataloğu.
  - Taze ekmek fermantasyon ve fırınlama anatomisi rehberi.
  - Hızlı sepet çekmecesi (CartDrawer), kapıda ödeme & kurye teslimat akışı.
  - Zanaat & Bilim Journal arşivi ve dinamik yazı okuyucu.

### 2. 📱 Yönetim & Operasyon Paneli (Flutter Web)
- **Teknoloji**: Flutter 3.x, Responsive Framework, Material 3, Provider.
- **Erişim**: `/admin` (Masaüstü Operasyon) ve `/admin-mobile` (Kurye / Hızlı Mobil Panel).
- **Özellikler**:
  - Stok, sipariş durum geçmişi ve anlık kurye takibi.
  - Ürün ve kategori içerik yönetimi (CRUD).
  - Güvenli audit/denetim logları.

### 3. ☁️ Backend & Veritabanı (Firebase Suite)
- **Cloud Firestore**: Tek doğruluk kaynağı (`urunler`, `kategoriler`, `siparisler`, `bloglar`, `ayarlar`).
- **Cloud Functions**: Fiyat ve stok doğrulamalı güvenli sipariş motoru (`createOrderSecure`), e-posta OTP akışları.
- **Firebase Auth & Storage**: Güvenli oturumlar ve ürün medya depolama.

---

## 🚀 Kurulum ve Yerel Çalıştırma

### Gereksinimler
- **Node.js**: v20+ (Node.js 22 önerilir)
- **npm** veya **pnpm**
- **Flutter SDK**: 3.x (Admin paneli geliştirmesi için)
- **Firebase CLI**: `npm install -g firebase-tools`

### 1. Next.js Vitrinini Başlatma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```
Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

### 2. Next.js Üretim Derlemesi

```bash
# Tip kontrolü ve statik üretim derlemesi
npm run build

# Üretim sunucusunu başlatma
npm start
```

### 3. Flutter Admin Panelini Başlatma (Gerektiğinde)

```bash
# Flutter bağımlılıklarını alma
flutter pub get

# Chrome üzerinde web çalıştırma
flutter run -d chrome --web-port=8080
```

---

## 📜 Geliştirme Standartları

- Tüm Firestore ve API entegrasyonlarında [instructions.md](file:///f:/ekmeklab_app/instructions.md) dosyasındaki kurallar esas alınır.
- Tip güvenliği için `strict: true` TypeScript kullanılır; `any` tipi kullanılmaz.
- Sipariş oluşturma işlemleri doğrudan Firestore yazması yerine Cloud Functions `createOrderSecure` API kapısı üzerinden yürütülür.
