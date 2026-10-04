import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Siparişlerim | EkmekLab",
  robots: { index: false, follow: false },
};

export default function DeviceOrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
