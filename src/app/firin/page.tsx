import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/products/server";
import { groupCatalog } from "@/lib/products/grouping";
import { getStoreSettings } from "@/lib/settings/server";
import { computeDeliveryDates } from "@/lib/ordering/dates";
import { firinAniSirasi, selam } from "@/lib/firin/durum";
import { tezgahDurumu } from "@/lib/firin/tezgah";
import { getYolculuk } from "@/lib/bilim/server";
import { LEVHALAR } from "@/lib/bilim/levhalar";
import { istanbulToday } from "@/lib/time/istanbul";
import { CONTACT } from "@/lib/site";
import { LEVHA_FONTLARI } from "@/components/bilim/levha/fontlar";
import { Ust } from "@/components/firin/Ust";
import { Kapi } from "@/components/firin/Kapi";
import { AyirDugmesi } from "@/components/firin/AyirDugmesi";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import type { ExtendedProduct } from "@/types";
import type { TezgahDurumu } from "@/lib/firin/tezgah";
import s from "@/components/firin/firin.module.css";

// Fırına uğramak: ana sayfanın yeni yönü için prototip (kavram taslağı, 25 Eki). Canlı ana sayfaya
// dokunmaz; arama motorlarına kapalı. Kapı → tezgâh → usta → arka oda → künye.

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Fırına uğramak · EkmekLab",
  robots: { index: false, follow: false },
};

const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

function bilgiSatiri(u: ExtendedProduct): string {
  const parcalar: string[] = [];
  if (u.flourTypes?.length) parcalar.push(u.flourTypes.join(", ").toLocaleLowerCase("tr-TR"));
  if (u.weight) parcalar.push(`${u.weight} ${u.weightUnit || "g"}`);
  if (u.hydration) parcalar.push(`%${u.hydration} su`);
  return parcalar.join(" · ");
}

function Satir({ u, d }: { u: ExtendedProduct; d: TezgahDurumu }) {
  const bilgi = bilgiSatiri(u);
  return (
    <li className={s.satir}>
      <Link href={`/urun/${u.slug || u.id}`} className={s.urunAd}>
        {u.name}
      </Link>
      <span className={s.fiyat}>{tl.format(u.price)}</span>
      {bilgi && <span className={s.bilgi}>{bilgi}</span>}
      <span className={`${s.durum} ${d.yakin ? "" : s.durumUzak}`}>{d.yazi}</span>
      <AyirDugmesi urun={u} acik={d.gun !== null} />
    </li>
  );
}

export default async function FirinaUgramak() {
  const [{ products }, ayarlar] = await Promise.all([getCatalog(), getStoreSettings()]);
  const teslim = computeDeliveryDates(ayarlar);
  const { breads, accompaniments } = groupCatalog(products);
  const now = new Date();

  const yolculuk = getYolculuk();
  const anlar = yolculuk.duraklar.flatMap((d) => d.anlar);
  // Günün levhası: tarihe göre sırayla döner
  const gunNo = Math.floor(Date.parse(`${istanbulToday(now)}T00:00:00Z`) / 86_400_000);
  const gununAni = anlar[gunNo % anlar.length];
  const rakam = gununAni ? LEVHALAR[gununAni.id]?.rakamlar[0] : undefined;

  return (
    <div className={`${LEVHA_FONTLARI} ${s.sayfa}`} lang="tr">
      <Ust />
      <main style={{ flex: 1 }}>
        <Kapi ilkSira={firinAniSirasi(now)} ilkSelam={selam(now)} />

        <section id="tezgah" className={s.bolum} aria-labelledby="tezgah-baslik" style={{ scrollMarginTop: 60 }}>
          <div className={s.ic}>
            <div className={s.bolumBas}>
              <span className={`${s.etiket}`} style={{ color: "var(--ikincil)" }}>
                Tezgâh
              </span>
              <h2 id="tezgah-baslik" className={s.bolumAd}>
                Bugün tezgâhta bunlar var
              </h2>
              <p className={s.bolumAlt}>Beğendiğini ayır, kapına getirelim. Teslimat {ayarlar.deliveryWindow} arası; aynı gün için siparişler saat {ayarlar.orderCutoffTime}'ye kadar.</p>
            </div>

            <div className={s.tezgahDuzen}>
              <div>
                <ul className={s.tahta}>
                  {breads.map((u) => (
                    <Satir key={u.id} u={u} d={tezgahDurumu(u, teslim, now)} />
                  ))}
                </ul>
                {breads.length === 0 && <p className={s.not}>Tezgâh şu an boş; ürünler yüklenemedi.</p>}

                {accompaniments.length > 0 && (
                  <div className={s.yaninda}>
                    <h3 className={s.yanindaBas}>Yanına</h3>
                    <ul className={s.tahta} style={{ borderTopWidth: 1 }}>
                      {accompaniments.map((u) => (
                        <Satir key={u.id} u={u} d={tezgahDurumu(u, teslim, now)} />
                      ))}
                    </ul>
                  </div>
                )}
                <p className={s.not}>Teslim günü, saat ve ödeme ayırırken seçilir. Kapıda nakit ya da kartla ödenir.</p>
              </div>
              <div className={`${s.yer} ${s.tezgahGorsel}`} role="img" aria-label="Fotoğraf yeri">
                fotoğraf · bugünün kesiti, yandan doğal ışık
                <br />
                (çekilecek)
              </div>
            </div>
          </div>
        </section>

        <section className={s.bolum} aria-labelledby="usta-baslik">
          <div className={`${s.ic} ${s.usta}`}>
            <span className={s.etiket} style={{ color: "var(--ikincil)" }}>
              Usta
            </span>
            <h2 id="usta-baslik" className={s.bolumAd}>
              Bu ekmekleri kim pişiriyor
            </h2>
            <p className={s.ustaYer}>Tahsin'in kendi sözleri buraya gelecek: iki üç cümle ya da otuz saniyelik bir ses kaydı. Neden ekşi maya, neden bu buğdaylar, fırında bir günün nasıl geçtiği.</p>
          </div>
        </section>

        <section className={s.bolum} aria-labelledby="arka-baslik">
          <div className={s.ic}>
            <div className={s.bolumBas}>
              <span className={s.etiket} style={{ color: "var(--ikincil)" }}>
                Arka oda
              </span>
              <h2 id="arka-baslik" className={s.bolumAd}>
                Fırının arkasındaki oda
              </h2>
              <p className={s.bolumAlt}>Ekmeğin içinde neler olduğunu ölçümleri ve kaynaklarıyla anlatan levhalar.</p>
            </div>
            <div className={s.arka}>
              {gununAni && (
                <Link href={`/bilim/${gununAni.id}`} className={s.levha}>
                  <span className={s.etiket} style={{ color: "var(--ikincil)" }}>
                    Günün levhası
                  </span>
                  <span className={s.levhaAd}>{gununAni.baslik}</span>
                  <span className={s.levhaSoru}>{gununAni.soru}</span>
                  {rakam && (
                    <span className={s.levhaRakam}>
                      {rakam.deger}
                      <small>{rakam.birim}</small>
                    </span>
                  )}
                </Link>
              )}
              <ul className={s.kapilar}>
                <li>
                  <Link href="/bilim">
                    <span className={s.kapiAd}>Bilim odası →</span>
                    <span className={s.kapiAlt}>Tarladan dilime {anlar.length} an</span>
                  </Link>
                </li>
                <li>
                  <Link href="/bilim/efsaneler">
                    <span className={s.kapiAd}>Efsane dosyası →</span>
                    <span className={s.kapiAlt}>Yaygın inançlar ve ölçümlerin söyledikleri</span>
                  </Link>
                </li>
                <li>
                  <Link href="/arac">
                    <span className={s.kapiAd}>Fırıncı araçları →</span>
                    <span className={s.kapiAlt}>Hamur yüzdesi, su sıcaklığı, maya planı</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className={`${s.ic} ${s.kunye}`}>
        <span className={s.etiket} style={{ color: "var(--ikincil)" }}>
          Künye
        </span>
        <dl className={s.kunyeListe}>
          <div>
            <dt>Fırın</dt>
            <dd>EkmekLab, {CONTACT.area}</dd>
          </div>
          <div>
            <dt>Telefon ve WhatsApp</dt>
            <dd>{CONTACT.phoneDisplay}</dd>
          </div>
          <div>
            <dt>E-posta</dt>
            <dd>{CONTACT.email}</dd>
          </div>
          <div>
            <dt>Teslimat</dt>
            <dd>Kapıya, {ayarlar.deliveryWindow} arası</dd>
          </div>
          <div>
            <dt>Sipariş</dt>
            <dd>Aynı gün için saat {ayarlar.orderCutoffTime}'ye kadar</dd>
          </div>
        </dl>
        <nav className={s.yasal} aria-label="Yasal">
          <Link href="/kvkk">KVKK</Link>
          <Link href="/gizlilik">Gizlilik</Link>
          <Link href="/mesafeli-satis">Mesafeli satış</Link>
          <Link href="/">Eski ana sayfa</Link>
        </nav>
      </footer>

      <CartDrawer />
      <OrderSuccessModal />
    </div>
  );
}
