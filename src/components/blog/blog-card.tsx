"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BookOpen, User, Calendar, Clock } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { focalPosition } from "@/lib/assets";
import { formatDate } from "@/lib/format";
import { blogSlug } from "@/lib/slug";
import type { BlogPost } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Editorial story card — ports the design's `.bx-story` (Blog.jsx `BxStory`).
 *
 * The cover always renders a designed `.bx-cover-fallback` panel behind the
 * photo: a category-tinted field plus an oversized watermark icon. When the
 * post has no image — or the image fails to load — the branded panel shows
 * through, so a card is never an empty box. Byline reads
 * "Author · Date · X min read" with NO author avatar.
 */
export function BlogCard({ post }: { post: BlogPost }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const href = `/blogs/${blogSlug(post)}`;
  const cover = post.cover.url;
  const excerpt = post.content
    ? post.content
        .replace(/<[^>]+>/g, " ")
        .replace(/[#>*_~`]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  return (
    <Link href={href} className="bx-story" data-cat={post.category}>
      <div
        className={cn("bx-cover", "bx-cover-md", failed && "is-failed")}
        data-cat={post.category}
        style={{ aspectRatio: "16 / 10" }}
      >
        {/* Designed fallback layer — always rendered behind the photo. */}
        <div className="bx-cover-fallback" aria-hidden="true">
          <BookOpen className="bx-cover-watermark" />
        </div>
        {!failed && cover && (
          <Image
            src={cover}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, 300px"
            style={{
              objectFit: "cover",
              objectPosition: focalPosition(post.cover.focalX, post.cover.focalY),
            }}
            onError={() => setFailed(true)}
          />
        )}
      </div>

      <div className="bx-story-body">
        {post.category && (
          <span className="bx-story-eyebrow">{post.category}</span>
        )}
        <h3 className="bx-story-title">{post.title}</h3>
        {excerpt && <p className="bx-story-excerpt">{excerpt}</p>}
        <div className="bx-story-foot">
          <div className="bx-byline">
            {post.author && (
              <>
                <span className="bx-byline-name">
                  <User className="bx-byline-ico" />
                  {post.author}
                </span>
                <span className="bx-byline-sep" aria-hidden="true">
                  ·
                </span>
              </>
            )}
            {post.date && (
              <>
                <span className="bx-byline-time">
                  <Calendar className="bx-byline-ico" />
                  {formatDate(post.date)}
                </span>
                <span className="bx-byline-sep" aria-hidden="true">
                  ·
                </span>
              </>
            )}
            <span className="bx-byline-read">
              <Clock className="bx-byline-clock" />
              {post.readTime} {t("blog.minRead")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
