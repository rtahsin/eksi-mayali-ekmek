import Link from "next/link";
import { CONTACT, INSTAGRAM_HANDLE, INSTAGRAM_URL, whatsappLink } from "@/lib/site";

/** Krem alt bilgi: iletişim tek kaynaktan (src/lib/site.ts), yasal metinler. */
export function HomeFooter({ whatsappE164 }: { whatsappE164: string }) {
  return (
    <footer className="border-t border-krem-line bg-krem-paper text-krem-soft">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo_512.png" alt="" width={56} height={56} className="w-14 h-14 shrink-0" loading="lazy" />
          <div>
            <p className="font-serif text-lg font-semibold text-krem-ink">EkmekLab</p>
            <p>Mahallenin ekmek laboratuvarı.</p>
            <p>{CONTACT.area}</p>
          </div>
        </div>

        <div>
          <h2 className="font-serif text-base font-semibold text-krem-ink mb-2">İletişim</h2>
          <ul className="space-y-1.5">
            <li>
              <a href={`tel:+${CONTACT.phoneE164}`} className="hover:text-krem-ink">
                {CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={whatsappLink(undefined, whatsappE164)} className="hover:text-krem-ink">
                WhatsApp ile yaz
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="hover:text-krem-ink">
                {CONTACT.email}
              </a>
            </li>
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-krem-ink">
                @{INSTAGRAM_HANDLE}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-serif text-base font-semibold text-krem-ink mb-2">Site</h2>
          <ul className="space-y-1.5">
            <li>
              <a href="#ekmekler" className="hover:text-krem-ink">Ekmekler</a>
            </li>
            <li>
              <Link href="/siparislerim" className="hover:text-krem-ink">Siparişlerim</Link>
            </li>
            <li>
              <Link href="/laboratuvar" className="hover:text-krem-ink">Usta olabilir misin?</Link>
            </li>
            <li>
              <Link href="/kutuphane" className="hover:text-krem-ink">Kütüphane</Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-serif text-base font-semibold text-krem-ink mb-2">Yasal</h2>
          <ul className="space-y-1.5">
            <li>
              <Link href="/kvkk" className="hover:text-krem-ink">KVKK aydınlatma metni</Link>
            </li>
            <li>
              <Link href="/gizlilik" className="hover:text-krem-ink">Gizlilik ve çerezler</Link>
            </li>
            <li>
              <Link href="/mesafeli-satis" className="hover:text-krem-ink">Mesafeli satış sözleşmesi</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-krem-line">
        <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs">© {new Date().getFullYear()} EkmekLab</p>
      </div>
    </footer>
  );
}
