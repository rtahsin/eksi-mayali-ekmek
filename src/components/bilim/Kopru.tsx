import Link from "next/link";

// Dükkândan bilim odasına köprü: ürün sayfasında, QR'dan gelen okura o ekmekte olan anlar.
// Anlar ürünün kaydından seçilir (src/lib/bilim/kopru.ts); kart yalnız anın başlığını ve sorusunu taşır.

export interface KopruAni {
  id: string;
  no: number;
  baslik: string;
  soru: string;
  /** Anın ilk rakamı (levha düzeninden); kartın görseli yerine. */
  rakam?: string;
}

export function BilimKoprusu({ anlar }: { anlar: KopruAni[] }) {
  if (anlar.length === 0) return null;
  return (
    <section className="pt-6 border-t border-line" aria-labelledby="bilim-koprusu">
      <div className="bg-[#f1eee7] text-[#1b1a17] border-y-4 border-double border-[#1b1a17] p-5 sm:p-8 overflow-hidden">
        <p className="font-mono text-xs uppercase tracking-wider text-[#5d5a52]">EkmekLab · Bilim odası</p>
        <h2 id="bilim-koprusu" className="font-serif text-2xl sm:text-3xl font-bold mt-1">
          Bu ekmekte ne oluyor?
        </h2>
        <p className="text-sm text-[#5d5a52] mt-1 max-w-xl">
          Tanesinden kabuğuna, bu ekmeğin içindekilerle ilgili {anlar.length} an. Her cümle kaynağına bağlı.
        </p>
        <ol className="mt-5 -mx-5 px-5 pb-2 flex gap-3 overflow-x-auto snap-x snap-mandatory sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
          {anlar.map((a) => (
            <li key={a.id} className="snap-start shrink-0 w-[72%] sm:w-auto">
              <Link
                href={`/bilim/${a.id}`}
                className="group flex flex-col h-full border-t border-[#1b1a17] hover:bg-[#1b1a17]/5 focus-visible:outline-2 focus-visible:outline-[#1b1a17] overflow-hidden transition-colors"
              >
                <span className="block px-4 pt-5 pb-3 border-b border-[#d6d0c3] font-serif text-3xl font-light tracking-tight min-h-[4.5rem]">
                  {a.rakam ?? "Deney levhası"}
                </span>
                <span className="block p-4">
                  <span className="block font-mono text-[11px] text-[#5d5a52]">Levha {String(a.no).padStart(2, "0")}</span>
                  <span className="block font-serif font-bold text-base mt-0.5 group-hover:underline">{a.baslik}</span>
                  <span className="block text-xs text-[#5d5a52] mt-1 leading-relaxed">{a.soru}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <Link
          href="/bilim"
          className="mt-4 inline-flex items-center min-h-11 text-sm font-serif underline underline-offset-4 hover:text-[#8f3d1c]"
        >
          Ekmeğin bütün yolculuğu →
        </Link>
      </div>
    </section>
  );
}
