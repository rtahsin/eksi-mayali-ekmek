import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import {
  ShieldCheck,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Navigation,
  Database,
  Server,
} from "lucide-react";
import { CONTACT, SITE_NAME, SITE_URL } from "@/lib/site";
import { TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni | EkmekLab",
  description:
    "6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca EkmekLab aydınlatma metni, konum verisi açık rıza bilgilendirmesi ve veri sahibi hakları.",
  alternates: {
    canonical: `${SITE_URL}/kvkk`,
  },
};

export default function KvkkPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-accent/20 selection:text-ink relative">
      <Navbar />

      <main className="flex-1 py-10 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Breadcrumb */}
        <nav
          aria-label="Sayfa konumu"
          className="mb-6 flex items-center gap-2 text-xs font-sans text-ink-muted"
        >
          <Link
            href="/"
            className="hover:text-accent transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5" />
            <span>Ana Sayfa</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink font-medium">KVKK Aydınlatma Metni</span>
        </nav>

        {/* Page Header */}
        <div className="space-y-3 mb-10 border-b border-line pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-surface border border-line text-xs font-serif font-semibold text-ink">
            <ShieldCheck aria-hidden="true" className="w-4 h-4 text-accent" />
            <span>6698 Sayılı Kişisel Verilerin Korunması Kanunu Uyarınca</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            Kişisel Verilerin Korunması Aydınlatma Metni
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted font-sans">
            Yürürlük Tarihi: 14 Kasım 2026 · Sürüm: {TERMS_VERSION} · {SITE_NAME}
          </p>
        </div>

        {/* Document Content */}
        <div className="space-y-7 text-sm leading-relaxed text-ink-muted font-sans">
          {/* 1. Veri Sorumlusu */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink">
              1. Veri Sorumlusunun Kimliği
            </h2>
            <p className="text-xs sm:text-sm">
              6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca{" "}
              <strong className="text-ink">{SITE_NAME} Artisan Fırın</strong> veri sorumlusu
              sıfatıyla kişisel verilerinizi aşağıda açıklanan amaçlar, hukuki sebepler ve
              veri minimizasyonu ilkeleri çerçevesinde hukuka ve dürüstlük kurallarına
              uygun olarak işlemekte ve muhafaza etmektedir.
            </p>
            <div className="pt-2 text-xs sm:text-sm text-ink-muted space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
                <span>
                  <strong className="text-ink">Faaliyet Bölgesi:</strong> {CONTACT.area}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
                <span>
                  <strong className="text-ink">Telefon:</strong>{" "}
                  <a
                    href={`tel:+${CONTACT.phoneE164}`}
                    className="underline text-ink hover:text-accent"
                  >
                    {CONTACT.phoneDisplay}
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
                <span>
                  <strong className="text-ink">E-posta:</strong>{" "}
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="underline text-ink hover:text-accent"
                  >
                    {CONTACT.email}
                  </a>
                </span>
              </div>
            </div>
          </section>

          {/* 2. İşlenen Kişisel Veriler */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink">
              2. İşlenen Kişisel Veri Kategorileri
            </h2>
            <p className="text-xs sm:text-sm">
              {SITE_URL} internet sitesi üzerinden sipariş oluştururken veya üye hesabı
              kullanırken yalnızca hizmetin gerektirdiği aşağıdaki veriler işlenir:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-1">
              <li>
                <strong className="text-ink">Kimlik Bilgileri:</strong> Ad ve soyad.
              </li>
              <li>
                <strong className="text-ink">İletişim Bilgileri:</strong> Cep telefonu
                numarası, teslimat adresi (mahalle, cadde/sokak, bina/daire no, adres
                tarifi) ve üye girişi yapılması halinde e-posta adresi.
              </li>
              <li>
                <strong className="text-ink">
                  Müşteri İşlem ve Ön Muhasebe Bilgileri:
                </strong>{" "}
                Sipariş numarası, sipariş kalemleri, seçilen teslim tarihi, kapıda ödeme
                yöntemi tercihi (nakit veya POS), teslimat fişi ve kurumsal/düzenli
                müşterilerde cari hesap hareket kayıtları.
              </li>
              <li>
                <strong className="text-ink">
                  Konum Verisi (Yalnızca Açık Rızanız İle):
                </strong>{" "}
                Sepette isteğe bağlı &quot;Konumumu ekle&quot; düğmesini kullandığınızda
                alınan tek seferlik GPS koordinatı (enlem, boylam) ve rıza zaman damgası.
              </li>
              <li>
                <strong className="text-ink">İşlem Güvenliği Verileri:</strong> Kötüye
                kullanımı engellemek amacıyla tek yönlü kriptografik özet (hash) olarak
                işlenen IP hız sınırı anahtarı, oturum bilgileri, sözleşme onay sürümü (
                <code className="font-mono text-xs text-ink">terms_version</code>) ve onay
                zaman damgası.
              </li>
            </ul>
          </section>

          {/* 3. Konum Verisi ve Açık Rıza (#konum-verisi) */}
          <section
            id="konum-verisi"
            className="space-y-3 bg-cream-surface p-6 rounded-2xl border-2 border-accent/50 scroll-mt-24 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Navigation aria-hidden="true" className="w-5 h-5 text-accent shrink-0" />
              <h2 className="font-serif text-lg font-bold text-ink">
                3. Konum Verisi İşleme ve Açık Rıza Aydınlatması
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-ink">
              Sipariş ekranında yer alan isteğe bağlı{" "}
              <strong>&quot;Konumumu ekle&quot;</strong> özelliği, 6698 sayılı KVKK Madde
              5/1 uyarınca <strong>açık rızanıza</strong> dayanır. Konum paylaşmayı tercih
              etmemeniz halinde siparişiniz hiçbir kısıtlamaya uğramaz ve açık adres
              bilginiz üzerinden teslim edilir.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-1">
              <li>
                <strong className="text-ink">Toplanma Yöntemi ve Kapsamı:</strong> Yalnızca
                sizin düğmeye basmanız ve tarayıcı izin penceresini onaylamanız üzerine
                cihazınızın Geolocation API&apos;sinden tek seferlik anlık enlem/boylam
                bilgisi alınır; arka planda veya sürekli konum izlemesi yapılmaz.
              </li>
              <li>
                <strong className="text-ink">İşleme Amacı:</strong> Yalnızca teslimat
                görevlimizin bina girişinizi gecikmeden bulabilmesi amacıyla ilgili
                siparişin teslimat ekranında yol tarifi bağlantısı olarak kullanılır.
              </li>
              <li>
                <strong className="text-ink">Rızayı Geri Alma ve Silme:</strong> Siparişi
                onaylamadan önce sepetteki <em>&quot;kaldır&quot;</em> düğmesiyle konumu
                anında temizleyebilir; onaylanmış bir siparişteki konum kaydının
                silinmesini <strong className="text-ink">{CONTACT.email}</strong> veya{" "}
                <strong className="text-ink">{CONTACT.phoneDisplay}</strong> üzerinden her
                zaman talep edebilirsiniz.
              </li>
            </ul>
          </section>

          {/* 4. Anonim Sayfa/QR Sayacı (funnel_events) ve Tarayıcı localStorage */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Database aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
              <span>
                4. Anonim Etkileşim Sayacı (funnel_events) ve Tarayıcı Yerel Depolama
                Anahtarları
              </span>
            </h2>
            <p className="text-xs sm:text-sm">
              {SITE_NAME}, üçüncü taraf reklam ağları veya davranışsal profilleme çerezleri
              kullanmaz. Bunun yerine şeffaf ve veri minimizasyonuna dayalı iki teknik yapı
              bulunur:
            </p>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-bg border border-line space-y-1">
                <div className="font-semibold text-ink">
                  • Anonim Sayfa ve QR Sayacı (
                  <code className="font-mono text-xs">funnel_events</code>):
                </div>
                <p>
                  Ekmek etiketlerindeki QR yönlendirmelerinin (<code className="font-mono text-xs">/e/...</code>)
                  ve genel sepet adımlarının toplu sayımını tutan, içinde ad, soyad,
                  telefon, e-posta, açık IP adresi veya kullanıcı kimliği barındırmayan
                  anonim sayaçtır. Reklam ağlarıyla paylaşılmaz.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-bg border border-line space-y-1.5">
                <div className="font-semibold text-ink">
                  • Tarayıcı Yerel Depolama (<code className="font-mono text-xs">localStorage</code>) Anahtarları:
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>
                    <code className="font-mono text-xs text-ink">ekmeklab-cart-storage</code>
                    : Sayfa yenilendiğinde sepetinizdeki ürünlerin ve yazdığınız teslimat
                    formu taslağının kaybolmaması için tarayıcınızda tutulur.
                  </li>
                  <li>
                    <code className="font-mono text-xs text-ink">
                      ekmeklab_device_orders_v1
                    </code>
                    : Üye girişi yapmadan verdiğiniz siparişlerin sipariş numarasını ve
                    imzalı takip anahtarını aynı cihazdan &quot;Sipariş Sorgula&quot;
                    ekranında tekrar görebilmeniz için saklar (isim/telefon/adres saklamaz).
                  </li>
                  <li>
                    <code className="font-mono text-xs text-ink">
                      ekmeklab_theme_preference
                    </code>
                    : Seçtiğiniz açık, koyu veya sistem görünüm tercihini hatırlar.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. İşlenme Amaçları ve Hukuki Sebepler */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink">
              5. Kişisel Verilerin İşlenme Amaçları ve Hukuki Sebepleri
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-1">
              <li>
                <strong className="text-ink">
                  Sözleşmenin Kurulması ve İfası (KVKK Md. 5/2-c):
                </strong>{" "}
                Siparişin alınması, fırın üretim planlaması, kurye ile kapıya teslimat ve
                teslimat günü/saati bilgilendirmelerinin yapılması.
              </li>
              <li>
                <strong className="text-ink">
                  Hukuki Yükümlülüğün Yerine Getirilmesi (KVKK Md. 5/2-ç):
                </strong>{" "}
                Mesafeli satış mevzuatı onay kayıtlarının, teslimat/tahsilat fişlerinin ve
                vergi/muhasebe belgelerinin yasal saklama süreleri boyunca muhafazası.
              </li>
              <li>
                <strong className="text-ink">
                  Meşru Menfaat ve İşlem Güvenliği (KVKK Md. 5/2-f):
                </strong>{" "}
                Temel hak ve özgürlüklerinize zarar vermemek kaydıyla sistem güvenliğinin
                sağlanması, sahte sipariş ve kötüye kullanım denemelerinin engellenmesi.
              </li>
              <li>
                <strong className="text-ink">Açık Rıza (KVKK Md. 5/1):</strong> Yalnızca
                müşterinin kendi isteğiyle &quot;Konumumu ekle&quot; düğmesini kullandığı
                hallerde tek seferlik teslimat koordinatının işlenmesi.
              </li>
            </ul>
          </section>

          {/* 6. Aktarım ve Bulut Altyapı İşleyenleri (KVKK Md. 8–9) */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Server aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
              <span>
                6. Kişisel Verilerin Aktarımı ve Bulut Altyapı İşleyenleri (KVKK Md. 8–9)
              </span>
            </h2>
            <p className="text-xs sm:text-sm">
              Kişisel verileriniz üçüncü kişilere reklam veya pazarlama amacıyla{" "}
              <strong className="text-ink">kesinlikle satılmaz ve devredilmez</strong>.
              Verileriniz yalnızca KVKK&apos;nın 8. ve 9. maddelerine uygun teknik ve idari
              tedbirler altında aşağıdaki alıcı gruplarıyla sınırlı olarak paylaşılır:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-1">
              <li>
                <strong className="text-ink">Teslimat ve Resmi Merciler:</strong> Siparişin
                adrese ulaştırılması için kendi fırın teslimat görevlimiz ve kanuni bir
                yükümlülük doğması halinde yetkili kamu kurum ve kuruluşları.
              </li>
              <li>
                <strong className="text-ink">Supabase (Veritabanı ve Kimlik Doğrulama):</strong>{" "}
                Sipariş, hesap ve oturum verilerinin şifreli bulut veritabanında
                barındırılması amacıyla veri işleyen sıfatıyla kullanılır.
              </li>
              <li>
                <strong className="text-ink">
                  Google OAuth (İsteğe Bağlı Hızlı Giriş):
                </strong>{" "}
                Yalnızca &quot;Google ile Giriş Yap&quot; seçeneğini tercih eden
                kullanıcılarda kimlik doğrulama işleminin gerçekleştirilmesi amacıyla
                kullanılır.
              </li>
              <li>
                <strong className="text-ink">Sentry (Teknik Hata İzleme):</strong>{" "}
                Uygulamadaki beklenmeyen yazılım hatalarının tespiti ve giderilmesi
                amacıyla teknik hata kayıtları işlenir.
              </li>
            </ul>
          </section>

          {/* 7. KVKK Madde 11 Hakları (a–ğ eksiksiz) */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink">
              7. KVKK Madde 11 Kapsamındaki Haklarınız
            </h2>
            <p className="text-xs sm:text-sm">
              İlgili kişi olarak KVKK&apos;nın 11. maddesinin 1. fıkrası uyarınca veri
              sorumlusuna başvurarak aşağıdaki tüm haklara sahipsiniz:
            </p>
            <ol className="space-y-1.5 text-xs sm:text-sm pl-1">
              <li>
                <strong className="text-ink">a)</strong> Kişisel verilerinizin işlenip
                işlenmediğini öğrenme,
              </li>
              <li>
                <strong className="text-ink">b)</strong> Kişisel verileriniz işlenmişse
                buna ilişkin bilgi talep etme,
              </li>
              <li>
                <strong className="text-ink">c)</strong> Kişisel verilerinizin işlenme
                amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,
              </li>
              <li>
                <strong className="text-ink">ç)</strong> Yurt içinde veya yurt dışında
                kişisel verilerinizin aktarıldığı üçüncü kişileri bilme,
              </li>
              <li>
                <strong className="text-ink">d)</strong> Kişisel verilerinizin eksik veya
                yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,
              </li>
              <li>
                <strong className="text-ink">e)</strong> KVKK&apos;nın 7. maddesinde
                öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok
                edilmesini isteme,
              </li>
              <li>
                <strong className="text-ink">f)</strong> (d) ve (e) bentleri uyarınca
                yapılan işlemlerin, kişisel verilerinizin aktarıldığı üçüncü kişilere
                bildirilmesini isteme,
              </li>
              <li>
                <strong className="text-ink">g)</strong> İşlenen verilerinizin münhasıran
                otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir
                sonucun ortaya çıkmasına itiraz etme,
              </li>
              <li>
                <strong className="text-ink">ğ)</strong> Kişisel verilerinizin kanuna
                aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın
                giderilmesini talep etme.
              </li>
            </ol>
            <p className="pt-2 text-xs sm:text-sm">
              Yukarıdaki haklarınıza ilişkin taleplerinizi, Veri Sorumlusuna Başvuru Usul
              ve Esasları Hakkında Tebliğ uyarınca{" "}
              <a
                href={`mailto:${CONTACT.email}`}
                className="underline font-semibold text-ink hover:text-accent"
              >
                {CONTACT.email}
              </a>{" "}
              e-posta adresimize yazılı olarak iletebilirsiniz. Başvurularınız talebin
              niteliğine göre en kısa sürede ve en geç 30 (otuz) gün içinde ücretsiz olarak
              sonuçlandırılır.
            </p>
          </section>
        </div>
      </main>

      <Footer />
      <CartDrawer />
      <OrderSuccessModal />
    </div>
  );
}
