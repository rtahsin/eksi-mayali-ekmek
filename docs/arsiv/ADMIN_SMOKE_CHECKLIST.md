# Admin Panel Smoke Checklist (Operasyon)

Tarih: 2026-07-02

Bu liste tek admin kullanımında kritik akışları hızlı doğrulamak içindir.

## 0) Admin Giriş ve Yetki
- [ ] `/admin/login` açılır, oturum kontrolü tam ekran yükleniyor gösterir.
- [ ] Geçerli admin hesabıyla giriş yapılır; mobilde varsayılan `/admin/delivery-run`, masaüstünde `/admin` açılır.
- [ ] Admin olmayan müşteri oturumunda "Müşteri oturumu açık" banner'ı ve yetkisiz erişim dialogu görünür; login↔panel döngüsü oluşmaz.
- [ ] "E-posta adresimi hatırla" yalnızca e-postayı saklar.
- [ ] "Şifremi unuttum" e-posta gönderir.
- [ ] Admin çıkışı `/admin/login` sayfasına yönlendirir.

## 0b) Mobil Operasyon Merkezi
- [ ] `/admin-mobile` — Dağıtım Modu, Siparişler, Satış Raporu butonları çalışır.
- [ ] PWA kısayolları: Dağıtım → `/admin/delivery-run`, Admin → `/admin-mobile`.
- [ ] Dağıtım modunda mobil alt bar: Dağıtım | Siparişler | Çıkış.

## 1) Manuel Sipariş Oluşturma
- [ ] Admin panelde siparişler ekranını aç.
- [ ] Manuel sipariş formunda müşteri adı + telefon + ödeme tipi + tutar gir.
- [ ] Telefon boş bırakıldığında kayıt engelleniyor mu kontrol et.
- [ ] Ödeme tipi boş bırakıldığında kayıt engelleniyor mu kontrol et.
- [ ] Kayıt sonrası sipariş listede görünür mü kontrol et.

Beklenen sonuç:
- Sipariş başarılı oluşur.
- Eksik zorunlu alanlarda kullanıcıya anlaşılır hata gösterilir.

## 2) Müşteri Upsert ve Geçmiş Sipariş
- [ ] Manuel siparişte kullanılan telefon ile müşteri listesinde arama yap.
- [ ] Müşteri detayına gir.
- [ ] Sipariş geçmişinde yeni sipariş görünüyor mu doğrula.

Beklenen sonuç:
- Müşteri kaydı oluşmuş/güncellenmiş olur.
- Geçmiş siparişler okunaklı tarih ve durumla listelenir.

## 3) Sipariş Durumu Hızlı Güncelleme
- [ ] Siparişler ekranında hızlı durum filtresini kullan.
- [ ] Bir siparişi hızlı aksiyonla farklı duruma geçir.

Beklenen sonuç:
- Filtreler doğru çalışır.
- Durum değişikliği listede anında yansır.

## 4) Blog İçerik Yönetimi
- [ ] Blog listesinde arama + durum filtresini kullan.
- [ ] "Yayına Al / Taslağa Al" aksiyonunu test et.
- [ ] Filtre sonucu boşsa "Filtreleri sıfırla" butonunu test et.

Beklenen sonuç:
- Blog yayın durumu hızlı ve tutarlı güncellenir.
- Boş filtre durumundan tek tıkla geri dönülür.

## 5) Banner Yönetimi
- [ ] Banner listesinde sayfa filtresi + "sadece aktif" filtresini test et.
- [ ] Kart üzerinden "Aktif Yap / Pasif Yap" aksiyonunu test et.
- [ ] Filtre sonucu boşsa "Filtreleri sıfırla" butonunu test et.

Beklenen sonuç:
- Banner görünürlük durumu stabil değişir.
- Filtrelenmiş boş listeden kolayca geri dönüş sağlanır.

## 5b) Kategori Yönetimi
- [ ] Kategori listesinde yeni kategori ekle.
- [ ] Sıralama / görünürlük değiştir.
- [ ] Ürün formunda yeni kategori seçilebiliyor mu doğrula.

Beklenen sonuç:
- Kategori değişiklikleri vitrinde yansır.

## 5c) Sabah Operasyon (Teslimat / Stok / MTO)
- [ ] Ayarlar → `activeDeliveryDate` bugün (veya hedef gün) olarak kayıtlı mı?
- [ ] Ürünler → satılacaklarda `isAvailable` açık; üretmeyeceklerde kapalı mı?
- [ ] Ürünler → sipariş üzerine (MTO) ürünlerde `madeToOrder` doğru mu?
- [ ] Siparişler → listede tercih saat penceresi chip’i ve “Sipariş üzerine” chip/filtre görünüyor mu?
- [ ] Checkout özet/onayda karışık sepet (MTO+günlük) için tek cümlelik saat/pencere notu var mı?
- [ ] Saf MTO sepetinde saat penceresi seçtirilmiyor / zorunlu değil mi?
- [ ] Saf MTO sipariş (`deliveryDate` boş) Dağıtım (`/admin/delivery-run`) ve drawer badge’de **görünmüyor** mu?
- [ ] Admin Siparişler’den MTO’ya bugünün `deliveryDate`’ini atayınca Dağıtım listesine düşüyor mu?

Beklenen sonuç:
- Sabah ayarları tutarlı; admin listede saat + MTO okunaklı.
- Boş `deliveryDate` dağıtıma sızmaz; teslim günü ataması sonrası run’a girer.

## 6) Hızlı Hata Kontrolü
- [ ] Uygulama analizi temiz mi kontrol et.
- [ ] Kritik akışlarda kırmızı hata ekranı/çökme olmadığını doğrula.

Beklenen sonuç:
- Analiz temiz.
- Bloklayıcı hata yok.
