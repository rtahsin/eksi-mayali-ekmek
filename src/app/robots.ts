import { MetadataRoute } from "next";

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
      ],
    },
    sitemap: "https://ekmeklab.com/sitemap.xml",
  };
}
