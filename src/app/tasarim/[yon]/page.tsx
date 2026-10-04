import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadDraftData } from "../data";
import { KremDraft } from "../_drafts/Krem";
import { GeceDraft } from "../_drafts/Gece";
import { TezgahDraft } from "../_drafts/Tezgah";

export const metadata: Metadata = { title: "Tasarım taslağı", robots: { index: false, follow: false } };
export const revalidate = 300;

const DRAFTS = { krem: KremDraft, gece: GeceDraft, tezgah: TezgahDraft } as const;

export default async function DraftPage({ params }: { params: Promise<{ yon: string }> }) {
  const { yon } = await params;
  const Draft = DRAFTS[yon as keyof typeof DRAFTS];
  if (!Draft) notFound();
  return <Draft data={await loadDraftData()} />;
}
