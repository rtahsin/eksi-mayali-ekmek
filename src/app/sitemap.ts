import { MetadataRoute } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { INITIAL_PRODUCTS } from "@/data/initialProducts";
import { JOURNAL_ARTICLES } from "@/data/journalArticles";
import { getProductSlug } from "@/lib/utils/slugify";

export const revalidate = 3600; // 1 hour cache

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://ekmeklab.com";
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

  // 2. Journal Library Articles
  const journalRoutes: MetadataRoute.Sitemap = JOURNAL_ARTICLES.map((art) => ({
    url: `${baseUrl}/kutuphane/${art.slug}`,
    lastModified: art.publishedDate ? new Date(art.publishedDate) : now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // 3. Dynamic Products
  let productSlugs: string[] = INITIAL_PRODUCTS.map((p) => getProductSlug(p));
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      const supabase = createSupabaseClient(url, anonKey);
      const { data } = await supabase
        .from("products")
        .select("id, name, slug")
        .eq("is_active", true);

      if (data && data.length > 0) {
        productSlugs = data.map((p) => getProductSlug(p));
      }
    }
  } catch {}

  const uniqueSlugs = Array.from(new Set(productSlugs));
  const productRoutes: MetadataRoute.Sitemap = uniqueSlugs.map((slug) => ({
    url: `${baseUrl}/urun/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticRoutes, ...productRoutes, ...journalRoutes];
}
