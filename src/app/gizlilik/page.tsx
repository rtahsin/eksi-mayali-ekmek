"use client";

import React from "react";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { Lock, ArrowLeft, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function GizlilikPage() {
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
          <span className="text-artisan-gold font-medium">Gizlilik & Çerez Politikası</span>
        </div>

        {/* Page Header */}
        <div className="space-y-3 mb-10 border-b border-surface-border pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-panel border border-surface-border text-xs font-serif text-artisan-gold">
            <Lock className="w-4 h-4 text-artisan-gold" />
            <span>Güvenli Alışveriş & Veri Koruma</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Gizlilik ve Çerez Politikası
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
              1. Gizlilik Taahhüdümüz
            </h2>
            <p>
              EkmekLab olarak müşterilerimizin ve ziyaretçilerimizin mahremiyetine ve kişisel bilgilerinin gizliliğine en yüksek derecede saygı gösteriyoruz. Web sitemizi ziyaretiniz ve alışverişleriniz sırasında bize emanet ettiğiniz veriler, modern güvenlik standartları ile korunmakta ve üçüncü şahıslara ticari amaçlarla kesinlikle verilmemektedir.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>2. Ödeme ve Kart Bilgileri Güvenliği</span>
            </h2>
            <p>
              EkmekLab platformunda alışveriş güvenliğiniz en üst seviyede tutulur:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-foreground/75 text-xs sm:text-sm pl-2">
              <li>
                <strong>Kredi ve Banka Kartı Bilgileri Asla Saklanmaz:</strong> Sipariş sırasında girdiğiniz kredi veya banka kartı bilgileri, CVV kodları ve şifreler sistemlerimizde veya sunucularımızda <strong>hiçbir şekilde kaydedilmez, saklanmaz ve görüntülenemez</strong>.
              </li>
              <li>
                <strong>256-Bit SSL Şifreleme:</strong> Tüm ödeme akışları, bankalar ve lisanslı ödeme kuruluşları (BDDK ve TCMB onaylı) arasında doğrudan 256-bit SSL güvenlik sertifikası ile şifreli olarak gerçekleştirilir.
              </li>
              <li>
                <strong>Kapıda Ödeme ve Güvenlik:</strong> Arzu eden müşterilerimiz için kendi fırın kuryemiz aracılığıyla kapıda nakit veya temassız POS ödeme seçeneği de sunulmaktadır.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              3. Çerez (Cookie) Kullanımı
            </h2>
            <p>
              Web sitemizde yalnızca kullanıcı deneyiminizi kolaylaştırmak amacıyla asgari düzeyde <strong>teknik zorunlu çerezler</strong> kullanılır:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-foreground/75 text-xs sm:text-sm pl-2">
              <li><strong>Sepet Çerezleri:</strong> Sayfalar arasında gezinirken sepetinize eklediğiniz ekşi mayalı ekmek ve gurme lezzetlerin kaybolmamasını sağlar.</li>
              <li><strong>Tercih Çerezleri:</strong> Seçtiğiniz teslimat yöntemi (Beylikdüzü Kurye veya Gel-Al) ve oturum tercihlerinizi hatırlar.</li>
              <li><strong>İzleme/Reklam Çerezi Yoktur:</strong> Web sitemizde sizi diğer sitelerde takip eden veya kişisel profilinizi çıkaran üçüncü taraf reklam izleme çerezleri <em>kullanılmamaktadır</em>.</li>
            </ul>
            <p className="text-xs text-foreground/60 pt-1">
              Dilediğiniz takdirde tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz; ancak çerezlerin engellenmesi durumunda sepet işlevleri kısıtlanabilir.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold">
              4. İletişim İzinleri ve Bildirimler
            </h2>
            <p>
              Sipariş verirken paylaştığınız telefon numarası ve e-posta adresi yalnızca siparişinizin hazırlanma durumu, fırından çıkış anı, teslimat saati ve kurye irtibatı amacıyla kullanılır. Açık rızanız olmaksızın istenmeyen ticari SMS veya bülten gönderimi yapılmaz.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 bg-surface p-6 rounded-2xl border border-surface-border">
            <h2 className="font-serif text-lg font-bold text-foreground text-artisan-gold flex items-center gap-2">
              <Mail className="w-4 h-4 text-artisan-gold" />
              <span>5. Sorularınız ve İletişim</span>
            </h2>
            <p>
              Gizlilik ve çerez politikamızla ilgili her türlü soru, öneri veya bilgi talebiniz için bizimle doğrudan iletişime geçebilirsiniz:
            </p>
            <div className="text-xs text-foreground/70 space-y-1 pt-1">
              <div><strong>E-posta:</strong> <a href="mailto:ekmeklab@gmail.com" className="text-artisan-gold hover:underline">ekmeklab@gmail.com</a></div>
              <div><strong>Telefon:</strong> 0501 012 66 53</div>
              <div><strong>Adres:</strong> Beylikdüzü, İstanbul</div>
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
