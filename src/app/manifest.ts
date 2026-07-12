import type { MetadataRoute } from "next";

import { ANDROID_PACKAGE, APP_STORE_URL, APPLE_APP_ID } from "@/lib/seo/metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Chrome on Android reads these and promotes the native Play app (its
    // closest equivalent to iOS Safari's Smart App Banner) instead of offering
    // to install this site as a PWA.
    prefer_related_applications: true,
    related_applications: [
      {
        platform: "play",
        id: ANDROID_PACKAGE,
        url: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
      },
      { platform: "itunes", id: APPLE_APP_ID, url: APP_STORE_URL },
    ],
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
