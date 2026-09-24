# 🍞 EkmekLab — Admin Paneli Mimarisi & Kod Sistemi Rehberi

> **Önemli Not (Tüm Geliştirici & AI Ajanlarına):**  
> Bu proje **%100 Web tabanlıdır** (Next.js 16 App Router, Turbopack, React 19, TypeScript ve Tailwind CSS).  
> Projede kesinlikle **Dart / Flutter kodu bulunmaz, yazılamaz veya önerilemez.**

---

## 1. 🧭 Genel Sistem ve Teknoloji Yığını

| Katman | Teknoloji | Görevi & Kullanım Alanı |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router + Turbopack) | Sunucu & İstemci taraflı sayfa ve API rotaları |
| **Arayüz & Stil** | React 19 + Tailwind CSS + Vanilla CSS | Zanaatkar fırın estetiği (`artisan-gold`, `artisan-terracotta`, `stone-950`) |
| **İlişkisel Veritabanı** | **Supabase (PostgreSQL)** | Siparişler (`orders`), B2B Cariler (`current_accounts`), Cari Defteri (`account_transactions`), Ürünler (`products`) |
| **Gerçek Zamanlı İletişim**| **Supabase Realtime** | Canlı sipariş güncellemeleri, kurye canlı konum yayını (`courier-live-location`) |
| **NoSQL & Cloud** | **Firebase (Firestore & Functions & Auth)** | Blog / Kütüphane, Fırın konfigürasyonu, Cloud Functions (Node.js 22) |
| **Görsel & Baskı** | `html2canvas` & `modern-screenshot` | Fiş, makbuz ve ekstrelerin yüksek çözünürlüklü PNG çıktısı |

---

## 2. 📂 Dizin ve Dosya Mimarisi

```
f:\ekmeklab_app/
├── src/
│   ├── app/                               # Next.js App Router Rotaları
│   │   ├── admin/                         # 🛡️ Admin Paneli Ekranları
│   │   │   ├── layout.tsx                 # Admin genel iskeleti & navigasyon
│   │   │   ├── page.tsx                   # Ana Yönetici Dashboard'u
│   │   │   ├── ayarlar/                   # Fırın çalışma saatleri & genel ayarlar
│   │   │   ├── cariler/                   # B2B Cari hesap listesi & yeni cari
│   │   │   │   └── [id]/page.tsx          # Cari profil, ekstre, fiş/tahsilat, özel fiyatlar
│   │   │   ├── finans/                    # Finans ana paneli
│   │   │   │   ├── giderler/              # İşletme harcamaları & faturalar
│   │   │   │   ├── kasa/                  # Kasa nakit/banka hareketleri
│   │   │   │   └── kurye/                 # Kurye hesaplaşma ve hakediş
│   │   │   ├── kurye/                     # Kurye harita takibi & operasyon
│   │   │   ├── kutuphane/                 # Ekşi maya bilgi bankası & blog yönetimi
│   │   │   ├── musteriler/                # B2C Müşteri listesi & geçmiş siparişler
│   │   │   ├── siparisler/                # Sipariş havuzu, filtreler, durumlar
│   │   │   │   ├── [id]/                  # Sipariş detay ekranı
│   │   │   │   ├── dagitim/               # Günlük sevkiyat & rota planlama
│   │   │   │   └── yeni/                  # Manuel ve WhatsApp'tan sipariş ayrıştırma (parse)
│   │   │   ├── tedarikciler/              # Hammadde tedarikçileri & borç takibi
│   │   │   ├── uretim/                    # Günlük un/hamur üretim reçetesi & pişirme planı
│   │   │   └── urunler/                   # Ürün kataloğu, fiyatlar, stok yönetimi
│   │   ├── fis/[id]/page.tsx              # 🧾 Müşteri Dijital Teslimat Fişi & Tahsilat Makbuzu
│   │   ├── ekstre/[id]/page.tsx           # 📄 Müşteri Canlı B2B Hesap Ekstresi
│   │   ├── siparis-takip/[id]/page.tsx    # 🛵 Canlı Müşteri Sipariş & Kurye Takip Ekranı
│   │   ├── kurye/page.tsx                 # 📱 Kurye Mobil Konsolu (Büyük butonlu ergonomi)
│   │   └── api/                           # Backend API Rotaları (`/api/slip/[id]`, `/api/orders/...`)
│   │
│   ├── components/                        # Yeniden Kullanılabilir React Bileşenleri
│   │   ├── admin/                         # Modüllere bölünmüş admin bileşenleri
│   │   │   ├── cariler/                   # CariEditModal, BalanceAdjustModal vb.
│   │   │   ├── finans/                    # B2BSlipModal, B2BCollectionModal, ReceiptModal vb.
│   │   │   ├── siparisler/                # Sipariş kartları, filtreler, durum değiştiriciler
│   │   │   └── uretim/                    # Üretim sayaçları, fırın planlama tabloları
│   │   ├── ui/                            # Temel UI elementleri (butonlar, modallar, badge'ler)
│   │   └── layout/                        # Header, Footer, AdminSidebar, MobileBottomNav
│   │
│   ├── hooks/                             # Özel Veri & State Yönetim Hook'ları
│   │   ├── useCariler.ts                  # Cari hesap listeleme, ekleme, güncelleme, silme
│   │   ├── useCariProfile.ts              # Cari detay, hareketler, özel fiyatlar, Realtime
│   │   ├── useOrders.ts                   # Sipariş akışı, durum değişimleri, Realtime sync
│   │   ├── useProducts.ts                 # Ürün kataloğu yönetimi
│   │   └── useKurye.ts                    # Kurye konumu ve teslimat görevleri
│   │
│   ├── lib/                               # Veritabanı ve Yardımcı Kütüphaneler
│   │   ├── supabase/                      # Supabase client (`client.ts`, `server.ts`)
│   │   ├── firebase/                      # Firebase config ve servisler
│   │   └── utils/                         # Tarih, para formatı, hata yakalama (`format.ts`, `error.ts`)
│   │
│   └── types/                             # Merkezi TypeScript Tip Tanımları
│       ├── admin.ts                       # CariAccount, CariTransaction, AdminOrder tipleri
│       └── index.ts                       # Product, Order, Category, User tipleri
```

---

## 3. 💼 Modül Özeti ve Temel İş Kuralları

### A. B2B Cari Yönetimi & Ön Muhasebe
- **Simetrik Bakiye İlkesi**: `Bakiye = Toplam Borç (Satışlar) - Toplam Alacak (Tahsilatlar)`. Borç (+) bakiyeyi artırır, tahsilat (-) düşürür.
- **Tarihsel Bakiye**: Fişlerde o anki genel bakiye değil, o işlemin yapıldığı andaki `balance_after` değeri gösterilir.
- **Belge Türleri**:
  - `satis`: **Teslimat Fişi** (Terakota rozet, ürün tablosu içerir).
  - `tahsilat`: **Tahsilat Makbuzu** (Zümrüt Yeşili rozet, nakit/havale/kart özet kartı içerir).
  - `devir`: **Devir / Düzeltme Makbuzu** (Mavi rozet).
- **Müşteri Linki İzolasyonu**: `/fis/[id]` ve `/ekstre/[id]` müşteri sayfalarında ASLA yeşil "WhatsApp ile Paylaş" butonu yer almaz; yalnızca fırın sahibinin admin modalında bulunur. Müşteri sayfalarında PNG indirme ve Excel/CSV dışa aktarım kullanılır.
- **Excel Dışa Aktarım**: CSV dosyaları `\uFEFF` UTF-8 BOM ve `;` noktalı virgül ile oluşturulur.
- **Silme Bütünlüğü**: Cari silinmeden önce bağlı `account_transactions` silinir.

### B. Sipariş Yönetimi (`/admin/siparisler`)
- Perakende ve B2B siparişleri tek havuzda toplanır.
- Sipariş durumları: `beklemede` → `hazirlaniyor` → `yolda` → `teslim_edildi` (veya `iptal`).
- WhatsApp mesajlarından akıllı sipariş ayrıştırma (Regex & LLM parser) desteği vardır (`/admin/siparisler/yeni`).
- Dağıtım rotalama ekranı mahallelere ve kuryelere göre sipariş gruplar (`/admin/siparisler/dagitim`).

### C. Üretim ve Fırın Planlama (`/admin/uretim`)
- Gelecek günün siparişlerine göre un, su, maya ve tuz gramajlarını otomatik hesaplar.
- Taş fırın pişirme kapasitesine göre partileri (batch) listeler.

### D. Kurye ve Dağıtım Konsolu (`/admin/kurye` & `/kurye`)
- Kurye akıllı telefonu üzerinden tek elle teslimat durumunu günceller.
- Müşteriye SMS/WhatsApp ile giden canlı link (`/siparis-takip/[id]`) kuryenin gerçek zamanlı konumunu haritada gösterir.

---

## 4. 🎨 Tasarım Dili (Artisan Bakery Estetiği)

- **Koyu Zemin & Yüzeyler**: `#120E0B` (arka plan), `#18130F` (kartlar), `#261E17` (kenarlıklar).
- **Vurgu Renkleri**: Altın Un/Tahıl (`#F59E0B`), Fırın Terakotası (`#C85A32`), Orman Yeşili (`#10B981`).
- **Fiş & Belge Kağıdı**: Sıcak Hamur & Un Kağıdı (`#FBF9F5` zemin, `#1E140F` koyu espresso yazılar, `#EBE4D8` kenarlık).
- **Tipografi**: Marka başlıkları `font-serif`, veriler ve tutarlar `font-mono`, okuma metinleri modern sans-serif.
- **Baskı Güvenliği**: Kağıt bileşenlerinde `overflow-visible` ve `leading-normal` zorunludur (yazıların ve rakamların yarısının kesilmesini önler).

---

## 5. 🧪 Kod Kalitesi ve Değişiklik Kuralları

1. **Katı TypeScript Modu**: Kesinlikle `any` tipi kullanılamaz; bilinmeyen veriler `unknown` + type guard veya Zod ile doğrulanmalıdır.
2. **Realtime Bellek Temizliği**: Açılan her `supabase.channel(...)` unmount esnasında `supabase.removeChannel(...)` ile kapatılmalıdır.
3. **Derleme Şartı**: Yapılan her kod değişikliğinden sonra terminalde **`npm run build`** çalıştırılarak 0 hata ile derlendiği teyit edilmelidir.
