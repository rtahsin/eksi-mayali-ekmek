import { MetadataRoute } from "next";
import { getCatalog } from "@/lib/products/server";
import { articleIndex } from "@/lib/editorial";
import { GRAPH } from "@/lib/knowledge/registry";
import { getProductSlug } from "@/lib/utils/slugify";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600; // 1 hour cache

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const now = new Date();

  // 1. Core Static Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/kutuphane`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/kavram`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/arama`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kaynak`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/laboratuvar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mesafeli-satis`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/gizlilik`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/kvkk`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // 2. Journal Library Articles (from articleIndex)
  const journalRoutes: MetadataRoute.Sitemap = articleIndex()
    .filter((art) => art.status !== "arsiv")
    .map((art) => ({
      url: `${baseUrl}/kutuphane/${art.slug}`,
      lastModified: art.publishedAt ? new Date(art.publishedAt) : now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  // 3. Concepts Pages (from GRAPH.concepts)
  const conceptRoutes: MetadataRoute.Sitemap = Object.keys(GRAPH.concepts).map((slug) => ({
    url: `${baseUrl}/kavram/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // 4. Sources Pages (from GRAPH.sources)
  const sourceRoutes: MetadataRoute.Sitemap = Object.keys(GRAPH.sources).map((id) => ({
    url: `${baseUrl}/kaynak/${id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // 5. Dynamic Products
  const { products } = await getCatalog();
  const productSlugs = products.map((p) => getProductSlug(p));

  const uniqueSlugs = Array.from(new Set(productSlugs));
  const productRoutes: MetadataRoute.Sitemap = uniqueSlugs.map((slug) => ({
    url: `${baseUrl}/urun/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticRoutes, ...productRoutes, ...journalRoutes, ...conceptRoutes, ...sourceRoutes];
}
