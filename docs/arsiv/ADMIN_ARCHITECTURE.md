# 🍞 EkmekLab Admin Panel Mimarisi ve Kodlama Standartları

Bu doküman, EkmekLab Admin Paneli (Ön Muhasebe & Yönetim Sistemi) için sıfır hata, yüksek performans ve mükemmel mobil uyum hedeflenerek belirlenmiş kesin kuralları içerir. Tüm geliştirmeler bu mimariye harfiyen uymalıdır.

## 1. Dizin ve Dosya Yapısı (Component Ayrımı)
**Kural:** Hiçbir sayfa (Page) dosyası 400 satırı geçmemelidir. Karmaşık sayfalar mutlaka mantıksal alt bileşenlere bölünmelidir.
- `src/app/admin/[modul]/page.tsx` sadece veriyi çeken hook'ları çağırıp, alt bileşenleri (component) render etmelidir.
- Modüle özel bileşenler `src/components/admin/[modul]/` altına yerleştirilmelidir (Örn: `src/components/admin/cariler/CariTransactionTable.tsx`).
- Modalların tamamı ayrı dosyalarda olmalıdır (`QuickSlipModal.tsx`, `CustomPriceModal.tsx`).

## 2. Veri Çekme ve Durum Yönetimi (State & Realtime)
**Kural:** Veri çekme ve Supabase Realtime abonelikleri UI içine doğrudan yazılmamalıdır.
- Tüm veri işlemleri `src/hooks/` altındaki özel hook'lar (Örn: `useCariTransactions.ts`) üzerinden yapılmalıdır.
- Realtime abonelikleri açıldığında (mount), bileşen kapandığında (unmount) MUTLAKA temizlenmelidir (`removeChannel`). Memory-leak kesinlikle yasaktır.
- Yükleme (loading), Hata (error) durumları hook tarafından dönülmeli ve Page seviyesinde iskelet (skeleton) veya uyarı olarak işlenmelidir.

## 3. UI/UX ve Mobil Tasarım (Kullanıcı Deneyimi)
**Kural:** Sistem, masaüstünde profesyonel bir muhasebe yazılımı kadar detaylı, mobilde ise tek elle kullanılabilecek kadar basit olmalıdır.
- **Renk Paleti (Artisan Bakery):** Koyu zemin (`#120E0B` / `bg-stone-950`), Kartlar (`#18130F` / `bg-stone-900`), Vurgu (`text-artisan-gold` / `amber-500`), Uyarı/Borç (`rose-400`), Tahsilat (`emerald-400`).
- **Modallar (Popup):** Modallar açıldığında arkadaki sayfanın kaymasını engellemek için her zaman `useModalScrollLock` (veya `body.style.overflow = "hidden"`) uygulanmalıdır.
- **Tablolar:** Mobilde tablolar yatay kaydırma (`overflow-x-auto`) içine alınmalı veya mobilde "Card" görünümüne dönüştürülmelidir. Ekrana sığmayan metinler sağdan sola kaydırılmamalı, `flex-wrap` veya `flex-col` ile alta atılmalıdır.
- **Navigasyon:** Alt navigasyon barı (`MobileBottomNav`) kurye, finans ve siparişler arası geçişte her zaman görünür ve kilitli kalmalıdır. iOS home butonu çakışmaları için alt boşluk (`pb-20` veya `env(safe-area-inset-bottom)`) bırakılmalıdır.

## 4. Hata Yönetimi ve Kapanmalar
**Kural:** "Sayfa Kapanır" hissiyatı veren hiçbir çökme (crash) yaşanmamalıdır.
- Dış sistem çağrıları (Geolocation, Supabase, API Fetch) `try/catch` blokları içinde ele alınmalı, `catch` kısmında kullanıcıya ekranda "Kibar ve anlaşılır" bir hata mesajı (Örn: "Bağlantı kurulamadı, lütfen elle giriniz") gösterilmelidir.
- Hatalar asla beyaz ekrana veya React Root'un çökmesine sebep olmamalıdır.

## 5. Finans ve Ön Muhasebe Matematik Kuralları
**Kural:** Bakiye hesaplamaları simetriktir.
- **Satış / Borçlandırma:** Müşterinin bakiyesini ARTIRIR (+).
- **Tahsilat / Ödeme / İade:** Müşterinin bakiyesini AZALTIR (-).
- İşlem iptalleri veritabanından silinmek yerine, muhasebe kuralına uygun olarak "Ters Kayıt (Storno)" yöntemiyle yapılmalıdır.
