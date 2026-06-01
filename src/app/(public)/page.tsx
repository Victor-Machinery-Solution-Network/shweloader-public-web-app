import type { Metadata } from "next";

import { AnnouncementBar } from "@/components/shared/announcement-bar";
import { SearchCard } from "@/components/shared/search-card";
import { Hero } from "@/components/home/hero";
import { CategoriesV2 } from "@/components/home/categories-v2";
import { Featured } from "@/components/home/featured";

import { getCarousel, getAnnouncements } from "@/lib/api/home";
import {
  getEquipmentCategories,
  getAttachmentCategories,
} from "@/lib/api/taxonomy";
import { getFeaturedListings } from "@/lib/api/listings";
import { getLocations } from "@/lib/api/locations";

import { buildMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/jsonld";

export const metadata: Metadata = buildMetadata({ path: "/" });

/**
 * Homepage — composes the announcement reel, hero promo carousel, contextual
 * search, category browser, and featured listings. All data comes from the
 * cached foundation services (ISR-friendly via `use cache`), fetched in
 * parallel. The `<main>` wrapper, header, footer, live-chat and promo popup are
 * provided by the (public) layout, so this only renders the page sections.
 */
export default async function HomePage() {
  const [
    slides,
    announcements,
    equipmentCategories,
    attachmentCategories,
    featured,
    locations,
  ] = await Promise.all([
    getCarousel(),
    getAnnouncements(),
    getEquipmentCategories(),
    getAttachmentCategories(),
    getFeaturedListings(),
    getLocations(),
  ]);

  return (
    <>
      <h1 className="sr-only">
        ShweLoader — Myanmar&apos;s heavy equipment marketplace: buy, sell, and
        rent excavators, wheel loaders, cranes, and bulldozers
      </h1>
      <JsonLd data={[organizationSchema(), websiteSchema()]} />

      <AnnouncementBar announcements={announcements} />

      <div className="container" style={{ paddingTop: 20 }}>
        <Hero slides={slides} />
      </div>

      <section style={{ padding: "24px 0 0" }}>
        <div className="container">
          <SearchCard
            categories={equipmentCategories}
            attachmentCategories={attachmentCategories}
            locations={locations}
          />
        </div>
      </section>

      <CategoriesV2
        equipmentCategories={equipmentCategories}
        attachmentCategories={attachmentCategories}
      />

      <Featured listings={featured} />

      <div style={{ height: 56 }} />
    </>
  );
}
