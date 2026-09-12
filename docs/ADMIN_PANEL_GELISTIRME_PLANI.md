# Admin Panel Geliştirme Planı (MVP)

Tarih: 2026-03-26

## Hedef
Tek admin kullanıcısı için sade, stabil ve hızlı operasyon paneli:
- Siparişleri sorunsuz yönetmek
- Manuel sipariş girebilmek
- Müşteriyi otomatik kayıt/upsert ile tek yerden izlemek
- Blog/Banner gibi kodsuz içerik alanlarını düzenli ve güvenli kullanmak

## Kesin Ürün Kuralları
1. Müşteri kayıtlı/misafir sipariş verebilir.
2. Siparişte telefon zorunlu, format serbest.
3. Ödeme tipi: `Nakit` ve `Kart`.
4. Admin manuel sipariş girebilir.
5. Manuel sipariş sonrası müşteri sistemde kayıtlı hale gelir (upsert).
6. Admin müşteri geçmiş siparişlerini görebilir.
7. Sipariş ekranı sade ve stabil kalır.

---

## Faz 0 — Scope Freeze (Güvenli Başlangıç)
Sadece aşağıdaki alanlar:
- `lib/admin/**`
- `lib/screens/admin/**`
- sipariş/müşteri ilişkili servis ve model dosyaları

Kapsam dışı:
- Public UI redesign
- Gelişmiş finans/üretim raporları

Çıkış kriteri:
- Net dosya listesi + müdahale sınırı.

---

## Faz 1 — Sipariş & Müşteri Çekirdeği (P0)

### 1.1 Sipariş ekranını sadeleştir ve sabitle
- Arama: ad + telefon + sipariş no
- Durum akışı: `Yeni / Hazırlanıyor / Teslim Edildi / İptal`
- Gereksiz aksiyonları ikincil alana taşı

### 1.2 Telefon ve ödeme doğrulaması
- Telefon boş ise kaydı engelle
- Ödeme tipi boş ise kaydı engelle

### 1.3 Manuel sipariş akışı
- Admin formu: ad, telefon, adres, ödeme tipi, not, ürün özeti/tutar
- Sipariş kaydında müşteri upsert tetiklenir

### 1.4 Müşteri kartı + geçmiş
- Müşteri detayında temel profil
- Son/önceki siparişler listesi

Kabul kriterleri:
- Admin 1 dakikada sipariş bulup durum güncelleyebilir.
- Manuel siparişten sonra müşteri listede görünür.
- Telefon/ödeme boş sipariş kaydı oluşmaz.

---

## Faz 2 — Modüler İçerik Yönetimi (P1)

### 2.1 Blog yönetimi düzeni
- Form alan standardı (başlık/özet/içerik/görsel/yayın)
- Liste ekranında temel filtre ve yayın durumu

### 2.2 Banner (background) yönetimi düzeni
- Aktif/Pasif netliği
- Sayfa hedefi seçimi sadeleştirme
- Sıralama ve düzenleme adımlarını kısaltma

### 2.3 Kodsuz yönetim menüsü
- Blog + Banner modüllerini tek "İçerik Yönetimi" mantığında grupla
- Menü kalabalığını azalt

Kabul kriterleri:
- Kod yazmadan içerik güncelleme yapılır.
- Kullanıcıya yansıyan içerik değişikliği anlaşılır ve geri alınabilir olur.

---

## Faz 3 — Stabilite ve Kalite Kapatışı (P1)
- Loading/empty/error state standardı
- Kritik admin akışlarında kullanıcı dostu hata mesajları
- `flutter analyze` temizliği
- Hedefli test/smoke senaryoları (sipariş oluşturma, durum güncelleme, müşteri geçmişi)

Kabul kriterleri:
- Bloklayıcı hata yok
- Sipariş ekranı performans/stabil

---

## Uygulama Sırası (Önerilen)
1. Faz 0 (scope freeze)
2. Faz 1 (sipariş + müşteri)
3. Faz 2 (blog + banner)
4. Faz 3 (stabilite kapanışı)

---

## İlk Sprint Görevleri (Doğrudan Başlanacak)
1. Admin menü sadeleştirme taslağı (operasyon vs içerik)
2. Sipariş ekranında P0 validasyonları kilitleme
3. Manuel sipariş + müşteri upsert bağlantısı
4. Müşteri detayına sipariş geçmişi ekleme
5. Blog/Banner ekranlarında form akışı sadeleştirme backlog'u

---

## Not
Bu plan özellikle "çok özellikten önce stabil operasyon" yaklaşımıyla hazırlanmıştır. Öncelik daima sipariş ve müşteri sürekliliğindedir.