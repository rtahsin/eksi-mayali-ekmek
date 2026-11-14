import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import {
  Lock,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Navigation,
  Database,
  Server,
} from "lucide-react";
import { CONTACT, SITE_NAME, SITE_URL } from "@/lib/site";
import { TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Gizlilik ve Çerez Politikası | EkmekLab",
  description:
    "EkmekLab gizlilik ilkeleri, zorunlu çerezler, tarayıcı yerel depolama anahtarları ve veri güvenliği politikası.",
  alternates: {
    canonical: `${SITE_URL}/gizlilik`,
  },
};

export default function GizlilikPage() {
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
          <span className="text-ink font-medium">Gizlilik & Çerez Politikası</span>
        </nav>

        {/* Page Header */}
        <div className="space-y-3 mb-10 border-b border-line pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-surface border border-line text-xs font-serif font-semibold text-ink">
            <Lock aria-hidden="true" className="w-4 h-4 text-accent" />
            <span>Veri Minimizasyonu & Şeffaf Depolama</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            Gizlilik ve Çerez Politikası
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted font-sans">
            Yürürlük Tarihi: 14 Kasım 2026 · Sürüm: {TERMS_VERSION} · {SITE_NAME}
          </p>
        </div>

        {/* Document Content */}
        <div className="space-y-7 text-sm leading-relaxed text-ink-muted font-sans">
          {/* 1. Gizlilik Taahhüdü */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink">
              1. Gizlilik İlkemiz
            </h2>
            <p className="text-xs sm:text-sm">
              {SITE_NAME} olarak ziyaretçilerimizin ve müşterilerimizin mahremiyetine
              saygı duyuyoruz. {SITE_URL} üzerinden gerçekleştirdiğiniz tüm bağlantılar
              HTTPS (SSL/TLS) ile şifrelenir; paylaştığınız bilgiler üçüncü taraf reklam
              ağlarına veya veri simsarlarına kesinlikle aktarılmaz.
            </p>
          </section>

          {/* 2. Ödeme Güvenliği */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-good shrink-0" />
              <span>2. Ödeme Güvenliği</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-1">
              <li>
                <strong className="text-ink">Kart Bilgisi Alınmaz ve Saklanmaz:</strong>{" "}
                İnternet sitemizde kredi veya banka kartı numarası, son kullanma tarihi ya
                da CVV kodu talep edilmez ve sunucularımızda tutulmaz.
              </li>
              <li>
                <strong className="text-ink">Kapıda Ödeme:</strong> Sipariş bedelleri
                yalnızca teslimat anında{" "}
                <strong className="text-ink">
                  Teslimatta Kapıda Nakit veya Teslimatta Kapıda Kredi/Banka Kartı (POS)
                </strong>{" "}
                ile tahsil edilir.
              </li>
            </ul>
          </section>

          {/* 3. Çerezler, localStorage ve funnel_events */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Database aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
              <span>
                3. Çerezler (Cookies), Tarayıcı Depolama Anahtarları ve Anonim Sayaç
              </span>
            </h2>
            <p className="text-xs sm:text-sm">
              Sitemizde üçüncü taraf reklam, yeniden pazarlama (remarketing) veya siteler
              arası takip çerezi <strong>kullanılmamaktadır</strong>. Yalnızca sitenin
              temel işlevleri için aşağıdaki zorunlu teknik kayıtlar kullanılır:
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm pl-1">
              <li>
                <strong className="text-ink">Zorunlu Oturum Çerezleri:</strong> Üye girişi
                yapan kullanıcıların oturumunun güvenli şekilde sürdürülmesi için Supabase
                Auth tarafından oluşturulan HTTP çerezleridir.
              </li>
              <li>
                <code className="font-mono text-xs text-ink">ekmeklab-cart-storage</code>{" "}
                <strong className="text-ink">(localStorage):</strong> Sepete eklediğiniz
                ürünlerin ve teslimat formu taslağının sayfa geçişlerinde kaybolmamasını
                sağlar.
              </li>
              <li>
                <code className="font-mono text-xs text-ink">
                  ekmeklab_device_orders_v1
                </code>{" "}
                <strong className="text-ink">(localStorage):</strong> Üye girişi yapmadan
                verilen siparişlerin sipariş numarası ve imzalı takip jetonunu aynı
                cihazdan tekrar görüntüleyebilmeniz için saklar; ad, telefon veya adres
                barındırmaz.
              </li>
              <li>
                <code className="font-mono text-xs text-ink">
                  ekmeklab_theme_preference
                </code>{" "}
                <strong className="text-ink">(localStorage):</strong> Gündüz, gece veya
                sistem teması tercihinizi hatırlar.
              </li>
              <li>
                <code className="font-mono text-xs text-ink">funnel_events</code>{" "}
                <strong className="text-ink">(Anonim Sayfa ve QR Sayacı):</strong> Ürün
                etiketlerindeki QR okutmalarını ve sepet adımlarını kişisel veri (isim,
                telefon, e-posta, açık IP adresi veya hesap kimliği) olmaksızın toplu
                istatistik sayacı olarak kaydeder.
              </li>
            </ul>
            <p className="text-xs text-ink-muted pt-1">
              Tarayıcı ayarlarınızdan çerezleri ve site verilerini dilediğiniz zaman
              temizleyebilirsiniz; bu durumda açık oturumunuz ve sepet taslağınız
              sıfırlanır.
            </p>
          </section>

          {/* 4. Konum Verisi (#konum-verisi) */}
          <section
            id="konum-verisi"
            className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line scroll-mt-24 shadow-2xs"
          >
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Navigation aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
              <span>4. İsteğe Bağlı Konum Verisi ve Açık Rıza</span>
            </h2>
            <p className="text-xs sm:text-sm">
              Sepet çekmecesindeki isteğe bağlı <strong>&quot;Konumumu ekle&quot;</strong>{" "}
              düğmesi yalnızca sizin açık rızanızla (KVKK Md. 5/1) çalışır ve yalnızca
              kuryemizin teslimat adresinizi bulması amacıyla tek seferlik enlem/boylam
              koordinatı alır. Arka planda sürekli izleme yapılmaz. Detaylı bilgiye{" "}
              <Link
                href="/kvkk#konum-verisi"
                className="underline font-semibold text-ink hover:text-accent"
              >
                KVKK Aydınlatma Metni — Konum Verisi
              </Link>{" "}
              bölümünden ulaşabilirsiniz.
            </p>
          </section>

          {/* 5. Bulut Altyapı İşleyenleri ve KVKK Md. 11 */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Server aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
              <span>
                5. Bulut Altyapı Hizmet Sağlayıcıları (KVKK Md. 8–9) ve Veri Sahibi Hakları
              </span>
            </h2>
            <p className="text-xs sm:text-sm">
              Teknik altyapımızda veri işleyen sıfatıyla{" "}
              <strong className="text-ink">Supabase</strong> (kimlik doğrulama ve şifreli
              veritabanı barındırma), isteğe bağlı hızlı giriş tercih edildiğinde{" "}
              <strong className="text-ink">Google OAuth</strong> (kimlik doğrulama) ve{" "}
              <strong className="text-ink">Sentry</strong> (uygulama hata izleme)
              hizmetlerinden KVKK Md. 8 ve Md. 9 güvenlik tedbirleri çerçevesinde
              yararlanılmaktadır.
            </p>
            <p className="text-xs sm:text-sm">
              6698 sayılı KVKK&apos;nın 11. maddesi uyarınca kişisel verilerinizin;{" "}
              <strong className="text-ink">(a)</strong> işlenip işlenmediğini öğrenme,{" "}
              <strong className="text-ink">(b)</strong> işlenmişse bilgi talep etme,{" "}
              <strong className="text-ink">(c)</strong> işlenme amacını ve amacına uygun
              kullanılıp kullanılmadığını öğrenme,{" "}
              <strong className="text-ink">(ç)</strong> yurt içinde veya yurt dışında
              aktarıldığı üçüncü kişileri bilme, <strong className="text-ink">(d)</strong>{" "}
              eksik veya yanlış işlenmişse düzeltilmesini isteme,{" "}
              <strong className="text-ink">(e)</strong> KVKK Md. 7 şartları çerçevesinde
              silinmesini veya yok edilmesini isteme,{" "}
              <strong className="text-ink">(f)</strong> düzeltme ve silme işlemlerinin
              aktarıldığı üçüncü kişilere bildirilmesini isteme,{" "}
              <strong className="text-ink">(g)</strong> münhasıran otomatik sistemlerle
              analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme
              ve <strong className="text-ink">(ğ)</strong> kanuna aykırı işleme sebebiyle
              zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına
              sahipsiniz.
            </p>
          </section>

          {/* 6. İletişim */}
          <section className="space-y-3 bg-cream-surface p-6 rounded-2xl border border-line shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Mail aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
              <span>6. Başvuru ve İletişim</span>
            </h2>
            <p className="text-xs sm:text-sm">
              Gizlilik ve çerez uygulamalarımızla ilgili her türlü soru ve KVKK
              başvurularınız için bizimle doğrudan iletişime geçebilirsiniz:
            </p>
            <div className="text-xs sm:text-sm text-ink-muted space-y-1 pt-1">
              <div>
                <strong className="text-ink">E-posta:</strong>{" "}
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="underline text-ink hover:text-accent"
                >
                  {CONTACT.email}
                </a>
              </div>
              <div>
                <strong className="text-ink">Telefon:</strong>{" "}
                <a
                  href={`tel:+${CONTACT.phoneE164}`}
                  className="underline text-ink hover:text-accent"
                >
                  {CONTACT.phoneDisplay}
                </a>
              </div>
              <div>
                <strong className="text-ink">Bölge:</strong> {CONTACT.area}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
      <CartDrawer />
      <OrderSuccessModal />
    </div>
  );
}
