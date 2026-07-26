import { notFound, permanentRedirect } from "next/navigation";

import {
  getAttachmentCategories,
  getEquipmentCategories,
} from "@/lib/api/taxonomy";
import { buildLandingNodes } from "@/lib/category-landing";

interface PageProps {
  params: Promise<{ categorySlug: string }>;
}

/** Pre-render every taxonomy landing page; unknown slugs → notFound. */
export async function generateStaticParams() {
  try {
    const [cats, attach] = await Promise.all([
      getEquipmentCategories(),
      getAttachmentCategories(),
    ]);
    const params = buildLandingNodes(cats, attach).map((n) => ({
      categorySlug: n.slug,
    }));
    // Cache Components requires ≥1 param (empty catalog on a fresh DB).
    return params.length ? params : [{ categorySlug: "_" }];
  } catch {
    return [{ categorySlug: "_" }];
  }
}

/** A category has no mode-less view — /bulldozers 308s to /bulldozers/for-sale. */
export default async function CategoryIndexPage({ params }: PageProps) {
  const { categorySlug } = await params;
  const [cats, attach] = await Promise.all([
    getEquipmentCategories(),
    getAttachmentCategories(),
  ]);
  const node = buildLandingNodes(cats, attach).find(
    (n) => n.slug === categorySlug,
  );
  if (!node) notFound();
  permanentRedirect(`/${node.slug}/for-sale`);
}
