import type { Metadata } from "next";
import { notFound } from "next/navigation";

import "@/styles/pages/browse.css";

import {
  getAttachmentCategories,
  getEquipmentCategories,
} from "@/lib/api/taxonomy";
import { buildLandingNodes } from "@/lib/category-landing";
import {
  CategoryLanding,
  landingDescription,
  landingTitle,
  loadLanding,
} from "@/components/browse/category-landing";
import { buildMetadata } from "@/lib/seo/metadata";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const data = await loadLanding(categorySlug, "sale");
  if (!data) return {};
  return buildMetadata({
    title: landingTitle(data.node, "sale"),
    description: landingDescription(data.node, "sale"),
    path: `/${data.node.slug}`,
    // Empty category = thin page; keep it out of the index until it has stock.
    noindex: data.total === 0,
  });
}

export default async function CategoryLandingPage({ params }: PageProps) {
  const { categorySlug } = await params;
  const data = await loadLanding(categorySlug, "sale");
  if (!data) notFound();
  return <CategoryLanding data={data} mode="sale" />;
}
