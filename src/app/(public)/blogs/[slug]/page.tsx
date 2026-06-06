import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, User, Calendar, Clock } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import type { Metadata } from "next";

import "@/styles/pages/blog.css";

import { getBlog, getRelatedBlogs, getBlogs } from "@/lib/api/blogs";
import { blogSlug, parseIdFromSlug } from "@/lib/slug";
import { assetUrl, focalPosition } from "@/lib/assets";
import { formatDate } from "@/lib/format";
import { toPlainText, truncate } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  blogPostingSchema,
  breadcrumbSchema,
} from "@/lib/seo/jsonld";
import type { BlogPost } from "@/lib/api/types";

import { markdownToHtml } from "@/components/blogs/markdown";
import { BlogShare } from "@/components/blog/blog-share";

type Params = Promise<{ slug: string }>;

/** Resolve a post from the route slug, or null if the id doesn't parse/exist. */
async function resolvePost(slug: string): Promise<BlogPost | null> {
  const id = parseIdFromSlug(slug);
  if (!id) return null;
  return getBlog(id);
}

/** Build a meta/OG excerpt from the post body. */
function excerpt(post: BlogPost): string {
  return truncate(toPlainText(post.content), 180);
}

/** Pre-render every known post at build (canonical slugs); the rest are ISR. */
export async function generateStaticParams() {
  try {
    const posts = await getBlogs({ limit: 200 });
    const params = posts.map((p) => ({ slug: blogSlug(p) }));
    // Cache Components requires ≥1 param (empty array → build error). With no
    // posts (e.g. empty prod DB), fall back to a placeholder slug that resolves
    // to notFound() — keeps the build from crashing on empty data.
    return params.length ? params : [{ slug: "_" }];
  } catch {
    return [{ slug: "_" }];
  }
}

/** Markdown → sanitized HTML, cached so DOMPurify/jsdom's internal `new Date()`
 *  doesn't trip the Cache Components static-prerender guard. */
async function renderBody(content: string): Promise<string> {
  "use cache";
  return DOMPurify.sanitize(markdownToHtml(content), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "loading"],
  });
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) return {};

  const cover = assetUrl(post.cover.url);
  return buildMetadata({
    title: post.title,
    description: excerpt(post),
    path: `/blogs/${blogSlug(post)}`,
    type: "article",
    images: cover
      ? [{ url: cover, width: 1200, height: 675, alt: post.title }]
      : undefined,
    publishedTime: post.date ?? undefined,
    authors: post.author ? [post.author] : undefined,
    section: post.category ?? undefined,
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  const id = parseIdFromSlug(slug);
  if (!id) notFound();

  const post = await getBlog(id);
  if (!post) notFound();

  // Canonicalize: redirect non-canonical slugs (bare id, stale title) → 301.
  const canonical = blogSlug(post);
  if (slug !== canonical) redirect(`/blogs/${canonical}`);

  const related = await getRelatedBlogs(post, 3);

  const cover = assetUrl(post.cover.url);
  const bodyHtml = await renderBody(post.content);

  const byline = [
    post.author,
    formatDate(post.date),
    post.readTime ? `${post.readTime} min read` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <JsonLd
        data={[
          blogPostingSchema(post),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blogs" },
            { name: post.title, path: `/blogs/${canonical}` },
          ]),
        ]}
      />

      {/* Top: back link */}
      <section className="bp-top">
        <div className="container bp-top-row">
          <Link href="/blogs" className="bp-back">
            <ArrowRight
              className="icon-sm"
              style={{ transform: "rotate(180deg)" }}
              aria-hidden="true"
            />
            Back to blog
          </Link>
          <BlogShare title={post.title} />
        </div>
      </section>

      {/* Article */}
      <article className="bp-article">
        <header className="bp-header container">
          {post.category ? <div className="bp-cat">{post.category}</div> : null}
          <h1 className="bp-title">{post.title}</h1>
          {byline.length ? (
            <div className="bp-byline">
              {post.author ? (
                <span className="bp-byline-author">
                  <User className="bx-byline-ico" aria-hidden="true" />
                  <span className="bp-byline-name">{post.author}</span>
                </span>
              ) : null}
              {post.author && post.date ? (
                <span className="bp-byline-sep" aria-hidden="true">
                  ·
                </span>
              ) : null}
              {post.date ? (
                <span className="bp-byline-time">
                  <Calendar className="bx-byline-ico" aria-hidden="true" />
                  {formatDate(post.date)}
                </span>
              ) : null}
              {post.date && post.readTime ? (
                <span className="bp-byline-sep" aria-hidden="true">
                  ·
                </span>
              ) : null}
              {post.readTime ? (
                <span className="bp-byline-time">
                  <Clock className="bx-byline-clock" aria-hidden="true" />
                  {post.readTime} min read
                </span>
              ) : null}
            </div>
          ) : null}
        </header>

        {/* Hero image */}
        {cover ? (
          <figure className="bp-hero container">
            <Image
              src={cover}
              alt={post.title}
              width={1000}
              height={563}
              sizes="(max-width: 1024px) 100vw, 1000px"
              style={{
                objectFit: "cover",
                objectPosition: focalPosition(
                  post.cover.focalX,
                  post.cover.focalY,
                ),
              }}
              priority
            />
          </figure>
        ) : null}

        {/* Body — sanitized HTML rendered from Markdown */}
        <div
          className="bp-body container"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </article>

      {/* Related */}
      {related.length ? (
        <section className="bp-related-wrap">
          <div className="container">
            <div className="bp-related-head">
              <span className="bx-section-label">More from the blog</span>
            </div>
            <div className="bp-related-grid">
              {related.map((p) => {
                const pCover = assetUrl(p.cover.url);
                return (
                  <Link
                    key={p.id}
                    href={`/blogs/${blogSlug(p)}`}
                    className="bx-card"
                  >
                    <div className="bx-card-img">
                      {pCover ? (
                        <Image
                          src={pCover}
                          alt={p.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          style={{
                            objectFit: "cover",
                            objectPosition: focalPosition(
                              p.cover.focalX,
                              p.cover.focalY,
                            ),
                          }}
                        />
                      ) : null}
                    </div>
                    <div className="bx-card-body">
                      {p.category ? (
                        <span className="bx-story-eyebrow">{p.category}</span>
                      ) : null}
                      <h3 className="bx-card-title">{p.title}</h3>
                      <p className="bx-card-excerpt">
                        {truncate(toPlainText(p.content), 120)}
                      </p>
                      <div className="bx-card-foot">
                        {p.author ? (
                          <span className="bx-byline-name">
                            <User className="bx-byline-ico" aria-hidden="true" />
                            {p.author}
                          </span>
                        ) : null}
                        {p.author && p.date ? (
                          <span className="bx-byline-sep" aria-hidden="true">
                            ·
                          </span>
                        ) : null}
                        {p.date ? (
                          <span className="bx-byline-time">
                            <Calendar className="bx-byline-ico" aria-hidden="true" />
                            {formatDate(p.date)}
                          </span>
                        ) : null}
                        {p.readTime ? (
                          <>
                            <span className="bx-byline-sep" aria-hidden="true">
                              ·
                            </span>
                            <span className="bx-byline-time">
                              <Clock className="bx-byline-clock" aria-hidden="true" />
                              {p.readTime} min read
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <div style={{ height: 80 }} />
    </>
  );
}
