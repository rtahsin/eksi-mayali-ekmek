import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teslimat · EkmekLab",
  robots: { index: false, follow: false },
};

export default function KuryeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
