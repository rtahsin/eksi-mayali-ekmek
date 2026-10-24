import Link from "next/link";
import Image from "next/image";

// Dükkândan bilim odasına köprü: ürün sayfasında, QR'dan gelen okura o ekmekte olan anlar.
// Anlar ürünün kaydından seçilir (src/lib/bilim/kopru.ts); kart yalnız anın başlığını ve sorusunu taşır.

export interface KopruAni {
  id: string;
  no: number;
  baslik: string;
  soru: string;
  resim?: string;
}

export function BilimKoprusu({ anlar }: { anlar: KopruAni[] }) {
  if (anlar.length === 0) return null;
  return (
    <section className="pt-6 border-t border-line" aria-labelledby="bilim-koprusu">
      <div className="rounded-3xl bg-[#161c26] text-[#f2eee6] p-5 sm:p-8 overflow-hidden">
        <p className="font-mono text-xs uppercase tracking-wider text-[#cfc8bc]">EkmekLab · Bilim odası</p>
        <h2 id="bilim-koprusu" className="font-serif text-2xl sm:text-3xl font-bold mt-1">
          Bu ekmekte ne oluyor?
        </h2>
        <p className="text-sm text-[#cfc8bc] mt-1 max-w-xl">
          Tanesinden kabuğuna, bu ekmeğin içindekilerle ilgili {anlar.length} an. Her cümle kaynağına bağlı.
        </p>
        <ol className="mt-5 -mx-5 px-5 pb-2 flex gap-3 overflow-x-auto snap-x snap-mandatory sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
          {anlar.map((a) => (
            <li key={a.id} className="snap-start shrink-0 w-[72%] sm:w-auto">
              <Link
                href={`/bilim/${a.id}`}
                className="group flex flex-col h-full rounded-2xl border border-white/15 hover:border-white/50 focus-visible:outline-2 focus-visible:outline-[#f2eee6] overflow-hidden transition-colors"
              >
                <span className="relative block aspect-[4/3] bg-black/30">
                  {a.resim && <Image src={a.resim} alt="" fill sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 72vw" className="object-cover" />}
                </span>
                <span className="block p-4">
                  <span className="block font-mono text-[11px] text-[#cfc8bc]">Levha {String(a.no).padStart(2, "0")}</span>
                  <span className="block font-serif font-bold text-base mt-0.5 group-hover:underline">{a.baslik}</span>
                  <span className="block text-xs text-[#cfc8bc] mt-1 leading-relaxed">{a.soru}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <Link
          href="/bilim"
          className="mt-4 inline-flex items-center min-h-11 text-sm font-serif underline underline-offset-4 hover:text-white"
        >
          Ekmeğin bütün yolculuğu →
        </Link>
      </div>
    </section>
  );
}
