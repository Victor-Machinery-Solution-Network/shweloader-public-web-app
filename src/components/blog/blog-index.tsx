"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { BlogCard } from "@/components/blog/blog-card";
import { useI18n } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type { ApiBlogCategory, BlogPost } from "@/lib/api/types";

/**
 * Client filter toolbar + grid — ports the chat6 "filter-first" Blog index.
 *
 * A horizontally-scrolling category rail (built from `getBlogCategories()`)
 * plus a free-text search sit up top as the primary affordance; below them is
 * a single uniform editorial grid of `BlogCard`. Posts carry their category as
 * a name string, so the rail matches `post.category` against the category name.
 */
export function BlogIndex({
  posts,
  categories,
}: {
  posts: BlogPost[];
  categories: ApiBlogCategory[];
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (activeCat && (p.category ?? "") !== activeCat) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.content ?? "").toLowerCase().includes(q)
      );
    });
  }, [posts, query, activeCat]);

  return (
    <>
      <div className="bx-toolbar">
        {categories.length > 0 && (
          <div className="bx-cats-rail">
            <div className="bx-cats" role="tablist" aria-label="Blog categories">
              <button
                type="button"
                role="tab"
                aria-selected={activeCat === null}
                className={cn("bx-cat", activeCat === null && "is-on")}
                onClick={() => setActiveCat(null)}
              >
                {t("blog.all")}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCat === c.name}
                  className={cn("bx-cat", activeCat === c.name && "is-on")}
                  onClick={() => setActiveCat(c.name)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="bx-search">
          <Search className="bx-search-icon" />
          <input
            type="text"
            placeholder="Search stories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search stories"
          />
          {query && (
            <button
              type="button"
              className="bx-search-clear"
              onClick={() => setQuery("")}
              aria-label={t("actions.clear")}
            >
              <X className="icon-sm" />
            </button>
          )}
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="bx-empty">
          <Search className="bx-empty-icon" />
          <div className="bx-empty-title">No stories found</div>
          <div className="bx-empty-sub">
            Try a different search term or category.
          </div>
        </div>
      ) : (
        <div className="bx-grid">
          {filtered.map((p) => (
            <BlogCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </>
  );
}
