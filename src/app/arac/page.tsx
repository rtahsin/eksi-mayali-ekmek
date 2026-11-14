import React from "react";
import Link from "next/link";
import {
  Calculator,
  Thermometer,
  Clock,
  ArrowRight,
  ShieldCheck,
  Scale,
  BookOpen,
  Flame,
} from "lucide-react";
import { StalingSimulator } from "@/components/bilim/StalingSimulator";

export default function AracOverviewPage() {
  const tools = [
    {
      href: "/arac/firinci-yuzdesi",
      icon: Calculator,
      title: "Fırıncı Yüzdesi Hesaplayıcı",
      tag: "Formül & Reçete",
      desc: "Toplam unu daima %100 kabul eden uluslararası zanaatkar formülü. İster un ağırlığından, ister hedef hamur miktarından veya somun sayısından yola çıkarak hidrasyon, maya, tuz ve un harmanınızı miligram hassasiyetinde ölçeklendirin.",
      highlights: [
        "Un %100 bazlı saf fırıncı matematiği",
        "Çoklu un harmanı (Ekmeklik, Tam Buğday, Siyez vb.)",
        "Mayadaki un ve su dahil efektif hidrasyon hesabı",
        "Porsiyonlama ve tek tıkla kopyalanabilir reçete",
      ],
      badge: "Temel Araç",
    },
    {
      href: "/arac/ddt",
      icon: Thermometer,
      title: "İstenen Hamur Sıcaklığı (DDT)",
      tag: "Termodinamik & Fermantasyon",
      desc: "Fermantasyonun öngörülebilir ilerlemesi için yoğurma sonu hamur sıcaklığı kritik belirleyicidir. Oda ısısı, un sıcaklığı ve yoğurma sürtünmesini dengeleyen gereken su sıcaklığını ve yaz sıcakları için kırılmış buz miktarını hesaplayın.",
      highlights: [
        "3 ve 4 faktörlü (ön mayalı) termal hesaplama",
        "Elle, ev tipi mikser veya spiral mikser sürtünme faktörleri",
        "Gizli erime ısılı (80 cal/g) kırılmış buz hesaplayıcı",
        "40°C termal şok ve enzim güvenliği uyarıları",
      ],
      badge: "Hassas Kontrol",
    },
    {
      href: "/arac/maya-planlayici",
      icon: Clock,
      title: "Ekşi Maya Besleme Planlayıcı",
      tag: "Zamanlama & Zirve",
      desc: "Pişirme ve yoğurma saatine göre mayayı ne zaman ve hangi oranla beslemeniz gerektiğini hesaplayın. 1:1:1'den 1:5:5 gece beslemesine kadar ortam sıcaklığına duyarlı zirve penceresi tahminleri.",
      highlights: [
        "1:1:1, 1:2:2, 1:3:3, 1:4:4 ve 1:5:5 oran profilleri",
        "Ortam sıcaklığına göre Q10 fermantasyon eğrisi",
        "Geriye doğru yoğurma saati planlaması",
        "Zirve penceresi ve yüzme testi ipuçları",
      ],
      badge: "Zamanlama",
    },
  ];

  return (
    <div className="space-y-12">
      {/* Giriş & Felsefe */}
      <section className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-cream-surface text-xs font-mono text-ink-muted">
          <Scale className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          <span>EkmekLab Zanaatkar Atölye Standartları</span>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          Tahminle Değil, Ölçümle Fırıncılık
        </h2>
        <p className="text-ink-muted text-base sm:text-lg leading-relaxed">
          Zanaatkar ekmekçilikte tutarlılık tesadüf değildir. Unun su tutma kapasitesi,
          hamurun yoğurma sonu sıcaklığı, nişastanın soğuma kinetiği ve mayanın beslenme
          metabolizması fiziksel kurallara dayanır. Atölyemizde kullandığımız modelleri
          doğrudan kullanımınıza açıyoruz.
        </p>
      </section>

      {/* Canlı İnteraktif Laboratuvar: Tazelik & Nişasta Retrogradasyon Simülatörü */}
      <section aria-label="Tazelik ve nişasta retrogradasyon simülatörü" className="space-y-3">
        <StalingSimulator />
      </section>

      {/* 3 Tezgâh Hesaplayıcısı Kartları */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-line pb-3">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
              TEZGÂH HESAPLAYICILARI
            </span>
            <h3 className="font-serif text-2xl font-bold text-ink mt-0.5">
              Hamur &amp; Fermantasyon Formülleri
            </h3>
          </div>
          <p className="text-xs font-mono text-ink-muted">
            Tarayıcıda çalışan istemci tarafı saf matematik motorları
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <article
                key={tool.href}
                className="group flex flex-col justify-between p-6 sm:p-7 rounded-2xl border border-line bg-cream-surface hover:border-accent/60 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-bg border border-line flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-line text-ink-muted bg-bg">
                      {tool.badge}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                      {tool.tag}
                    </span>
                    <h4 className="font-serif text-xl font-bold text-ink mt-1 group-hover:text-accent transition-colors">
                      {tool.title}
                    </h4>
                  </div>

                  <p className="text-sm text-ink-muted leading-relaxed">
                    {tool.desc}
                  </p>

                  <div className="border-t border-line/60 pt-4 space-y-2">
                    <span className="block text-xs font-mono uppercase text-ink/70 font-semibold">
                      Öne Çıkan Özellikler
                    </span>
                    <ul className="text-xs text-ink-muted space-y-1.5">
                      {tool.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span
                            aria-hidden="true"
                            className="font-mono text-accent font-bold leading-4 select-none"
                          >
                            ·
                          </span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-line/60">
                  <Link
                    href={tool.href}
                    className="w-full min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bg hover:bg-accent text-ink hover:text-white border border-line hover:border-accent text-sm font-medium transition-all group-hover:shadow"
                  >
                    <span>Aracı Kullan</span>
                    <ArrowRight
                      className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Bilim Odası & Sıcak Taş Fırın Sipariş Köprüsü */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 border-y-4 border-double border-line py-6">
        <div className="p-6 rounded-2xl bg-cream-surface border border-line flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
              № 01 · KAYNAKLI BİLİM ATLASI
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink">
              Formüllerin Arkasındaki 26 Anı İncele
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Değirmendeki zedelenmiş nişastadan fırının ilk 8 dakikasına ve raftaki
              amilopektin kristallerine kadar her adımın hakemli literatür kaynakları.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Link
              href="/bilim"
              className="min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg hover:bg-ink text-ink hover:text-bg border border-line text-xs sm:text-sm font-mono font-medium transition-colors"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>Bilim Odasına Gir →</span>
            </Link>
            <Link
              href="/bilim/rafta_ilk_hafta"
              className="min-h-11 inline-flex items-center px-3.5 py-2.5 rounded-xl border border-line hover:border-accent text-xs font-mono text-ink-muted hover:text-ink transition-colors"
            >
              Levha: Rafta İlk Hafta
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-cream-surface border border-line flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
              № 02 · BEYLİKDÜZÜ TAŞ FIRIN &amp; MANDIRA
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink">
              Bu Hesaplarla Pişen Somunları Sofrana Getirelim
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              24 saat soğuk fermantasyonla olgunlaşan taş fırın ekmeklerimizi ve yanına seçtiğimiz
              günlük süt, yoğurt, tereyağı ve şarküteri eşlikçilerini kapıda ödeyerek sipariş ver.
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/#ekmekler"
              className="min-h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs sm:text-sm font-sans font-semibold transition-all shadow-xs"
            >
              <Flame className="w-4 h-4" aria-hidden="true" />
              <span>Sıcak Fırın &amp; Eşlikçi Seçkisini Gör →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Zanaat Prensipleri */}
      <section className="p-6 sm:p-8 rounded-2xl border border-line bg-cream-surface/60 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent" aria-hidden="true" />
          <h3 className="font-serif text-lg font-bold text-ink">
            Atölye İlkeleri ve Ölçüm Şeffaflığı
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-ink-muted leading-relaxed">
          <p>
            <strong className="text-ink">İstemci Tarafı Saf Hesaplama:</strong> Formüllerimiz
            tarayıcınızda saf matematik olarak çalışır. Girdiğiniz un harmanları veya reçeteler
            hiçbir sunucuya gönderilmez.
          </p>
          <p>
            <strong className="text-ink">Fırın Fiziği:</strong> Suyun gizli erime ısısı,
            fermantasyonun Q10 sıcaklık katsayısı ve nişastanın Avrami kristalleşme kinetiği
            tahıl bilimi literatürüyle uyumlu kalibre edilmiştir.
          </p>
        </div>
      </section>
    </div>
  );
}
