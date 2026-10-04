import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sipariş Takibi | EkmekLab",
  robots: { index: false, follow: false },
};

export default function OrderTrackingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
