# UX Review (User Perspective)

Last updated: 2026-03-14

## İnceleme Kapsamı

- Canlı domain uç noktaları (home, admin-mobile, manifest, robots, sitemap)
- Yayınlama konfigürasyonu (`web/index.html`, `firebase.json`)
- Ana kullanıcı akışı (`lib/routes.dart`, `lib/screens/home_screen.dart`)

## Güçlü Yönler

- Görsel kimlik ve marka dili tutarlı.
- PWA temelleri mevcut (manifest, ikonlar, shortcutlar).
- Ürün-sepet-checkout akışı anlaşılır.
- Header ve sepet etkileşimi belirgin.

## Problemler

1. Sitemap endpoint valid XML olarak parse edilemiyor.
2. Kategori filtresinde sonuç yoksa fallback tüm ürünlere dönüyor.
3. Bazı gezinmeler route yerine local state ile yürütülüyor (URL/deep-link zayıf).
4. Kullanıcı manifestinde admin shortcut görünmesi potansiyel kafa karışıklığı yaratıyor.
5. Service worker devre dışı; tekrar ziyaret performansı/PWA hissi düşebiliyor.

## Öncelikli Aksiyonlar

- P0: Sitemap düzeltmesi
- P0: Filtre “no results” davranışının düzeltilmesi
- P1: Route tabanlı gezinme standardizasyonu
- P1: User/Admin manifest ayrıştırmasının sadeleştirilmesi
- P2: Service worker sorununun kök neden analizi ve kontrollü geri alma

## Kabul Kriterleri

- Kullanıcı aramada/filtrelemede beklenen sonuçları net görüyor.
- Back/forward, URL paylaşımı ve doğrudan URL açılışı tutarlı.
- Search Console’da sitemap hatası yok.
