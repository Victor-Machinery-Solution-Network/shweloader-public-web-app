import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShweLoader — Myanmar's Heavy Equipment Marketplace",
    short_name: "ShweLoader",
    description:
      "Buy, sell, and rent excavators, wheel loaders, cranes, and bulldozers across Myanmar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f3",
    theme_color: "#fbb811",
    lang: "en",
    categories: ["business", "shopping"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
