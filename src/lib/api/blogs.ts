import { cacheLife, cacheTag } from "next/cache";
import { apiFetch, apiFetchOrNull } from "./client";
import { normalizeBlog } from "./normalize";
import { CACHE_TAGS, blogTag } from "./cache-tags";
import type { ApiBlog, ApiBlogCategory, BlogPost } from "./types";

export async function getBlogs(
  query: { category_id?: number; limit?: number; offset?: number } = {},
): Promise<BlogPost[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.blogs);
  const data = await apiFetch<ApiBlog[]>("/blogs", {
    query: { limit: 60, ...query },
  });
  return data.map(normalizeBlog);
}

export async function getBlog(id: number): Promise<BlogPost | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.blogs, blogTag(id));
  const data = await apiFetchOrNull<ApiBlog>(`/blogs/${id}`);
  return data ? normalizeBlog(data) : null;
}

export async function getBlogCategories(): Promise<ApiBlogCategory[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.blogCategories);
  return apiFetch<ApiBlogCategory[]>("/blogs/categories");
}

export async function getRelatedBlogs(
  post: BlogPost,
  limit = 3,
): Promise<BlogPost[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.blogs);
  const data = await apiFetch<ApiBlog[]>("/blogs", {
    query: { limit: limit + 1 },
  });
  return data
    .map(normalizeBlog)
    .filter((b) => b.id !== post.id)
    .slice(0, limit);
}
