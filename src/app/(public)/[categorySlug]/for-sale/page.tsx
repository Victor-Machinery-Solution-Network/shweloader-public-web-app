import type { Metadata } from "next";
import { notFound } from "next/navigation";

import "@/styles/pages/browse.css";

import {
  CategoryLanding,
  landingDescription,
  landingTitle,
  loadLanding,
} from "@/components/browse/category-landing";
import { buildMetadata } from "@/lib/seo/metadata";

export { generateStaticParams } from "../page";

interface PageProps {
  params: Promise<{ categorySlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const data = await loadLanding(categorySlug, "sale");
  if (!data) return {};
  return buildMetadata({
    title: landingTitle(data.node, "sale"),
    description: landingDescription(data.node, "sale"),
    path: `/${data.node.slug}/for-sale`,
    // Empty category = thin page; keep it out of the index until it has stock.
    noindex: data.listings.length === 0,
  });
}

export default async function CategorySalePage({ params }: PageProps) {
  const { categorySlug } = await params;
  const data = await loadLanding(categorySlug, "sale");
  if (!data) notFound();
  return <CategoryLanding data={data} mode="sale" />;
}
