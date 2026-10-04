import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

/** Kurye kadrosu yönetimi bayrakla kapalı (teslimatı şimdilik Tahsin yapıyor). */
export default function CourierManagementLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.courierManagement) notFound();
  return <>{children}</>;
}
