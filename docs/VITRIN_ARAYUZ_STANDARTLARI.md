# Atölye Kremi ortak arayüz standardı

17 Kasım 2026 — yerel uygulama ve doğrulama notları.

## Uygulanan kapsam

Üst menü, menü çekmecesi, altbilgi, mobil sepet çubukları, ürün detayındaki işlem alanı, ürün penceresi, sepet ve giriş pencereleri, sipariş başarısı ve tekrar sipariş seçimi ortak kontrol stillerini kullanır. Hesap, adres, profil, sipariş geçmişi, kodla sorgulama ve takip ekranları da aynı standarda geçirildi.

Ürün kartları, katalog yerleşimi, fotoğraflar, 360° sahneler, açılış yüksekliği ve sayfa bölüm sırası korunur. Admin, kurye ve finans bu stilleri kullanmaz. Bu çalışmada HTTP API, şema, iptal yetkilendirmesi veya sipariş kuralları değiştirilmedi. Aynı gün siparişi için saat sınırı eklenmedi. Önceden çalışma ağacında bulunan değişiklikler korundu; canlı yayın yapılmadı.

## Kodda kullanım

- Stil seçenekleri: `src/types/storefront-ui.ts` ve `src/lib/design/storefront.ts`.
- Yalnız eklenen sınıflarla çalışan CSS: `src/app/storefront-ui.css`. Genel `button`, `input` veya eski artisan sınıfları üzerine renk zorlaması yoktur.
- `storefrontAction({ variant, size, className })`: `primary`, `secondary`, `quiet`, `danger`; `default` ve `icon`. Gerçek düğmeler ve gerçek bağlantılar aynı görünümü kullanır; gezinme bağlantı olarak kalır.
- `sf-field`, `sf-label`, `sf-panel`, `sf-notice`, `sf-badge`, `sf-choice`, `sf-nav-link` ve `sf-dialog` ortak stillerdir. Form alanları 16 px, açıklamalar 14 px; eylemler en az 48 px ve simge/kompakt gezinme en az 44 px olur.
- Kontrol köşeleri 12 px, paneller 16 px, merkez pencereler 24 px; panel dolgusu 16/24 px ve sayfa kenarları 16/24/32 px ölçeğindedir.
- `sf-on-accent`, `sf-control-line`, `sf-error-ink`, `sf-success-ink`, `sf-warning-ink` gündüz/gece rolleridir. Ana düğme gündüz beyaz, gece koyu mürekkep yazı kullanır. Metin çiftleri ≥4,5:1; kontrol sınırı ve odak ≥3:1 test edilir.
- Para gösterimi: `formatMoney` (`src/lib/format/currency.ts`). Örnek: `250 ₺`, `1.250,50 ₺`; sayı ve birim arasında bölünmeyen boşluk bulunur. Bilinmeyen tutar `—` olur. API'ye gönderilen sayılar değişmez. Sepetin hazırladığı WhatsApp metni de aynı biçimi kullanır.
- Ölçüler `formatProductAmount`, tarihler mevcut İstanbul yardımcılarından gelir. Kapsam dışındaki ürün kartlarının fiyat sunumu bu çalışmayla değiştirilmedi.
- Ortak adlar: “Sepete ekle”, “Sepeti aç”, “Siparişi onayla”, “Siparişi takip et”, “Siparişi bul”, “Tekrar sipariş ver”, “Alışverişe dön”. Hesaptaki geçmiş liste “Siparişlerim” olarak kalır. Hukuki, bilimsel ve ürün açıklaması metinleri bu dil düzenlemesine dahil değildir.

## Gezinme ve erişilebilirlik

Menü, çekmece ve altbilgi `content/nav/links.ts` tanımlarından gelir. “Mandıra & Şarküteri” için mevcut `/#gurme-lezzetler` adresi korunur; katalogdaki eski hash hedeflerine dokunulmadı. Özellik bayrakları aynı merkezi görünürlük filtresinden geçer. Hesap ve araçların kendi gezinmesi korunur.

İki sipariş iptal penceresi ortak yerel `<dialog>` bileşenini kullanır. Bekleyen işlemde `dismissible={false}` hem yerel kapatmayı hem eski tarayıcıdaki `cancel` davranışını engeller. Arka plan, Escape ve odak yönetimi tarayıcıya bırakılır; ek odak tuzağı veya kök kaydırma kilidi yoktur. Eski tarayıcılar için mevcut arka plana tıklama uyumu korunur.

Ürün sekmeleri karşılıklı `aria-controls`/`aria-labelledby`, roving `tabIndex`, seçili alt çizgi ve yön tuşları/Home/End desteği kullanır. Tarayıcının yalnız `focusGroup` özelliğini sunması yeterli olmadığından, tuş davranışı küçük bir bağımlılıksız uyum koduyla güvenceye alındı. Gizli paneller DOM'da kalır.

Hatalı alana odak ve alanla ilişkili açıklama eklenir. Başarı ve hata durumlarında metin ve simge birlikte kullanılır. Hareket azaltma tercihi korunur. Mobil sepet çubuğu bulunan sayfalarda kaydırma boşluğu, odaktaki düğmenin çubuğun altında kalmasını engeller.

## Yerel doğrulama

Gerçek bileşenleri kullanan geçici bir kontrol sayfasında API istekleri kontrollü örneklerle karşılandı; diğer `/api/**` işlemleri engellendi. Gerçek sipariş, ödeme, adres kaydı veya iptal yapılmadı. Kontrol sayfası ve geçici auth dışa aktarımı teslimden önce kaldırıldı.

- Temel matris: 320×640, 390×844, 768×1024, 1440×900; gündüz/gece; ürün işlemleri, adres formu, geçmiş, sorgulama, takip, menü, giriş, sepet, ürün penceresi ve başarı penceresi. Toplam 80 temel kombinasyon ve ek durum kayıtları.
- Ortak eylem/dokunma alanları ve form alanları ölçüldü; sayfa/pencere yatay taşması kontrol edildi. Ek durumlarda uzun Türkçe ürün adı, uzun adres ve `1.250.000,50 ₺` tutar denendi.
- %200 yeniden akış kontrolü 768 px görünümde CSS yakınlaştırmasıyla yapıldı. Bu, fiziksel cihaz veya tarayıcı menüsündeki zoom testi değildir; Safari/iOS cihaz testi yapılmadı.
- Tab/Shift+Tab, Enter, Escape, sekme yön tuşları/Home/End, panel odağı, iç içe pencere ve arka plana tıklama denendi. Kapanan pencerenin odağı açan kontrole döndü.
- Sepeti açınca adet değişmedi. Tekrar siparişten vazgeçince mevcut 3 ürün korundu; açık “Mevcut sepete ekle” seçimiyle 4 oldu. Aynı gün seçilebildi. Kontrollü uygunluk değişiminde yeni gün ve gerekçe görünür açıklamayla gösterildi.
- Eksik checkout bilgisinde telefon alanına odaklandı; alanın alt kenarı 455,5 px, sabit onay düğmesinin üstü 781 px ölçüldü. 320 px ürün ekranında odaklanan eylem, sepet çubuğunun üstünde kaldı.
- Gerçek anasayfada 1440 px görünümde üst menü, katalog içeriği ve altbilgi içerik kenarları aynı ölçüldü: 171–1259 px. Aynı “Mandıra & Şarküteri” bağlantısına tekrar tıklama mevcut hash'i korudu.
- OAuth yapılandırması bulunmayan yerel ortamda girişin devre dışı durumu ve misafir devamı kontrol edildi. Gerçek Google/OAuth oturumu açılmadı.

Otomatik kapılar sırasıyla tamamlandı: `npm run typecheck` başarılı; `npm test` 83 dosyada 569 test başarılı; `npm run build` başarılı (163 statik sayfa üretildi). Yalıtılmış derleme ilerleme vermediği için durduruldu; aynı üretim derlemesi yerel süreçte başarıyla tamamlandı. `git diff --check` hata vermedi.

Kontrast testleri doğrudan teslim edilen CSS rollerini ve mevcut gündüz/gece B/gece A/eski gece paletlerini okur. Para testleri tam/küsuratlı/büyük/eksik tutarları; bağlantı testleri değiştirilmiş tıklama ile aynı hash'e dönüşü kapsar. Kontrol dökümünde 96 temel/ek durum kaydı vardır; ölçüm hatası yoktur. Ürün kartı, katalog, görsel sahne, açılış, admin örnekleri, sipariş tarihi/ayar kuralları ve `MERKEZ.md` dosyalarının çalışma başındaki hash'leriyle son halleri eşittir.

Başvurulan arayüz ölçütleri: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md); modern-web-guidance `forms`, `brand-consistent-forms`, `dialog`, `tabs` rehberleri. Yeni UI paketi eklenmedi.

## Önce / sonra

Kayıtlar `output/ux-consistency/` altında; ölçüm dökümü `browser-matrix.json`, diğer görünümler `after-*.jpg` dosyalarıdır. Bunlar kontrollü ürünler içeren yerel arayüz örnekleridir.

Önce, 390 px gece sepeti:

![Önce: sepet](../output/ux-consistency/before-cart-dark-390.jpg)

Sonra, aynı boyut ve temada sepet:

![Sonra: ortak sepet stilleri](../output/ux-consistency/after-cart-dark-390.jpg)

Ek karşılaştırmalar: [önce ürün](../output/ux-consistency/before-product-dark-390.jpg), [sonra ürün](../output/ux-consistency/after-products-dark-390.jpg), [önce adres](../output/ux-consistency/before-address-dark-390.jpg), [sonra adres](../output/ux-consistency/after-address-dark-390.jpg).
