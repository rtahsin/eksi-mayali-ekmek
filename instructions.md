# 🍞 EkmekLab - Proje Geliştirme & Mimari Talimatları (instructions.md)

Bu doküman, **EkmekLab** projesinin güncel mimarisini, veri modellerini, güvenlik kurallarını ve geliştirme standartlarını belirler.

---

## 1. 📌 Teknoloji Yığını ve Sistem Mimarisi

### 1.1 Temel Mimari Bileşenleri
- **Frontend & Yönetim**: Next.js 16 (App Router, Turbopack, React 19, TypeScript, Tailwind CSS).
- **Veritabanı & Backend (Çift Katmanlı Mimari)**:
  1. **Supabase (PostgreSQL & Realtime Engine)**:
     - İlişkisel tablolar: `orders`, `order_items`, `current_accounts` (cariler), `cari_hareketler` (finansal hareketler).
     - **Supabase Realtime**:
       - `postgres_changes`: Sipariş ve cari hareketlerinin admin ve müşteri ekranlarında canlı senkronizasyonu.
       - `broadcast` (`courier-live-location`): Kuryenin mobil cihazından yayılan anlık GPS koordinatlarının fırına ve müşteriye aktarımı.
  2. **Firebase Suite**:
     - **Firebase Authentication**: Email/Password, Google Sign-In, Anonim oturumlar.
     - **Cloud Firestore**: NoSQL koleksiyonlar (ürün kataloğu, ayarlar, blog).
     - **Firebase Cloud Storage**: Ürün ve blog yüksek çözünürlüklü medya varlıkları.
     - **Cloud Functions (Node.js 22)**: Sipariş güvenlik motoru (`createOrderSecure`), OTP e-posta akışları, audit logları.

---

## 2. 📂 Dizin Yapısı ve Rolleri

```
ekmeklab_app/
├── src/
│   ├── app/                     # Next.js App Router (Sayfalar & Route Handlers)
│   │   ├── (storefront)/        # Müşteri vitrini (Ana sayfa, Ürünler, Sepet, Checkout)
│   │   ├── admin/               # Yönetim Paneli
│   │   │   ├── siparisler/      # Sipariş Komuta Merkezi, Dağıtım Rotası, Yeni Sipariş
│   │   │   ├── finans/          # Finans & Ön Muhasebe (Nakit/Banka/POS, Cari Hesaplar)
│   │   │   ├── cariler/         # Cari Müşteri & Tedarikçi Yönetimi, Ekstre
│   │   │   ├── urunler/         # Ürün ve Fiyat Yönetimi
│   │   │   ├── kutuphane/       # Kütüphane & Blog Yönetimi
│   │   │   └── ayarlar/         # Fırın & Sistem Ayarları
│   │   ├── kurye/               # Kurye Mobil Konsolu & Canlı GPS Takip Ekranı
│   │   ├── siparis-takip/[id]/  # Müşteri Canlı Sipariş & Kurye Takip Ekranı
│   │   ├── ekstre/[id]/         # Müşteri Canlı Cari Ekstre Ekranı
│   │   └── api/                 # Sunucu API Uç Noktaları
│   ├── components/              # Yeniden Kullanılabilir React Bileşenleri
│   │   ├── admin/               # Admin Paneli Bileşenleri (Sidebar, Modallar, Kartlar)
│   │   └── ui/                  # Temel Arayüz Öğeleri
│   ├── hooks/                   # React Hook'ları (useAdminOrders, useCariler, useFinans vb.)
│   ├── lib/                     # Supabase & Firebase İstemcileri, Yardımcı Fonksiyonlar
│   └── types/                   # Katı TypeScript Tip ve Interface Tanımları
├── functions/                   # Firebase Cloud Functions (Node.js Backend)
├── firestore.rules              # Firestore Güvenlik Kuralları
├── storage.rules                # Storage Güvenlik Kuralları
├── package.json                 # Bağımlılıklar ve Komutlar
├── instructions.md              # Bu Mimari Kılavuzu
└── AGENTS.md                    # IDE & Agent Çalışma Kuralları
```

---

## 3. 💻 Kod Standartları ve Tip Güvenliği

### 3.1 TypeScript Kuralları (Strict Type Safety)
- `tsconfig.json` dosyasında `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true` geçerlidir.
- **Kesinlikle `any` tipi kullanılmayacaktır.** Bilinmeyen veriler için `unknown` ile birlikte type guard'lar veya `zod` şemaları kullanılmalıdır.
- Tüm veri modelleri [`src/types/`](file:///f:/ekmeklab_app/src/types) altında merkezi olarak toplanmalıdır (`AdminOrder`, `CariAccount`, `Transaction`, `Product` vb.).

### 3.2 Realtime Abonelik Kuralları
- Tüm Supabase kanalları (`supabase.channel(...)`) bileşen unmount olduğunda `useEffect` temizleme (cleanup) fonksiyonunda **`supabase.removeChannel(channel)`** ile sonlandırılmalıdır. Hafıza sızıntısına (memory leak) kesinlikle izin verilmez.

---

## 4. 🎨 Tasarım Sistemi & UX Standartları (Artisan Bakery)

### 4.1 Renk Paleti ve Görsel Kimlik
- **Zemin & Kartlar**: Taş fırın koyu teması (`#120E0B` ana zemin, `#18130F` kart yüzeyi, `#261E17` kenarlıklar).
- **Vurgu Tonları**:
  - `artisan-gold` (`#F59E0B` / `#D97706`): Buğday, altın sarısı, fırın ışığı.
  - `artisan-terracotta` (`#C85A32` / `#9C3D1D`): Pişmiş toprak, taş fırın kiremiti.
  - `artisan-cream` (`#F7EBD3`): Doğal ekşi maya unu, logo ve açık tipografi.
- **Tipografi**:
  - Başlıklar ve fırın marka kimliği: `font-serif`.
  - Veri tabloları, tutarlar ve etiketler: modern sans-serif ve `font-mono`.

### 4.2 Mobil Ergonomi & Kurye Deneyimi
- Kurye mobil konsolu ([`/kurye`](file:///f:/ekmeklab_app/src/app/kurye/page.tsx)) ve müşteri takip ekranı ([`/siparis-takip/[id]`](file:///f:/ekmeklab_app/src/app/siparis-takip/%5Bid%5D/page.tsx)) güneş ışığında okunabilir yüksek kontrasta ve tek elle kullanıma uygun büyük dokunmatik hedeflere sahip olmalıdır.
- Tek tıkla harita (Google/Yandex navigasyon), tek tıkla arama ve tek tıkla WhatsApp entegrasyonu standarttır.

---

## 5. 💼 Ön Muhasebe & Finans İlkeleri

1. **Simetrik Bakiye İlkesi**:
   - `Bakiye = Toplam Borç (Satışlar) - Toplam Alacak (Tahsilatlar)`.
   - Borç bakiyeyi artırır, alacak (tahsilat) bakiyeyi düşürür.
2. **Ters Kayıt (Storno) İlkesi**:
   - Muhasebe kayıtları doğrudan silinmez; iptal edilen veya düzeltilen işlemler ters kayıt oluşturularak dengelenir.
3. **Ardışık Fiş Numaralandırması**:
   - Tüm finansal tahsilat ve ödeme fişleri `FİŞ-YYMM-XXX` formatında ardışık üretilir.

---

## 6. 🛡️ Güvenlik ve Doğrulama
- İstemci kodlarına hiçbir zaman gizli API anahtarları veya service account bilgileri eklenemez.
- Her geliştirme adımından sonra **`npm run build`** çalıştırılarak TypeScript tür kontrolü ve rota bütünlüğü 0 hata ile doğrulanmalıdır.
