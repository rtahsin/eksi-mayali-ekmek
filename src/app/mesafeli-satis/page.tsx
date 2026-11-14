import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import {
  FileText,
  ArrowLeft,
  Truck,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Scale,
} from "lucide-react";
import { CONTACT, SITE_NAME, SITE_URL } from "@/lib/site";
import { TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Ön Bilgilendirme Formu & Mesafeli Satış Sözleşmesi | EkmekLab",
  description:
    "EkmekLab Ön Bilgilendirme Formu, Mesafeli Satış Sözleşmesi, teslimat koşulları ve taze gıda cayma hakkı esasları.",
  alternates: {
    canonical: `${SITE_URL}/mesafeli-satis`,
  },
};

export default function MesafeliSatisPage() {
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
          <span className="text-ink font-medium">
            Ön Bilgilendirme & Mesafeli Satış
          </span>
        </nav>

        {/* Page Header */}
        <div className="space-y-3 mb-8 border-b border-line pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-surface border border-line text-xs font-serif font-semibold text-ink">
            <FileText aria-hidden="true" className="w-4 h-4 text-accent" />
            <span>6502 Sayılı TKHK & Mesafeli Sözleşmeler Yönetmeliği</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted font-sans">
            Yürürlük Tarihi: 14 Kasım 2026 · Sürüm: {TERMS_VERSION} · {SITE_NAME}
          </p>
          <div className="pt-2 flex flex-wrap gap-2 text-xs font-sans">
            <a
              href="#bolum-1-on-bilgilendirme"
              className="px-3 py-1.5 rounded-xl bg-cream-surface border border-line text-ink font-semibold hover:border-accent transition-colors"
            >
              Bölüm I — Ön Bilgilendirme Formu
            </a>
            <a
              href="#bolum-2-mesafeli-satis"
              className="px-3 py-1.5 rounded-xl bg-cream-surface border border-line text-ink font-semibold hover:border-accent transition-colors"
            >
              Bölüm II — Mesafeli Satış Sözleşmesi
            </a>
          </div>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-ink-muted font-sans">
          {/* ========================================================= */}
          {/* BÖLÜM I — ÖN BİLGİLENDİRME FORMU                          */}
          {/* ========================================================= */}
          <section
            id="bolum-1-on-bilgilendirme"
            className="space-y-5 scroll-mt-24"
          >
            <div className="border-b border-line pb-3">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
                Bölüm I
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink mt-0.5">
                Ön Bilgilendirme Formu
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                6502 sayılı Tüketicinin Korunması Hakkında Kanun&apos;un 48. maddesi ve
                Mesafeli Sözleşmeler Yönetmeliği&apos;nin 5–7. maddeleri uyarınca
                sipariş onayından önce Alıcı&apos;ya sunulan zorunlu ön bilgilerdir.
              </p>
            </div>

            {/* 1.1 Satıcı Bilgileri */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink">
                1. Satıcı Kimlik ve İletişim Bilgileri
              </h3>
              <div className="text-xs sm:text-sm text-ink-muted space-y-1.5 pl-3 border-l-2 border-accent/40">
                <div>
                  <strong className="text-ink">Ticari Unvan / İşletme Adı:</strong>{" "}
                  {SITE_NAME} Artisan Fırın
                </div>
                <div>
                  <strong className="text-ink">Faaliyet ve Dağıtım Bölgesi:</strong>{" "}
                  {CONTACT.area}
                </div>
                <div>
                  <strong className="text-ink">Telefon / Müşteri İletişim:</strong>{" "}
                  <a
                    href={`tel:+${CONTACT.phoneE164}`}
                    className="underline text-ink hover:text-accent"
                  >
                    {CONTACT.phoneDisplay}
                  </a>
                </div>
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
                  <strong className="text-ink">İnternet Adresi:</strong>{" "}
                  <span className="text-ink">{SITE_URL}</span>
                </div>
              </div>
            </div>

            {/* 1.2 Ürün Nitelikleri, Alerjen ve Çiğ Süt Uyarısı */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <ShieldAlert aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
                <span>
                  2. Sözleşme Konusu Ürünlerin Temel Nitelikleri, Alerjen ve Çiğ Süt Bilgilendirmesi
                </span>
              </h3>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm pl-1">
                <li>
                  Sözleşme konusu ürünlerin cinsi, gramajı/hacmi, adedi, KDV dahil birim
                  fiyatı, varsa teslimat ücreti ve genel toplam tutarı sipariş onaylanmadan
                  önce sepet çekmecesinde açıkça gösterilir.
                </li>
                <li>
                  <strong className="text-ink">TGK Ek-1 Alerjen Bildirimi:</strong> Türk
                  Gıda Kodeksi Gıda Etiketleme ve Tüketicileri Bilgilendirme Yönetmeliği
                  Ek-1 kapsamındaki alerjen maddeler (gluten içeren tahıllar, süt ve süt
                  ürünleri, yumurta, sert kabuklu meyveler, susam vb.) hem ürün inceleme
                  ekranında hem sepet özetinde sipariş onayından önce Alıcı&apos;nın
                  bilgisine sunulur. Üretim tezgâhlarımızda iz miktarda çapraz temas
                  bulunabilir.
                </li>
                <li>
                  <strong className="text-ink">
                    TGK Tebliğ No: 2017/20 Çiğ Süt Uyarısı:
                  </strong>{" "}
                  Çiğ süt siparişlerinde ürün <em>&quot;Çiğ süttür, kullanmadan önce
                  kaynatınız&quot;</em> zorunlu uyarısına tabidir; teslim alındıktan sonra{" "}
                  <strong className="text-ink">+0°C ila +4°C</strong> buzdolabında soğuk
                  zincirde muhafaza edilmeli ve <strong className="text-ink">24 saat içinde</strong>{" "}
                  kaynatılarak tüketilmelidir.
                </li>
              </ul>
            </div>

            {/* 1.3 Ödeme, Teslimat ve İfa */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <Truck aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
                <span>3. Ödeme Yöntemi ve Teslimat Esasları</span>
              </h3>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm pl-1">
                <li>
                  <strong className="text-ink">Ödeme Yöntemi:</strong> Sipariş vermek ödeme
                  yükümlülüğü doğurur. Ödeme yalnızca ürün teslimatı sırasında{" "}
                  <strong className="text-ink">
                    Teslimatta Kapıda Nakit veya Teslimatta Kapıda Kredi/Banka Kartı (POS)
                  </strong>{" "}
                  yöntemlerinden Alıcı&apos;nın sepette seçtiği yöntemle tahsil edilir. Web
                  sitesi üzerinden çevrimiçi kart ödemesi alınmaz.
                </li>
                <li>
                  <strong className="text-ink">Teslimat Bölgesi ve Şekli:</strong> Günlük
                  taş fırın ürünlerinin ve soğuk zincir eşlikçilerinin yapısını muhafaza
                  etmek amacıyla teslimatlar yalnızca{" "}
                  <strong className="text-ink">{CONTACT.area}</strong> ilçesi hizmet
                  mahallelerine kendi kuryemizle elden yapılır.
                </li>
                <li>
                  <strong className="text-ink">Teslim Tarihi ve Saati:</strong> Siparişler,
                  Alıcı&apos;nın sepette seçtiği teslim gününde ve sepette belirtilen
                  dağıtım saat aralığında teslim edilir.
                </li>
              </ul>
            </div>

            {/* 1.4 Cayma Hakkı Özeti ve Uyuşmazlık */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <Scale aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
                <span>4. Cayma Hakkı İstisnası ve Başvuru Yolları Özeti</span>
              </h3>
              <p className="text-xs sm:text-sm">
                Mesafeli Sözleşmeler Yönetmeliği&apos;nin{" "}
                <strong className="text-ink">15. maddesinin 1. fıkrasının (ç) bendi</strong>{" "}
                uyarınca çabuk bozulabilen veya son kullanma tarihi geçme ihtimali olan
                günlük gıda ürünlerinde keyfi cayma hakkı kullanılamaz. Buna karşılık
                ayıplı, bozuk veya ambalajı hasarlı teslimatlarda{" "}
                <strong className="text-ink">6502 sayılı Kanun</strong> kapsamındaki tüm
                seçimlik haklarınız saklıdır. Şikâyet ve itirazlarınızı yukarıdaki iletişim
                kanallarımızdan bize iletebilir; uyuşmazlıklarda Ticaret Bakanlığı parasal
                sınırları dahilinde Tüketici Hakem Heyetlerine veya Tüketici Mahkemelerine
                başvurabilirsiniz.
              </p>
            </div>
          </section>

          {/* ========================================================= */}
          {/* BÖLÜM II — MESAFELİ SATIŞ SÖZLEŞMESİ                      */}
          {/* ========================================================= */}
          <section
            id="bolum-2-mesafeli-satis"
            className="space-y-5 scroll-mt-24 pt-2"
          >
            <div className="border-b border-line pb-3">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
                Bölüm II
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink mt-0.5">
                Mesafeli Satış Sözleşmesi
              </h2>
            </div>

            {/* Madde 1 */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink">
                Madde 1 — Taraflar
              </h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <p>
                  <strong className="text-ink">1.1. SATICI:</strong> {SITE_NAME} Artisan
                  Fırın ({CONTACT.area} · Tel: {CONTACT.phoneDisplay} · E-posta:{" "}
                  {CONTACT.email} · Web: {SITE_URL}).
                </p>
                <p>
                  <strong className="text-ink">1.2. ALICI (&quot;Tüketici&quot;):</strong>{" "}
                  {SITE_URL} internet sitesi üzerinden elektronik ortamda sipariş formunu
                  doldurarak işbu Sözleşme&apos;yi onaylayan gerçek veya tüzel kişidir.
                  Alıcı&apos;nın sipariş formunda beyan ettiği ad-soyad, telefon ve açık
                  adres bilgileri esas alınır.
                </p>
              </div>
            </div>

            {/* Madde 2 */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink">
                Madde 2 — Sözleşmenin Konusu
              </h3>
              <p className="text-xs sm:text-sm">
                İşbu Sözleşme&apos;nin konusu; Alıcı&apos;nın Satıcı&apos;ya ait{" "}
                {SITE_URL} internet sitesinden elektronik ortamda siparişini verdiği günlük
                taş fırın ekşi mayalı ekmekler ile mandıra, şarküteri ve kiler ürünlerinin
                satışı ve teslimine ilişkin olarak 6502 sayılı Tüketicinin Korunması
                Hakkında Kanun (&quot;TKHK&quot;) ve Mesafeli Sözleşmeler Yönetmeliği
                hükümleri uyarınca tarafların hak ve yükümlülüklerinin belirlenmesidir.
                Bölüm I&apos;de yer alan Ön Bilgilendirme Formu ve sipariş özeti işbu
                Sözleşme&apos;nin ayrılmaz parçasıdır.
              </p>
            </div>

            {/* Madde 3 */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink">
                Madde 3 — Sipariş, Fiyatlandırma ve Ödeme Koşulları
              </h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-1">
                <li>
                  Ürünlerin cinsi, miktarı, KDV dahil birim fiyatı, varsa teslimat ücreti
                  ve genel toplam satış bedeli sipariş onay ekranında belirtildiği gibidir.
                </li>
                <li>
                  Ödeme yalnızca teslimat esnasında{" "}
                  <strong className="text-ink">
                    Teslimatta Kapıda Nakit veya Teslimatta Kapıda Kredi/Banka Kartı (POS)
                  </strong>{" "}
                  ile yapılır; internet sitesi üzerinden kart bilgisi talep edilmez veya
                  çevrimiçi tahsilat yapılmaz.
                </li>
                <li>
                  Belirli fırın günlerinde üretilen veya ön hazırlık süresi gerektiren
                  ürünler, Alıcı tarafından seçilen uygun teslim gününde hazırlanarak sevk
                  edilir.
                </li>
              </ul>
            </div>

            {/* Madde 4 */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink">
                Madde 4 — Teslimat ve Muhafaza Koşulları
              </h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-1">
                <li>
                  Teslimatlar yalnızca <strong className="text-ink">{CONTACT.area}</strong>{" "}
                  ilçesi kapsamındaki hizmet mahallelerine Satıcı&apos;nın kendi kuryesi
                  tarafından yapılır.
                </li>
                <li>
                  Fırın üretimi başlamadan önce verilen iptal veya tarih değişiklik
                  talepleri için Alıcı doğrudan {CONTACT.phoneDisplay} numaralı hattan
                  Satıcı&apos;ya ulaşabilir.
                </li>
                <li>
                  Teslimat sonrasında ürünlerin ürün sayfasında ve ambalaj üzerinde yer
                  alan muhafaza talimatlarına uygun saklanması (çiğ süt, yoğurt, peynir,
                  tereyağı, yumurta, sucuk ve kavurma ürünlerinde +0°C ila +4°C soğuk
                  zincirin sürdürülmesi; çiğ sütün tüketimden önce kaynatılması)
                  Alıcı&apos;nın sorumluluğundadır.
                </li>
              </ul>
            </div>

            {/* Madde 5 — Cayma Hakkı İstisnası */}
            <div className="p-6 rounded-2xl bg-bad/10 border-2 border-bad/45 space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <AlertTriangle aria-hidden="true" className="w-5 h-5 text-bad shrink-0" />
                <span>
                  Madde 5 — Cayma Hakkı İstisnası (Mesafeli Sözleşmeler Yönetmeliği Md. 15/1-ç)
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-ink">
                6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
                Yönetmeliği&apos;nin{" "}
                <strong>15. maddesinin 1. fıkrasının (ç) bendi</strong> uyarınca:
              </p>
              <blockquote className="p-3.5 bg-cream-surface rounded-xl border border-line text-xs sm:text-sm italic text-ink">
                &quot;Çabuk bozulabilen veya son kullanma tarihi geçme ihtimali olan
                malların teslimine ilişkin sözleşmelerde tüketici cayma hakkını
                kullanamaz.&quot;
              </blockquote>
              <p className="text-xs sm:text-sm text-ink-muted">
                Bu kapsamda; <strong className="text-ink">günlük taş fırın ekmekleri, çiğ süt,
                yoğurt, peynir, tereyağı, yumurta, günlük yufka, fermente sucuk ve
                kavurma</strong> ürünleri çabuk bozulabilen ve gıda güvenliği/hijyen
                açısından iadesi uygun olmayan taze gıda niteliğinde olduğundan, teslimat
                gerçekleştikten sonra 14 günlük olağan (keyfi) cayma hakkı kapsamı
                dışındadır.
              </p>
            </div>

            {/* Madde 6 — Ayıplı Mal ve TKHK Seçimlik Haklar */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-good shrink-0" />
                <span>
                  Madde 6 — Ayıplı / Hasarlı Teslimatta 6502 Sayılı TKHK Kapsamındaki Seçimlik Haklar
                </span>
              </h3>
              <p className="text-xs sm:text-sm">
                Madde 5&apos;teki çabuk bozulabilen gıda cayma hakkı istisnası, ayıplı veya
                hasarlı mal tesliminde Alıcı&apos;nın kanuni haklarını hiçbir şekilde
                sınırlandırmaz:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-1">
                <li>
                  Ambalajı yırtılmış, ezilmiş, soğuk zinciri bozulmuş veya siparişe aykırı
                  teslim edilen ürünleri Alıcı teslim anında kuryeden teslim almama hakkına
                  sahiptir.
                </li>
                <li>
                  Teslimattan sonra fark edilen üretim veya taşıma kaynaklı ayıplarda,{" "}
                  <strong className="text-ink">
                    6502 sayılı Tüketicinin Korunması Hakkında Kanun&apos;un 11. maddesi
                  </strong>{" "}
                  uyarınca Alıcı&apos;nın; sözleşmeden dönerek ödediği bedelin iadesini
                  isteme, malın ayıpsız misli ile değiştirilmesini talep etme veya ayıp
                  oranında bedel indirimi isteme seçimlik hakları tamamen saklıdır.
                </li>
                <li>
                  Aynı gün içinde <strong className="text-ink">{CONTACT.phoneDisplay}</strong>{" "}
                  numaralı telefon/WhatsApp hattımıza veya{" "}
                  <strong className="text-ink">{CONTACT.email}</strong> adresine yapılan
                  bildirimlerde ücretsiz yeni ürün telafisi veya bedel iadesi ivedilikle
                  gerçekleştirilir.
                </li>
              </ul>
            </div>

            {/* Madde 7 & 8 */}
            <div className="p-6 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink">
                Madde 7 — Kişisel Veriler, Uyuşmazlık Çözümü ve Yürürlük
              </h3>
              <p className="text-xs sm:text-sm">
                Sipariş kapsamında işlenen kişisel verilere ilişkin aydınlatma metnine{" "}
                <Link
                  href="/kvkk"
                  className="underline font-semibold text-ink hover:text-accent"
                >
                  KVKK Aydınlatma Metni
                </Link>{" "}
                sayfasından ulaşılabilir. İşbu Sözleşme&apos;den doğabilecek
                uyuşmazlıklarda Ticaret Bakanlığı&apos;nca her yıl ilan edilen parasal
                sınırlar dahilinde Alıcı&apos;nın veya Satıcı&apos;nın yerleşim yerindeki{" "}
                <strong className="text-ink">Tüketici Hakem Heyetleri</strong> ile{" "}
                <strong className="text-ink">Tüketici Mahkemeleri</strong> yetkilidir.
              </p>
              <p className="text-xs sm:text-sm">
                Alıcı, sepet ekranındaki onay kutusunu işaretleyip siparişi onayladığında
                işbu Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi&apos;ni (Sürüm:{" "}
                <span className="font-mono text-ink">{TERMS_VERSION}</span>) okuduğunu ve
                kabul ettiğini elektronik ortamda beyan etmiş olur; onay zaman damgası ve
                metin sürümü sipariş kaydında saklanır.
              </p>
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
