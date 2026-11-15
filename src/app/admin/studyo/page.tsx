import type { Metadata } from "next";
import { StudyoClient } from "@/components/admin/studyo/StudyoClient";
import { loadStudyoWorkspace } from "@/lib/studyo/storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bulut İçerik Stüdyosu | EkmekLab Atölye",
  robots: { index: false, follow: false },
};

export default async function AdminStudyoPage() {
  const workspace = await loadStudyoWorkspace();
  return <StudyoClient initialWorkspace={workspace} />;
}
