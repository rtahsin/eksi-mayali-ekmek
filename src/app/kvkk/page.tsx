"use client";

import React from "react";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { ShieldCheck, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";

export default function KvkkPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground/90 font-sans selection:bg-artisan-terracotta/30 selection:text-artisan-gold relative">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-sans text-foreground/60">
          <Link href="/" className="hover:text-artisan-gold transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ana Sayfa</span>
          </Link>
          <span>/</span>
          <span className="text-artisan-gold font-medium">KVKK Aydınlatma Metni</span>
        </div>

        {/* Page Header */}
        <div className="space-y-3 mb-10 border-b border-surface-border pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-panel border border-surface-border text-xs font-serif text-artisan-gold">
            <ShieldCheck className="w-4 h-4 text-artisan-gold" />
            <span>6698 Sayılı Kanun Uyarınca</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Kişisel Verilerin Korunması Aydınlatma Metni
          </h1>
          <p className="text-xs sm:text-sm text-foreground/70 font-sans">
            Son Güncelleme: 10 Eylül 2026 · EkmekLab Artisan Fırın
          </p>
        </div>

        {/* Document Content */}
        <div className="space-y-8 text-sm leading-relaxed text-foreground/80 font-sans">
          {/* Section 1 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              1. Veri Sorumlusunun Kimliği
            </h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, <strong>EkmekLab</strong> (&quot;Şirket&quot; veya &quot;Atölye&quot;) olarak, veri sorumlusu sıfatıyla, kişisel verilerinizi aşağıda açıklanan amaçlar kapsamında; hukuka ve dürüstlük kurallarına uygun bir şekilde işlemekte, kaydetmekte ve saklamaktayız.
            </p>
            <div className="pt-2 text-xs text-foreground/70 space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-artisan-gold" />
                <span>Adres: Beylikdüzü, İstanbul</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-artisan-gold" />
                <span>Telefon: 0501 012 66 53</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-artisan-gold" />
                <span>E-posta: ekmeklab@gmail.com</span>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              2. İşlenen Kişisel Verileriniz
            </h2>
            <p>
              EkmekLab web platformu veya doğrudan iletişim kanalları üzerinden sipariş verirken ve hizmet alırken aşağıdaki kişisel verileriniz işlenmektedir:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-foreground/75 text-xs sm:text-sm pl-2">
              <li><strong>Kimlik Bilgileri:</strong> Ad, soyad.</li>
              <li><strong>İletişim Bilgileri:</strong> Telefon numarası, teslimat adresi (mahalle, cadde, sokak, bina, daire no), e-posta adresi.</li>
              <li><strong>Müşteri İşlem Bilgileri:</strong> Sipariş edilen ekmek ve gurme ürünler, sipariş tarihi/saati, teslimat notları, sepet toplamı, ödeme yöntemi tercihi.</li>
              <li><strong>Konum Bilgileri (Açık Rızanız ile):</strong> Teslimat anında isteğe bağlı olarak paylaştığınız GPS koordinatları (enlem, boylam, doğruluk mesafesi).</li>
              <li><strong>İşlem Güvenliği Verileri:</strong> IP adresi, sepet oturum bilgileri, cihaz ve tarayıcı teknik erişim logları.</li>
            </ul>
          </section>

          {/* Section 2.1: Konum Verisi (Anchor: #konum-verisi) */}
          <section id="konum-verisi" className="space-y-3 bg-surface p-6 rounded-2xl border-2 border-artisan-gold/40 scroll-mt-24 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
                Konum Verisi İşleme ve Canlı Takip Aydınlatması
              </h2>
            </div>
            <p>
              Sipariş verme ve takip aşamasında size sunulan <strong>Canlı Konum Paylaşımı</strong> özelliği, 6698 sayılı KVKK Madde 5/1 uyarınca <strong>tamamen açık rızanıza</strong> tabidir. Konum paylaşımı vermemeniz durumunda sipariş süreciniz hiçbir şekilde kısıtlanmaz, teslimatınız açık adresiniz üzerinden olağan akışında gerçekleştirilir.
            </p>
            <div className="space-y-2 text-xs sm:text-sm text-foreground/75 pl-2">
              <p>
                <strong>• Hangi Veriler Toplanır?</strong> Yalnızca cihazınızın tarayıcı Geolocation API&apos;si aracılığıyla ürettiği anlık enlem (latitude), boylam (longitude) ve doğruluk payı (accuracy) bilgisi alınır.
              </p>
              <p>
                <strong>• İşleme Amacı:</strong> Kuryemizin adresinizi Beylikdüzü ara sokaklarında gecikmeden bulabilmesi ve sipariş takip ekranında size kurye-müşteri mesafesini canlı radar olarak gösterebilmek amacıyla kullanılır.
              </p>
              <p>
                <strong>• 72 Saatlik Otomatik Silme Güvencesi:</strong> Teslimat tamamlandıktan veya sipariş kapandıktan sonra konum verileriniz maksimum <strong>72 saat</strong> saklanır. Bu sürenin sonunda otomatik veri temizleme mekanizmamız (cron job) aracılığıyla veritabanından kalıcı olarak ve geri getirilemez biçimde silinir.
              </p>
              <p>
                <strong>• Rızayı Geri Çekme Hakkı:</strong> Sipariş takip sayfasında yer alan <em>&quot;Canlı Konum Paylaşımı&quot;</em> butonunu kapatarak istediğiniz an konum paylaşımınızı tek tıkla durdurabilirsiniz.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              3. Kişisel Verilerin İşlenme Amaçları
            </h2>
            <p>
              Toplanan kişisel verileriniz, KVKK&apos;nın 5. ve 6. maddelerinde belirtilen şartlar dahilinde aşağıdaki amaçlarla işlenmektedir:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-foreground/75 text-xs sm:text-sm pl-2">
              <li>Taş fırından taze çıkan artisan ekmek ve gurme mandıra siparişlerinizin hazırlanması, paketlenmesi ve kendi fırın kuryemiz aracılığıyla kapınıza ulaştırılması,</li>
              <li>Teslimat aşamasında kurye rotasyonunun sağlanması ve gerektiğinde adres teyidi için sizinle iletişime geçilmesi,</li>
              <li>Fatura, mali kayıt ve muhasebesel yükümlülüklerin yerine getirilmesi,</li>
              <li>Müşteri talep, öneri veya şikayetlerinin (WhatsApp veya e-posta yoluyla) hızlıca çözümlenmesi,</li>
              <li>Bilgi güvenliği süreçlerinin ve web platformunun teknik kararlılığının temini.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              4. Kişisel Verilerin Aktarımı
            </h2>
            <p>
              Kişisel verileriniz, üçüncü şahıslara ticari veya reklam amaçlı <strong>kesinlikle satılmaz veya devredilmez</strong>. Verileriniz yalnızca:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-foreground/75 text-xs sm:text-sm pl-2">
              <li>Siparişin kapınıza ulaştırılması amacıyla <em>fırın içi teslimat görevlilerimiz ve kuryelerimizle</em>,</li>
              <li>Yasal bir zorunluluk veya adli/idari talep halinde <em>yetkili kamu kurum ve kuruluşları ile yargı mercileriyle</em> mevzuat sınırları dahilinde paylaşılabilir.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              5. Kişisel Veri Toplamanın Hukuki Sebebi
            </h2>
            <p>
              Kişisel verileriniz, KVKK Madde 5/2 uyarınca; <em>&quot;Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması kaydıyla, sözleşmenin taraflarına ait kişisel verilerin işlenmesinin gerekli olması&quot;</em> ve <em>&quot;Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması&quot;</em> hukuki sebeplerine dayanılarak elektronik ortamda toplanmaktadır.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              6. KVKK Madde 11 Kapsamındaki Haklarınız
            </h2>
            <p>
              Kişisel veri sahibi olarak KVKK&apos;nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-foreground/75 text-xs sm:text-sm pl-2">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
              <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
              <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
              <li>Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme,</li>
              <li>Verilerin eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme,</li>
              <li>KVKK Madde 7 çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini talep etme.</li>
            </ul>
            <p className="pt-2">
              Bu haklarınızı kullanmak için taleplerinizi kimliğinizi teyit eden belgelerle birlikte <strong>ekmeklab@gmail.com</strong> e-posta adresimize yazılı olarak iletebilirsiniz. Başvurularınız en geç 30 gün içinde ücretsiz olarak sonuçlandırılacaktır.
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
