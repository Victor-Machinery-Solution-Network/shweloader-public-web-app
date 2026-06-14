import "@/styles/pages/browse.css";

import {
  getAttachmentCategories,
  getBrands,
  getConditionTypes,
  getEquipmentCategories,
} from "@/lib/api/taxonomy";
import { getLocations } from "@/lib/api/locations";
import { noindexMetadata } from "@/lib/seo/metadata";
import { BrowseShell } from "@/components/browse/browse-shell";
import { SavedView } from "@/components/browse/saved-view";

export const metadata = noindexMetadata;

/**
 * Saved page — the SAME Browse chrome (filter sidebar + toolbar + grid/list + sort
 * + Buy/Rent toggle), but the listing set is the user's localStorage favourites
 * (key `shweloader.saved`), filtered + sorted + paginated CLIENT-SIDE in
 * <SavedView> (no API call per filter). The sidebar taxonomy is fetched here — the
 * same cached category/brand/location/condition calls Browse uses. Works fully
 * signed-out; noindex.
 */
export default async function SavedPage() {
  const [categories, attachmentCategories, brands, locations, conditionTypes] =
    await Promise.all([
      getEquipmentCategories(),
      getAttachmentCategories(),
      getBrands(),
      getLocations(),
      getConditionTypes(),
    ]);

  return (
    <BrowseShell
      categories={categories}
      attachmentCategories={attachmentCategories}
      brands={brands}
      locations={locations}
      conditionTypes={conditionTypes}
      headingKey="saved.title"
      crumbKey="actions.saved"
      screenLabel="Saved"
    >
      <SavedView attachmentCategories={attachmentCategories} />
    </BrowseShell>
  );
}
