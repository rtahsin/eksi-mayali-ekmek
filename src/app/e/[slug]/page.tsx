import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ n?: string }>;
}

/**
 * Ekmek etiketindeki QR'ın iniş adresi: ekmeklab.tr/e/<slug>?n=<şarküteri kodu>.
 * Taramayı kaydeder (kişisel veri yok) ve ürün sayfasına yönlendirir.
 */
export default async function QrLanding({ params, searchParams }: Props) {
  const { slug } = await params;
  const { n } = await searchParams;
  const cleanSlug = decodeURIComponent(slug).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
  const code = (n || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
  const ref = code ? `qr-${code}` : "qr";

  try {
    const supabase = createAdminClient();
    if (supabase) await supabase.from("funnel_events").insert({ event: "scan", ref, code: cleanSlug.slice(0, 40) });
  } catch {
    // ölçüm yönlendirmeyi bozmaz
  }
  redirect(cleanSlug ? `/urun/${cleanSlug}?ref=${ref}` : `/?ref=${ref}`);
}
