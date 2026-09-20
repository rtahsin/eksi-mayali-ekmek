import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EkmekLab Yönetim Paneli",
    short_name: "EkmekLab",
    description: "EkmekLab Taş Fırın Atölye & ERP Yönetim Paneli",
    start_url: "/admin",
    display: "standalone",
    background_color: "#120E0B",
    theme_color: "#120E0B",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/Icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/Icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/Icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/Icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
