"use client";

import React from "react";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { FileText, ArrowLeft, Truck, AlertTriangle, CheckCircle2, Phone, Mail } from "lucide-react";
import Link from "next/link";

export default function MesafeliSatisPage() {
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
          <span className="text-artisan-gold font-medium">Mesafeli Satış Sözleşmesi</span>
        </div>

        {/* Page Header */}
        <div className="space-y-3 mb-10 border-b border-surface-border pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-panel border border-surface-border text-xs font-serif text-artisan-gold">
            <FileText className="w-4 h-4 text-artisan-gold" />
            <span>6502 Sayılı Tüketicinin Korunması Kanunu Uyarınca</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Mesafeli Satış Sözleşmesi & Teslimat Koşulları
          </h1>
          <p className="text-xs sm:text-sm text-foreground/70 font-sans">
            Son Güncelleme: 10 Eylül 2026 · EkmekLab Artisan Fırın
          </p>
        </div>

        {/* Document Content */}
        <div className="space-y-8 text-sm leading-relaxed text-foreground/80 font-sans">
          {/* Madde 1 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              Madde 1 - Taraflar
            </h2>
            <div className="space-y-2">
              <p>
                <strong>1.1. SATICI:</strong>
              </p>
              <div className="text-xs text-foreground/75 space-y-1 pl-3 border-l-2 border-artisan-gold/40">
                <div><strong>Unvan:</strong> EkmekLab Artisan Fırın</div>
                <div><strong>Adres:</strong> Beylikdüzü, İstanbul</div>
                <div><strong>Telefon:</strong> 0501 012 66 53</div>
                <div><strong>E-posta:</strong> ekmeklab@gmail.com</div>
              </div>

              <p className="pt-2">
                <strong>1.2. ALICI (&quot;Tüketici&quot;):</strong>
              </p>
              <div className="text-xs text-foreground/75 pl-3 border-l-2 border-artisan-gold/40">
                EkmekLab web sitesi (ekmeklab.tr / yerel platform) üzerinden sipariş formunu doldurarak onaylayan gerçek veya tüzel kişidir. Alıcının sipariş verirken beyan ettiği isim, telefon ve adres bilgileri esas alınır.
              </div>
            </div>
          </section>

          {/* Madde 2 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              Madde 2 - Sözleşmenin Konusu
            </h2>
            <p>
              İşbu Sözleşme&apos;nin konusu; ALICI&apos;nın, SATICI&apos;ya ait web sitesinden elektronik ortamda siparişini yaptığı taş fırın ekşi mayalı ekmekler ve doğal gurme lezzetlerin satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.
            </p>
          </section>

          {/* Madde 3 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              Madde 3 - Sipariş, Fiyatlandırma ve Ödeme
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-foreground/75 text-xs sm:text-sm pl-2">
              <li>Ürünlerin cinsi, miktarı, birim fiyatı ve toplam bedeli sipariş özetinde ve Alıcı&apos;ya iletilen sipariş teyidinde belirtildiği gibidir. Tüm fiyatlara KDV dahildir.</li>
              <li>Ödeme; web sitesi üzerinden kredi/banka kartı ile güvenli online ödeme veya sipariş tesliminde fırın kuryemize kapıda nakit/kredi kartı şeklinde gerçekleştirilebilir.</li>
              <li>Ön sipariş gerektiren özel fermantasyon ekmekler siparişin onaylanmasını takip eden belirlenen fırın çıkış gününde hazırlanır.</li>
            </ul>
          </section>

          {/* Madde 4 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold flex items-center gap-2">
              <Truck className="w-4 h-4 text-artisan-gold" />
              <span>Madde 4 - Teslimat Esasları ve Kurye Koşulları</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-foreground/75 text-xs sm:text-sm pl-2">
              <li><strong>Teslimat Bölgesi:</strong> Ürünlerimizin tazeliğini, sıcaklığını ve soğuk zincirini korumak adına teslimatlar <em>İstanbul - Beylikdüzü ilçesi sınırları dahilinde</em> kendi fırın kuryemizle yapılmaktadır.</li>
              <li><strong>Ücretsiz Teslimat Eşiği:</strong> <strong>1.000 TL ve üzeri</strong> siparişlerde fırın kuryesi teslimatı <strong>ÜCRETSİZDİR</strong>. 1.000 TL altındaki siparişlerde standart 150 TL kurye teslimat ücreti sepet toplamına eklenir.</li>
              <li><strong>Gel-Al (Atölyeden Teslim):</strong> Gel-Al seçeneğini tercih eden müşterilerimizden hiçbir teslimat ücreti tahsil edilmez; ürünler atölyeden sıcak teslim alınabilir.</li>
              <li><strong>Teslimat Zamanı:</strong> Günlük taze ekmekler ve siparişler, belirtilen dağıtım saatleri (14:00 - 18:00) arasında Alıcı&apos;nın belirttiği adrese ulaştırılır.</li>
            </ul>
          </section>

          {/* Madde 5 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-artisan-terracotta/40 bg-artisan-terracotta/5">
            <h2 className="font-serif text-lg font-bold text-artisan-terracotta flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-artisan-terracotta shrink-0" />
              <span>Madde 5 - Cayma Hakkı İstisnası (Taze Gıda)</span>
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed">
              6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesinin 1. fıkrasının (ç) bendi uyarınca:
            </p>
            <blockquote className="p-3 bg-background/60 rounded-xl border border-surface-border text-xs italic text-artisan-gold">
              &quot;Çabuk bozulabilen veya son kullanma tarihi geçme ihtimali olan malların teslimine ilişkin sözleşmelerde tüketici cayma hakkını kullanamaz.&quot;
            </blockquote>
            <p className="text-xs sm:text-sm leading-relaxed">
              Taş fırından taze çıkan günlük artisan ekşi mayalı ekmekler, çiğ süt, doğal yoğurt ve peynir gibi mandıra ürünleri <strong>çabuk bozulabilir taze gıda maddesi</strong> niteliğinde olduğundan, teslim alındıktan sonra keyfi cayma ve iade hakkı kapsamı dışındadır.
            </p>
          </section>

          {/* Madde 6 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Madde 6 - Hasarlı / Kusurlu Ürün Telafi Garantisi</span>
            </h2>
            <p>
              EkmekLab, taş fırın zanaatının arkasında durur ve müşteri memnuniyetini en üstte tutar:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-foreground/75 text-xs sm:text-sm pl-2">
              <li>Teslimat sırasında ambalajı hasar görmüş, ezilmiş veya üretim/lezzet kusuru taşıdığı tespit edilen ürünler için Alıcı, kurye teslimi anında ürünü kabul etmeme hakkına sahiptir.</li>
              <li>Teslimat sonrasında fark edilen herhangi bir kusur durumunda, aynı gün içerisinde <strong>0501 012 66 53</strong> numaralı WhatsApp hattımızdan ürün görseli ile bildirim yapılması halinde, koşulsuz olarak <strong>aynı gün yeni ürün telafisi veya sipariş bedeli iadesi</strong> sağlanır.</li>
            </ul>
          </section>

          {/* Madde 7 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              Madde 7 - Uyuşmazlıkların Çözümü
            </h2>
            <p>
              İşbu Sözleşme&apos;nin uygulanmasından doğabilecek her türlü uyuşmazlıkta, Ticaret Bakanlığı&apos;nca ilan edilen parasal sınırlar dahilinde Alıcı&apos;nın veya Satıcı&apos;nın yerleşim yerindeki <em>Tüketici Hakem Heyetleri</em> ile <em>Tüketici Mahkemeleri</em> yetkilidir.
            </p>
          </section>

          {/* Madde 8 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              Madde 8 - Yürürlük
            </h2>
            <p>
              Alıcı, web sitesi üzerinden sipariş verdiğinde işbu Sözleşme&apos;nin tüm koşullarını okuduğunu, anladığını ve kabul ettiğini elektronik ortamda teyit etmiş sayılır.
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
