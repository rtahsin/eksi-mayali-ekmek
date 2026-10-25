import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import createMDX from "@next/mdx";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  // Ürün sayfası (QR köprüsü) ve site haritası ISR'da bilim odasının kayıtlarını okur; dosyalar sunucu paketine girsin.
  outputFileTracingIncludes: {
    "/urun/*": ["./content/bilim/yolculuk.json", "./content/bilim/gorseller.json", "./content/bilim/anlar/*.json"],
    "/sitemap.xml": ["./content/bilim/yolculuk.json"],
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "eksimayaliekmekweb.firebasestorage.app",
      },
      {
        protocol: "https",
        hostname: "yayxobdugadqjskddixj.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Kütüphane kaldırıldı (25 Eki); bilgi tarafının tek kapısı Bilim odası. Eski bağlantılar kırılmasın.
  async redirects() {
    return [
      { source: "/kutuphane", destination: "/bilim", permanent: true },
      { source: "/kutuphane/:path*", destination: "/bilim", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [],
  },
});

export default withSentryConfig(withMDX(nextConfig), {
  silent: true,
  widenClientFileUpload: true,
});
