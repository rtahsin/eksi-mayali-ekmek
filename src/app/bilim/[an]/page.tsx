import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAn, getAnKimlikleri } from "@/lib/bilim/server";
import { LevhaSayfasi } from "@/components/bilim/levha/LevhaSayfasi";
import { deneyTanimi } from "@/components/bilim/levha/deney";

// Her an levha düzeninde (fotoğrafsız, grafikli, dipnotlu). Bayrak anlarda sayfanın başında imza
// etkileşimiyle bir deney levhası durur (components/bilim/levha/deney).

export const dynamicParams = false;

export function generateStaticParams() {
  return getAnKimlikleri().map((an) => ({ an }));
}

interface PageProps {
  params: Promise<{ an: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { an } = await params;
  if (!getAnKimlikleri().includes(an)) return {};
  return { title: `${getAn(an).baslik} | Bilim odası | EkmekLab` };
}

export default async function AnSayfasi({ params }: PageProps) {
  const { an: id } = await params;
  if (!getAnKimlikleri().includes(id)) notFound();
  return <LevhaSayfasi anId={id} deney={deneyTanimi(getAn(id))} />;
}
