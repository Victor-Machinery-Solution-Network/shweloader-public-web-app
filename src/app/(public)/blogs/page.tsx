import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogIndex } from "@/components/blog/blog-index";
import { T } from "@/components/t";
import { getBlogs, getBlogCategories } from "@/lib/api/blogs";
import { getSiteSettings } from "@/lib/api/settings";
import { JsonLd, breadcrumbSchema } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

import "@/styles/pages/blog.css";

export const metadata = buildMetadata({ title: "Blog", path: "/blogs" });

/**
 * Blog index (chat6 "filter-first" variant): a page head (breadcrumb + title),
 * then a filter toolbar — horizontally-scrolling category rail from
 * `getBlogCategories()` + free-text search — over a single uniform editorial
 * grid of `BlogCard`. No lead/featured story, no newsletter strip.
 */
export default async function BlogsPage() {
  // Admin → Settings → Articles toggle: the whole section 404s when disabled.
  const { articlesEnabled } = await getSiteSettings();
  if (!articlesEnabled) notFound();

  const [posts, categories] = await Promise.all([
    getBlogs(),
    getBlogCategories(),
  ]);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blogs" },
        ])}
      />

      <section className="bx-pagehead" data-screen-label="Hero">
        <div className="container">
          <nav className="bx-crumbs" aria-label="Breadcrumb">
            <Link href="/"><T path="nav.home" /></Link>
            <span className="bx-crumbs-sep">/</span>
            <span><T path="nav.blogs" /></span>
          </nav>
          <h1 className="bx-h1"><T path="blog.title" /></h1>
        </div>
      </section>

      <section className="bx-archive-wrap" data-screen-label="Stories">
        <div className="container">
          <BlogIndex posts={posts} categories={categories} />
        </div>
      </section>
    </>
  );
}
