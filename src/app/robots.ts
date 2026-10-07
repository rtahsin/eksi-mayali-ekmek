import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/kurye/",
        "/fis/",
        "/ekstre/",
        "/auth/",
        "/hesabim/",
        "/tasarim/",
        "/laboratuvar/mikroskop",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
