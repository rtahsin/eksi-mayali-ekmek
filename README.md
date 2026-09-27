# 🍞 EkmekLab · Zanaat & Bilim Odaklı E-Ticaret Platformu

EkmekLab; Beylikdüzü'nde ata tohumu taş değirmen unları, 8 yıllık canlı ekşi maya ve 36 saatlik geleneksel soğuk fermantasyon teknikleriyle üretim yapan artisan fırın ve şarküteri işletmesinin modern, yüksek performanslı dijital platformudur.

Proje, %100 **Next.js 16 (App Router)** ve **Supabase PostgreSQL** mimarisi üzerine kurulu olup; vitrin, kurye konsolu, sipariş komuta merkezi ve ön muhasebe yönetimini tek bir çatı altında birleştirir.

---

## 🏗️ Mimari Yapı ve Teknoloji Yığını

```
ekmeklab_app/
├── src/
│   ├── app/                 # Next.js App Router (Sayfalar, Dinamik Rotalar, API'lar)
│   │   ├── (storefront)/    # Vitrin (/, /urun/[slug], /kutuphane)
│   │   ├── admin/           # Fırın Komuta Merkezi (/admin/siparisler, /admin/finans, /admin/cariler)
│   │   ├── kurye/           # Mobil Kurye Konsolu & Canlı Rota Yönetimi
│   │   ├── siparis-takip/   # Müşteri Halka Açık Sipariş Takip Ekranı
│   │   ├── fis/ & ekstre/   # Canlı Muhasebe Fişi ve Ekstre Ekranları
│   │   ├── sitemap.ts       # Dinamik XML Sitemap Üreticisi
│   │   ├── robots.ts        # SEO Arama Motoru Direktifleri
│   │   └── api/             # Atomik Sunucu API Rotaları (/api/orders/create vb.)
│   ├── components/          # Modüler React UI Bileşenleri (Atelier, Storefront, Admin, Cart)
│   ├── data/                # Statik ve Ön Tanımlı Veriler (Katalog, Blog Makaleleri)
│   ├── hooks/               # Custom React Hook'ları (useProducts, useAdminOrders vb.)
│   ├── lib/                 # İstemci & Güvenlik Kütüphaneleri (Supabase, Zustand Store, API Auth)
│   └── types/               # Merkezi TypeScript Tip ve Interface Tanımları
├── public/                  # Statik Medya Varlıkları (Logo, Atelier Panoraması, PWA İkonları)
├── supabase/                # PostgreSQL Veritabanı Migration Dosyaları (001 - 010)
├── tests/e2e/               # Playwright E2E & Concurrency Test Paketi
├── AGENTS.md                # Geliştirici & Agent Mimari Kuralları
├── WORKLOG.md               # Güncel Doğrulama & İş Günlüğü
└── package.json             # Bağımlılıklar ve Komutlar
```

### 1. 🛍️ Müşteri Vitrini & SEO (Next.js 16)
- **Teknoloji**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Zustand, Framer Motion.
- **Performans & SEO**:
  - Dinamik Ürün Detay Sayfaları (`/urun/[slug]`) ve 60 saniye ISR (Incremental Static Regeneration).
  - Schema.org JSON-LD yapılandırılmış veri (`Bakery` / `LocalBusiness` ve `Product` + `Offer`).
  - Dinamik XML Site Haritası (`/sitemap.xml`) ve arama motoru direktifleri (`/robots.txt`).
  - Bilim ve Zanaat Kütüphanesi (`/kutuphane/[slug]`).

### 2. ⚡ Atomik Backend & Veritabanı (Supabase PostgreSQL)
- **ACID & Atomik İşlemler**: Tüm sipariş oluşturma işlemleri PostgreSQL üzerinde `pg_advisory_xact_lock` kilidiyle çalışan `create_order_atomic` RPC fonksiyonu üzerinden tek transaction'da yürütülür.
- **Ardışık Sipariş Numarası**: `generate_order_number()` fonksiyonu ile yarış koşullarından (race condition) arındırılmış `SIP-YYMM-XXX` formatında ardışık numara üretimi.
- **Finans & Ön Muhasebe**: Atomik `record_cari_transaction_atomic` fonksiyonu ile simetrik bakiye takibi, yürüyen bakiye ve storno (ters kayıt) güvencesi.
- **Supabase Realtime**:
  - `postgres_changes`: Fırın paneli ve kurye ekranlarında anlık canlı sipariş senkronizasyonu.
  - `courier-location-${courierId}`: Kuryeden izole kanal üzerinden fırına ve müşteriye canlı GPS konumu aktarımı.
- **Güvenlik (RLS)**: Tüm tablolarda (`orders`, `order_items`, `couriers`, `payments`, `order_status_history`, `customer_locations`, `current_accounts`) Row Level Security (RLS) aktif ve denetlenmiştir.

### 3. 🛵 Kurye Konsolu & Yönetim Paneli
- **Kurye Konsolu (`/kurye`)**: Sahada tek elle kullanıma uygun, yüksek kontrastlı, tek tıkla arama / navigasyon ve durum güncelleme desteği.
- **Fırın Komuta Merkezi (`/admin`)**: Rol tabanlı yetkilendirme (`admin`, `superadmin`, `staff`), dağıtım optimizasyonu, cari hesaplar ve günlük üretim planlama.

---

## 🚀 Kurulum ve Yerel Çalıştırma

### Gereksinimler
- **Node.js**: v20+ (Node.js 22 önerilir)
- **npm** veya **pnpm**
- **Supabase Hesabı & Projesi**

### 1. Bağımlılıkları Yükleme
```bash
npm install
```

### 2. Çevre Değişkenleri (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ADMIN_PIN=1234
```

### 3. Geliştirme Sunucusunu Başlatma
```bash
npm run dev
```
Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

### 4. Üretim Derlemesi ve Tip Doğrulama
```bash
npm run build
```

### 5. Doğrulama ve E2E Testleri
```bash
# Canlı veritabanı şema ve atomik sipariş smoke testi
npm run verify:orders

# Playwright E2E & Concurrency testleri
npm run test:e2e
```

---

## 📜 Geliştirici & Agent Kuralları
Detaylı geliştirici ve mimari standartlar için [AGENTS.md](file:///f:/ekmeklab_app/AGENTS.md) dosyasını inceleyiniz. Bu projede kesinlikle harici Flutter/Dart kodu bulunmaz; sistem %100 Next.js App Router ve TypeScript tabanlıdır.
