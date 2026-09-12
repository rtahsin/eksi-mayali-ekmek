# 🍞 EkmekLab - Proje Geliştirme & Mimari Talimatları (instructions.md)

Bu doküman, **EkmekLab** projesinin mevcut mimarisini, veri modellerini, güvenlik kurallarını ve gelecekte kurulacak **Next.js modern müşteri arayüzü** için uyulması gereken tüm teknik ve mimari standartları belirler.

---

## 1. 📌 Mevcut Teknoloji Yığını ve Proje Analizi

### 1.1 Mevcut Mimari Bileşenleri
- **Mevcut Frontend / İstemci**: Flutter 3.x (Web, Responsive Framework, Material 3, Provider State Management, GetIt Dependency Injection).
- **Backend & Cloud Altyapısı**: Firebase Suite
  - **Firebase Authentication**: Email/Password, Google Sign-In, Anonymous Guest Sessions.
  - **Cloud Firestore**: NoSQL veritabanı (Rol tabanlı erişim, field-level güvenlik kuralları).
  - **Firebase Cloud Storage**: Ürün görselleri, blog medyaları, marka varlıkları.
  - **Cloud Functions (Node.js 22 - v1 SDK)**: Sipariş motoru (`createOrderSecure`), OTP e-posta akışı, Firestore event triggers, e-posta bildirimleri, anonim kullanıcı migrasyonu.
  - **Firebase Hosting**: Statik web dağıtımı ve header/cache optimizasyonları (`firebase.json`).
  - **Firebase Cloud Messaging (FCM)**: Sipariş ve durum bildirimleri.

### 1.2 Dizin Yapısı ve Rolleri
```
ekmeklab_app/
├── lib/                     # Mevcut Flutter Web kaynak kodları
│   ├── admin/               # Flutter Admin Paneli (Desktop & /admin-mobile)
│   ├── models/              # Dart veri modelleri (product, order, user, vb.)
│   ├── services/            # Flutter servis katmanı (auth, order, product, vb.)
│   ├── screens/             # Müşteri Flutter ekranları
│   ├── providers/           # Provider state yapıları
│   └── utils/               # Sabitler (constants.dart), tema, logger
├── functions/               # Firebase Cloud Functions (Node.js backend)
│   ├── index.js             # Ana fonksiyon tanımları ve endpoint'ler
│   └── src/                 # Sipariş hesaplama ve admin bildirim yardımcıları
├── firestore.rules          # Firestore güvenlik ve yetkilendirme kuralları
├── storage.rules            # Firebase Storage erişim kuralları
├── firebase.json            # Firebase Hosting, Emulator ve Servis yapılandırması
├── package.json             # Root seviyesi Node/Firebase bağımlılıkları
└── instructions.md          # Bu kılavuz dokümanı
```

---

## 2. 🎯 Gelecek Hedefi: Modern Next.js Müşteri Arayüzü

### 2.1 Temel Hedef ve Vizyon
Mevcut backend, Firestore veri şemaları, Cloud Functions mantığı ve **Flutter Admin Paneli (`/admin`, `/admin-mobile`) hiçbir şekilde bozulmadan/değiştirilmeden**, son kullanıcı (müşteri) vitrini için modern, yüksek performanslı, SEO odaklı bir **Next.js (App Router, React Server Components, TypeScript, Tailwind CSS)** arayüzü inşa edilecektir.

### 2.2 Birlikte Yaşama (Coexistence) Stratejisi
1. **Admin Paneli & Operasyon**: Flutter Web uygulaması işletme yönetimi, stok, kurye/sipariş takibi için kullanılmaya devam eder.
2. **Müşteri Deneyimi (Storefront)**: Next.js uygulaması ultra hızlı sayfa yükleme (SSR/SSG/ISR), mükemmel Core Web Vitals skorları, zengin animasyonlar ve pürüzsüz checkout deneyimi sunar.
3. **Tek Doğruluk Kaynağı (Single Source of Truth)**: Her iki istemci de aynı Cloud Firestore veritabanını, aynı Cloud Functions API kapılarını ve aynı Firebase Storage depolama alanını kullanır.

---

## 3. 🗄️ Veritabanı ve Backend Mimarisi (Korumalı Kurallar)

### 3.1 Firestore Koleksiyon Standartları
Tüm istemciler aşağıdaki koleksiyon isimlendirmeleri ve şemalarına **birebir uymak zorundadır**:

| Koleksiyon | Açıklama | Okuma İzni | Yazma / Oluşturma İzni |
|---|---|---|---|
| `urunler` | Ekmek ve unlu mamul kataloğu | Herkese Açık (`public`) | Sadece Admin (`isAdmin()`) |
| `kategoriler` | Ürün kategorileri ve sıralama | Herkese Açık (`public`) | Sadece Admin |
| `siparisler` | Müşteri sipariş kayıtları | Müşteri (kendi siparişi) / Admin | **Yalnızca Cloud Functions / Admin SDK (`allow create: if false;`)** |
| `users` | Müşteri profil ve tercihleri | Sahibi (`isOwner`) / Admin | Sahibi (`isOwner`) / Admin |
| `saved_addresses` | Kayıtlı teslimat adresleri | Sahibi / Admin | Sahibi / Admin |
| `neighborhoods` | Beylikdüzü mahalle/sokak listesi | Herkese Açık (`public`) | Sadece Admin / Senkronizasyon |
| `bloglar` | Blog yazıları ve tarifler | Herkese Açık (`public`) | Sadece Admin / Editör |
| `yorumlar` | Ürün ve blog yorumları | Herkese Açık (`public`) | Oturum Açmış Kullanıcı / Admin |
| `ayarlar` | Mağaza ve çalışma saatleri ayarları | Herkese Açık (`public`) | Sadece Admin |
| `adminler` | Admin yetki ve rol tanımları | İlgili Admin / Superadmin | Sadece Superadmin |
| `admin_logs` | Denetim ve audit kayıtları | Sadece Admin | Cloud Functions / Admin SDK |

### 3.2 Kritik Cloud Functions Endpoint'leri
Next.js istemcisi sipariş ve doğrulama süreçlerinde doğrudan Firestore'a yazmak yerine aşağıdaki güvenli fonksiyonları çağırmalıdır:

1. **`createOrderSecure` (HTTPS POST)**:
   - **Görevi**: Sipariş oluşturma, sunucu taraflı fiyat & sepet doğrulama, stok rezervasyonu, teslimat penceresi tayini ve kargo ücreti hesaplama.
   - **Kural**: `idempotencyKey`, `items`, `customerInfo`, `deliveryDetails` parametreleri eksiksiz ve geçerli formatta iletilmelidir.
2. **`requestEmailOtp` & `verifyEmailOtp` (HTTPS POST)**:
   - **Görevi**: Şifresiz giriş veya misafir sipariş onayında e-posta OTP doğrulama akışı.
3. **`completeGuestOrderRegistration` (HTTPS POST)**:
   - **Görevi**: Misafir olarak sipariş veren müşterinin sipariş sonrası hızlıca şifre belirleyip üye olması.
4. **`migrateAnonymousOwnership` (HTTPS POST)**:
   - **Görevi**: Anonim/misafir oturumunda oluşturulan sepet, sipariş ve adreslerin oturum açıldığında gerçek kullanıcı hesabına bağlanması.

---

## 4. 💻 Kod Standartları ve Geliştirme Kuralları

### 4.1 TypeScript Kuralları (Strict Type Safety)
- `tsconfig.json` dosyasında `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true` zorunludur.
- **Kesinlikle `any` tipi kullanılmayacaktır.** Bilinmeyen veya harici veriler için `unknown` ile birlikte type guard fonksiyonları veya `zod` şemaları kullanılmalıdır.
- Tüm Firestore dökümanları için TypeScript Interface ve Type tanımları `lib/types/` altında merkezi olarak toplanmalıdır.
  - Örnek: `Product`, `Order`, `OrderItem`, `UserAddress`, `Neighborhood`, `Category`.
- Form validasyonları ve API istek gövdeleri `zod` şemaları ile doğrulanmalıdır.

### 4.2 Tailwind CSS ve Tasarım Sistemi Standartları
- **Marka Renk Paleti**:
  - `brand-cream`: `#F7EBD3` (Doğal mayalama / un / logo diski tonu)
  - `brand-primary`: `#8B5E3C` (Fırınlanmış kabuk / artisan kahve)
  - `brand-accent`: `#D2B48C` (Buğday / altın sarısı)
  - `brand-dark`: `#2C1810` (Derin sıcak siyah / tipografi)
  - `brand-surface`: `#FFFDF9` (Açık arka plan / kart yüzeyi)
- **Tasarım Kuralları**:
  - Mobil öncelikli (`mobile-first`) duyarlı tasarım.
  - Temiz bileşen stilleri; karmaşık inline stil (`style={{}}`) kullanımından kaçınılmalı, semantik Tailwind utility sınıfları kullanılmalıdır.
  - Modern mikro animasyonlar (hover transition, scale, smooth fade) ve glassmorphism (`backdrop-blur`) kart yapıları.
  - Font Ailesi: Modern sans-serif başlık ve gövde fontları (örn. `Plus Jakarta Sans` veya `Outfit`).

### 4.3 Temiz Bileşen Mimarisi (Clean Component Architecture)
Next.js projesinde dosya ve klasör organizasyonu aşağıdaki katmanlı yapıda olmalıdır:

```
src/ (veya root/)
├── app/                       # Next.js App Router (Sayfalar, Layout'lar, Route Handlers)
│   ├── (storefront)/          # Müşteri vitrini grup rotası (header/footer ortak)
│   │   ├── page.tsx           # Ana sayfa (Hero, Popüler Ekmekler, Neden EkmekLab)
│   │   ├── urunler/           # Ürün kataloğu ve filtreleme
│   │   ├── urun/[slug]/       # Ürün detay sayfası (Besin değerleri, alerjenler, SSS)
│   │   ├── sepet/             # Sepet yönetimi
│   │   ├── siparis/           # Güvenli ödeme ve adres adımı (Checkout)
│   │   ├── siparis-takip/     # Canlı sipariş ve kurye takip
│   │   ├── blog/              # Ekşi maya rehberleri ve blog yazıları
│   │   └── profil/            # Müşteri sipariş geçmişi ve adres yönetimi
│   └── api/                   # Next.js Edge/Node Route Handlers (gerekirse proxy/BFF)
├── components/
│   ├── ui/                    # Atomik UI bileşenleri (Button, Input, Modal, Badge, Drawer)
│   ├── common/                # Ortak bileşenler (Navbar, Footer, SEO Meta, CookieBanner)
│   └── features/              # İşlev bazlı modüller
│       ├── product/           # ProductCard, ProductGrid, NutritionTable, AllergenBadge
│       ├── cart/              # CartDrawer, CartItemRow, CartSummary
│       ├── checkout/          # AddressSelector, DeliveryWindowPicker, PaymentForm
│       └── tracking/          # OrderTimeline, CourierMap, StatusBadge
├── lib/
│   ├── firebase/              # Firebase Client SDK & Admin SDK başlatıcıları
│   ├── services/              # API & Cloud Functions istemcileri (orderService, productService)
│   ├── types/                 # Katı TypeScript tip ve interface tanımları
│   ├── utils/                 # Formatlama (para, tarih, telefon), sabitler
│   └── validations/           # Zod şemaları (checkoutValidation, addressValidation)
├── hooks/                     # Custom React hook'ları (useCart, useAuth, useDelivery)
└── context/                   # React Context Providers (CartContext, AuthContext)
```

---

## 5. 🛡️ Güvenlik ve Kodlama Sınırları (Boundaries & Constraints)

### 5.1 Güvenlik ve Gizlilik İlkeleri
1. **İstemci Tarafında Gizli Anahtar Bulunamaz**:
   - `NEXT_PUBLIC_` öneki yalnızca Firebase Web API Key, Project ID, Storage Bucket gibi halka açık konfigürasyonlar için kullanılabilir.
   - Firebase Service Account Key, Admin SDK credentials, SMTP şifreleri asla istemci bundle'ına dahil edilemez.
2. **Sipariş Güvenliği (No Client Direct Writes)**:
   - Firestore `siparisler` koleksiyonuna istemciden doğrudan `setDoc` / `addDoc` yapılması `firestore.rules` ile yasaklanmıştır.
   - Sipariş oluşturma işlemi kesinlikle `createOrderSecure` Cloud Function üzerinden yürütülmelidir.
3. **Idempotency (Mükerrer İstek Koruması)**:
   - Her sipariş ve ödeme işleminde benzersiz bir `idempotencyKey` üretilerek gönderilmelidir.
4. **Alan Düzeyinde Yetki Koruması (Field-Level Protection)**:
   - Kullanıcı profil güncellemelerinde `isAdmin`, `role`, `isSupport` alanları istemciden değiştirilemez.

### 5.2 Geriye Dönük Uyumluluk ve Dokunulmazlıklar
- **Flutter Kodları**: `lib/admin/` ve `lib/screens/` içerisindeki mevcut çalışan iş mantıklarına müdahale edilmeyecektir.
- **Firestore İndeksleri ve Kuralları**: `firestore.rules` ve `firestore.indexes.json` dosyalarındaki mevcut izinler bozulmayacaktır.
- **Cloud Functions**: `functions/` altındaki çalışan yardımcı fonksiyonlar (`order_secure_helpers.js`, `admin_order_notify_helpers.js`) geriye dönük uyumlu kalmalıdır.

---

## 6. 🚀 Next.js Geliştirme Adımları ve İş Akışı

1. **Adım 1: Temel Kurulum ve Konfigürasyon**:
   - Next.js (App Router), TypeScript, Tailwind CSS ve `@google/genai` / Firebase JS SDK kurulumu.
   - Ortam değişkenlerinin (`.env.local`) yapılandırılması.
2. **Adım 2: Tip Tanımları ve Firebase Client Katmanı**:
   - `lib/types/` altında ürün, sipariş, kategori ve kullanıcı tiplerinin hazırlanması.
   - `lib/firebase/` altında Firestore ve Auth bağlantılarının kurulması.
3. **Adım 3: Ürün Kataloğu ve Mağaza Deneyimi**:
   - Server-side rendering (SSR/ISR) ile hızlı ürün listeleme ve detay sayfaları.
   - Beylikdüzü teslimat bölgeleri ve sipariş üzerine üretim (`madeToOrder`) bilgilendirmeleri.
4. **Adım 4: Sepet ve Güvenli Checkout (Sipariş Verme)**:
   - Yerel ve bulut senkronizasyonlu sepet yönetimi.
   - `createOrderSecure` API entegrasyonu ile tam güvenli sipariş oluşturma.
5. **Adım 5: Kimlik Doğrulama ve Misafir Akışları**:
   - Google Sign-In, Email OTP ve anonim kullanıcı sepet/sipariş aktarımı (`migrateAnonymousOwnership`).
6. **Adım 6: SEO, PWA & Canlıya Alma**:
   - OpenGraph etiketleri, Schema.org (Product, Bakery, LocalBusiness) JSON-LD entegrasyonu, sitemap ve robots yapılandırması.
