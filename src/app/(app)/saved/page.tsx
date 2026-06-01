import Link from "next/link";

import "@/styles/pages/browse.css";

import { noindexMetadata } from "@/lib/seo/metadata";
import { SavedGrid } from "@/components/saved/saved-grid";

export const metadata = noindexMetadata;

/**
 * Saved page — visually identical to Browse, but the source list is the user's
 * saved (favourited) listings from localStorage (key `shweloader.saved`).
 *
 * This page is localStorage-only and works fully signed-out, so no token /
 * Suspense gate is needed. The static `.brz` shell (breadcrumbs + page title)
 * is server-rendered to match Browse; the hydration of cards from saved ids
 * happens client-side in <SavedGrid>.
 */
export default function SavedPage() {
  return (
    <div className="brz" data-screen-label="Saved">
      <div className="container brz-pagehead">
        <div className="brz-pagehead-l">
          <nav className="brz-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="brz-crumbs-sep">/</span>
            <span>Saved</span>
          </nav>
          <h1 className="brz-h1">Saved items</h1>
        </div>
      </div>

      <SavedGrid />
    </div>
  );
}
