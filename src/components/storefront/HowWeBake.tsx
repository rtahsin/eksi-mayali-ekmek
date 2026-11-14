import React from "react";
import Link from "next/link";

const TIMELINE_STATIONS = [
  {
    clock: "18:00",
    phase: "İstasyon I",
    title: "Canlı Ekşi Maya Beslemesi",
    detail:
      "Atölye mayası taş değirmen unu ve suyla beslenir; ~24°C'de 4–5 saat içinde gaz gücünün zirvesine ulaşır. Ticari hazır maya hiç girmez.",
  },
  {
    clock: "21:00",
    phase: "İstasyon II",
    title: "Soğuk Fermantasyon (+4°C)",
    detail:
      "~27°C hedef hamur sıcaklığıyla yoğrulan ve katlanan somunlar sepetlere alınır; +4°C dolapta gece boyu yavaş organik asit ve aroma geliştirir.",
  },
  {
    clock: "07:00",
    phase: "İstasyon III",
    title: "Taş Taban & 20 dk Buhar",
    detail:
      "120 × 80 cm taş tabanlı fırında ilk 20 dakika yoğun buhar altında hacim alır, izleyen 20 dakika kuru taş ısıyla karamelize kabuk bağlar.",
  },
  {
    clock: "14:00–18:00",
    phase: "İstasyon IV",
    title: "Beylikdüzü Kapıda Teslim (Nakit / Kart)",
    detail:
      "İç dokusu oturan somunlar ve günlük mandıra/şarküteri eşlikçileri kendi kuryemizle kapına gelir; ödemeni teslimatta nakit veya kartla yaparsın.",
  },
] as const;

export function HowWeBake() {
  return (
    <section
      id="nasil-uretiyoruz"
      aria-labelledby="hikaye-ve-ritim-baslik"
      className="relative py-16 md:py-24 bg-cream-surface text-ink border-b border-line overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 md:space-y-20">
        {/* Katman 1: Atölye Hikâyesi ("2018, Gece Yarısı Ekmek Yoktu") */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">
              ATÖLYE HİKÂYESİ · MAHALLENİN EKMEK LABORATUVARI
            </p>
            <h2
              id="hikaye-ve-ritim-baslik"
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]"
            >
              2018, gece yarısı evde ekmek yoktu.
            </h2>

            <div className="space-y-3.5 text-sm sm:text-base text-ink-muted leading-relaxed font-sans">
              <p>
                Her şey sıradan bir gece yarısı tavada pişen sucuklu yumurtayla başladı:
                tam sofraya oturacakken evde tek dilim ekmek kalmamıştı, açık bir fırın da
                yoktu. Soba yanıyordu; mutfakta un, su ve tuz vardı. İnce bir lavaş açıp
                sobanın üstünde pişirdik ve yumurtayı onunla yedik.
              </p>
              <p>
                O gece başlayan merak, internetten makale okuya okuya, evde tartıyla
                deneye deneye ekşi mayaya dönüştü. Komşulara dağıttığımız somunlar büyüdü
                ve Beylikdüzü&apos;ndeki <strong className="text-ink font-semibold">22 m² bahçe taş fırınımıza</strong>{" "}
                evrildi. &ldquo;Lab&rdquo; adımız şef gösterisinden değil, her partiyi
                ölçerek öğrenen açık mutfak defterimizden geliyor.
              </p>
              <p>
                Aynı gece yarısı sofrasının doğallığıyla, bugün fırından çıkan sıcak
                somunların yanına kendi soframıza koyduğumuz üreticilerden seçilmiş günlük
                süt, yoğurt, tereyağı, yumurta, sucuk ve kavurma eşlikçilerini ekliyoruz.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="#ekmekler"
                className="min-h-11 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans font-semibold text-xs sm:text-sm transition-colors shadow-xs"
              >
                Bu Haftanın Taş Fırın Somunları →
              </a>
              <a
                href="#sarkuteri"
                className="min-h-11 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-bg hover:bg-cream-surface text-ink border border-line hover:border-accent font-mono text-xs transition-colors"
              >
                Sofralık Eşlikçiler
              </a>
            </div>
          </div>

          {/* Gerçek Atölye Fotoğrafları (closeup_bread.webp & closeup_counter.webp) */}
          <div className="lg:col-span-6 grid grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            <figure className="col-span-7 rounded-2xl overflow-hidden border border-line bg-bg shadow-sm flex flex-col">
              <div className="aspect-[4/5] w-full overflow-hidden">
                <img
                  src="/atelier/closeup_bread.webp"
                  alt="Taş tabanlı fırından yeni çıkmış ekşi mayalı somun kabuğu"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className="px-3.5 py-2.5 text-[11px] font-mono text-ink-muted border-t border-line bg-bg">
                Taş taban · 20 dk buhar + 20 dk kuru ısı
              </figcaption>
            </figure>

            <div className="col-span-5 flex flex-col justify-between gap-3.5 sm:gap-4">
              <figure className="rounded-2xl overflow-hidden border border-line bg-bg shadow-sm flex-1 flex flex-col">
                <div className="aspect-[4/4] sm:aspect-auto sm:flex-1 w-full overflow-hidden">
                  <img
                    src="/atelier/closeup_counter.webp"
                    alt="EkmekLab 22 metrekare bahçe atölyesi ahşap hazırlık tezgâhı"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <figcaption className="px-3 py-2 text-[11px] font-mono text-ink-muted border-t border-line bg-bg">
                  22 m² bahçe atölyesi tezgâhı
                </figcaption>
              </figure>

              <div className="p-4 rounded-2xl border border-line bg-bg space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-wider text-accent font-semibold">
                  FIRIN KAPASİTESİ
                </p>
                <p className="font-serif text-lg font-bold text-ink leading-snug">
                  Salı – Pazar Taze Çıkış
                </p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Pazartesi dinlenme ve Salı hamuru kurulum günüdür; üyelik olmadan sipariş
                  verilir.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Katman 2: 24 Saatlik Taş Fırın & Teslimat Zaman Cetveli */}
        <div className="pt-12 border-t-4 border-double border-line space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold">
                BİR SOMUNUN 24 SAATİ
              </p>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                Taş Fırın &amp; Teslimat Zaman Cetveli
              </h3>
            </div>
            <p className="font-mono text-xs text-ink-muted">
              İstanbul saatiyle günlük atölye akışı · Kapıda nakit veya kredi kartı
            </p>
          </div>

          <ol className="rounded-2xl border border-line bg-bg divide-y md:divide-y-0 md:divide-x divide-line grid grid-cols-1 md:grid-cols-4 overflow-hidden">
            {TIMELINE_STATIONS.map((st) => (
              <li key={st.clock} className="p-5 sm:p-6 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2.5">
                    <span className="font-mono text-xl sm:text-2xl font-bold text-accent tabular-nums">
                      {st.clock}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {st.phase}
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-ink leading-snug pt-0.5">
                    {st.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
                    {st.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-ink-muted pt-1">
            <span>İyi ekmek, pahalı olmadan herkesin sofrasına.</span>
            <Link
              href="/bilim"
              className="min-h-11 inline-flex items-center text-ink underline underline-offset-4 hover:text-accent transition-colors"
            >
              24 saatte hamurun içinde ne olduğunu Bilim Odasında oku →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
