import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EkmekLab — Ekşi Mayalı Ekmek",
    short_name: "EkmekLab",
    description: "Beylikdüzü'nde taş fırından ekşi mayalı ekmekler ve günlük mandıra/şarküteri eşlikçileri; kapınıza teslim.",
    start_url: "/",
    scope: "/",
    lang: "tr",
    display: "standalone",
    background_color: "#F6EEDF",
    theme_color: "#B4532A",
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
