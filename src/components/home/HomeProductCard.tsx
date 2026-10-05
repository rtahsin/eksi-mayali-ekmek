import Link from "next/link";
import type { Product } from "@/types";
import { productBadges } from "@/lib/products/badges";
import { formatTl, weightText } from "@/lib/products/homeSections";
import { getProductUrl } from "@/lib/utils/slugify";
import { AddToCartButton } from "./AddToCartButton";

function Price({ p, large = false }: { p: Product; large?: boolean }) {
  return (
    <span className={`font-semibold tabular-nums text-krem-ink ${large ? "text-2xl" : "text-base"}`}>
      {p.compareAtPrice && p.compareAtPrice > p.price ? (
        <span className="sr-only">İndirimli fiyat: </span>
      ) : null}
      {formatTl(p.price)}
      {p.compareAtPrice && p.compareAtPrice > p.price ? (
        <s className="ml-1.5 text-sm font-normal text-krem-soft">
          <span className="sr-only">Eski fiyat: </span>
          {formatTl(p.compareAtPrice)}
        </s>
      ) : null}
    </span>
  );
}

function Badges({ p }: { p: Product }) {
  const badges = productBadges(p);
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span
          key={b.label}
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
            b.tone === "danger" ? "bg-krem-line text-krem-soft" : "bg-krem-card text-krem-accent-ink border border-krem-line"
          }`}
        >
          {b.label}
        </span>
      ))}
    </span>
  );
}

/** Katalog kartı: görsel + ad (ürün sayfasına) + gramaj + fiyat + sepete ekle. */
export function HomeProductCard({ p }: { p: Product }) {
  const href = getProductUrl(p);
  return (
    <article className="flex flex-col">
      <Link href={href} className="block aspect-[4/5] overflow-hidden rounded-2xl border border-krem-line bg-krem-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.imageUrl || "/logo/logo_512.png"}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className={`w-full h-full ${p.imageUrl ? "object-cover" : "object-contain p-8"} ${p.isAvailable === false ? "opacity-60" : ""}`}
        />
      </Link>
      <div className="pt-3 flex-1 flex flex-col gap-2">
        <h3 className="font-serif text-[16px] sm:text-lg leading-snug font-semibold text-krem-ink">
          <Link href={href} className="hover:text-krem-accent-ink">
            {p.name}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-krem-soft">
          {weightText(p) && <span>{weightText(p)}</span>}
          <Badges p={p} />
        </div>
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          <Price p={p} />
          <AddToCartButton product={p} />
        </div>
      </div>
    </article>
  );
}

/** Öne çıkan (imza) ekmek: geniş kart, açıklama admin'deki ürün metninden. */
export function FeaturedProductCard({ p }: { p: Product }) {
  const href = getProductUrl(p);
  return (
    <article className="grid md:grid-cols-2 overflow-hidden rounded-[24px] border border-krem-line bg-krem-card">
      <Link href={href} className="block aspect-[4/3] md:aspect-auto md:min-h-[360px] bg-krem-paper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.imageUrl || "/logo/logo_512.png"}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className={`w-full h-full ${p.imageUrl ? "object-cover" : "object-contain p-10"}`}
        />
      </Link>
      <div className="p-5 sm:p-8 flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-krem-accent-ink">Ön siparişle</p>
        <h3 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-krem-ink">
          <Link href={href} className="hover:text-krem-accent-ink">
            {p.name}
          </Link>
        </h3>
        {p.description && (
          <p className="text-[15px] leading-relaxed text-krem-soft line-clamp-4">{p.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-krem-soft">
          {weightText(p) && <span>{weightText(p)}</span>}
          <Badges p={p} />
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
          <Price p={p} large />
          <div className="flex items-center gap-2">
            <Link
              href={href}
              className="h-12 inline-flex items-center px-5 rounded-full border border-krem-ink text-[15px] font-semibold text-krem-ink hover:bg-krem-paper"
            >
              Hikâyesi
            </Link>
            <AddToCartButton product={p} size="lg" />
          </div>
        </div>
      </div>
    </article>
  );
}
