# Admin Operasyon Runbook

Tarih: 2026-08-04

Tek fırın / tek süperadmin. Başarı: müşteri sipariş verir → admin görür → teslim eder → kaydeder.

## Giriş

| Yer | URL / rota |
|-----|------------|
| Admin giriş | `/admin/login` |
| Mobil ops | `/admin-mobile` → `/admin/orders` |
| Siparişler (varsayılan) | `/admin/orders` |
| Dağıtım | `/admin/delivery-run` |
| Tam panel | `/admin` |

Yetki: `adminler` koleksiyonu + Firebase claims. Legacy teslimat takvimi / üretim başlangıcı menüde gizli.

**Rol notu:** Claim `isAdmin` (boolean) panele giriş kapısıdır; menü/yazma yetkisi `adminler.role` ile gelir (`admin`/`superadmin` = ürün+ayar, `support` = sipariş/dağıtım, `editor` = blog). Ayarlar tek ekran: `/admin/settings` → `AdminSettings` (`activeDeliveryDate`).

Oturum: Web’de Firebase `Persistence.LOCAL` — tarayıcı kapansa bile admin oturumu kalır; login sayfası oturum açıksa otomatik siparişlere yönlendirir.

---

## Android Chrome — Ana ekrana ekle + bildirim

1. Chrome’da `https://…/admin/orders` (veya `/admin/login`) açın.
2. Menü (⋮) → **Ana ekrana ekle** / **Uygulamayı yükle** — PWA adı: **EkmekLab Ops**.
3. İlk açılışta bildirim izni isteğini **İzin ver** deyin (yeni sipariş push için).
4. Ana ekran ikonundan açın; oturum açıksa doğrudan Siparişler gelir.

---

## Sabah ritüeli (günlük)

1. **Ayarlar** → aktif teslimat tarihini (`activeDeliveryDate`) bugüne (veya hedeflenen güne) ayarla, kaydet.
2. **Ürünler** → satılacak ürünlerde satış **aç**; stok yoksa / üretmeyeceksen **kapat** (`isAvailable` — sipariş yine alınır, teslimat yarına kayar).
3. **Ürünler** → sipariş üzerine (MTO) ürünlerin `madeToOrder` işaretini doğrula; müşteriye “fırın bildirir” mesajı görünmeli.
4. **Siparişler** → müşteri siparişlerini takip et; listede tercih saat penceresi (`preferredDeliveryWindow`) ve MTO chip’lerini kontrol et. Saf MTO’ya teslim günü (`deliveryDate`) atamadan dağıtıma düşmez. WhatsApp siparişlerini **Manuel Sipariş** ile gir.
5. Gün / üretim bitince **Ürünler** → satış **kapat**.
6. **Dağıtım** → bugünkü listeyi aç, teslim ettikçe **Teslim edildi**.

Ödeme notu (vitrin): Kapıda nakit veya POS.

---

## Hızlı bakış

- **Siparişler / Ürünler / Dağıtım / Ayarlar** — ana menü; kategoriler “Seyrek” / Daha fazla altında.
- Kapalı ürün (`isAvailable=false`) + açık ürün karışık sepet → tüm siparişin `deliveryDate` yarın.
- Aktif teslimat tarihi yoksa varsayılan: yarın.
- MTO + günlük karışık sepet → günlük kalemlerde seçilen saat penceresi geçerli; MTO için günü fırın bildirir.
- Saf MTO sipariş (`deliveryDate` boş/null) **dağıtım koşusuna düşmez**; Siparişler ekranından teslim günü atanınca o günün run listesine girer.
- Günlük max adet sayacı yok; satış aç/kapa (`isAvailable`) ile yönetilir.

---

## Sorun giderme

| Sorun | Çözüm |
|-------|--------|
| Admin giremiyorum | `adminler/{uid}` + `isActive: true` |
| Dağıtımda sipariş yok | `deliveryDate` bugün mü? Durum pending/processing/ready mi? Saf MTO ise admin teslim günü atadı mı? |
| MTO dağıtıma sızdı | Boş `deliveryDate` artık run’a girmez; eski fallback kaldırıldı. Teslim gününü Siparişler’den verin. |
| Manuel sipariş reddedildi | Admin oturumu + geçerli telefon / adres |

---

## İletişim (müşteriye)

Telefon / WhatsApp: **0501 012 66 53** (`wa.me/905010126653`)

---

## Görsel / vitrin notları (kısa)

- Banner: en fazla **3–4** slayt; her slaytta **tek mesaj**.
- Fotoğrafta zaten yazı varsa admin UI **başlık/altı metni boş** bırakmalı (üst üste yazı olmasın).
- Ürün fotoğrafları **sahibin kendi çekimleri** — stok/Unsplash fallback kullanılmaz.
- Kategori: bozuk görsel yerine ikon kabul edilir; ana sayfada hafif chip şeridi yeter.
- Ürün görsellerini karartma filtresi kullanma; fotoğraf net kalsın.
