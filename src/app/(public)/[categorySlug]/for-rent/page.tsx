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
  const data = await loadLanding(categorySlug, "rent");
  if (!data) return {};
  return buildMetadata({
    title: landingTitle(data.node, "rent"),
    description: landingDescription(data.node, "rent"),
    path: `/${data.node.slug}/for-rent`,
    noindex: data.total === 0,
  });
}

export default async function CategoryRentPage({ params }: PageProps) {
  const { categorySlug } = await params;
  const data = await loadLanding(categorySlug, "rent");
  if (!data) notFound();
  return <CategoryLanding data={data} mode="rent" />;
}
