import type { Metadata } from "next";
import { AdminLayoutClient } from "./AdminLayoutClient";

export const metadata: Metadata = {
  title: "EkmekLab Yönetim",
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
