"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Headset,
  Megaphone,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";

/**
 * A single read-only notification. Interactive only for the optional contextual
 * CTA: a `chat` action dispatches the global `shwe:open-chat` event (consumed by
 * the LiveChat overlay); otherwise it's a plain link.
 *
 * Shapes are UNVERIFIED against the live worker — every field is optional and
 * guarded. // TODO: verify against live worker.
 */
export interface NotificationCta {
  label?: string | null;
  href?: string | null;
  action?: string | null;
}

export interface NotificationItem {
  id?: string | number;
  type?: string | null;
  unread?: boolean;
  read?: boolean;
  // Time may arrive as a preformatted string ("2h ago") or a timestamp.
  time?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  title?: string | null;
  body?: string | null;
  message?: string | null;
  cta?: NotificationCta | null;
}

interface TypeMeta {
  Icon: LucideIcon;
  cls: string;
}

const TYPE_META: Record<string, TypeMeta> = {
  partner: { Icon: ShieldCheck, cls: "is-partner" },
  admin: { Icon: Headset, cls: "is-admin" },
  announcement: { Icon: Megaphone, cls: "is-ann" },
};

const ISO_LIKE = /^\d{4}-\d{2}-\d{2}|^\d{10,}$/;

/** Resolve a display time string defensively from any of the time fields. */
function resolveTime(item: NotificationItem): string {
  const raw = item.time ?? item.createdAt ?? item.created_at ?? "";
  if (!raw) return "";
  // If it looks like a timestamp/ISO date, relativize; otherwise trust as-is.
  return ISO_LIKE.test(raw) ? timeAgo(raw) : raw;
}

export function NotificationRow({ item }: { item: NotificationItem }) {
  const typeKey = (item.type ?? "announcement").toLowerCase();
  const meta = TYPE_META[typeKey] ?? TYPE_META.announcement;
  const { Icon } = meta;

  const unread = item.unread ?? (item.read === undefined ? false : !item.read);
  const title = item.title ?? "Update";
  const body = item.body ?? item.message ?? "";
  const time = resolveTime(item);

  const cta = item.cta ?? null;
  const ctaLabel = cta?.label ?? "";
  const isChat = cta?.action === "chat";
  const ctaHref = cta?.href || "#";

  const onChatClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("shwe:open-chat"));
  };

  return (
    <li className={cn("nf-row", unread && "is-unread")}>
      <span className={cn("nf-ic", meta.cls)} aria-hidden="true">
        <Icon strokeWidth={1.75} />
      </span>
      <div className="nf-main">
        <div className="nf-head">
          <span className="nf-title">{title}</span>
          {unread && <span className="nf-new-pill">NEW</span>}
          {time && <span className="nf-time">{time}</span>}
        </div>
        {body && <p className="nf-body">{body}</p>}
        {cta && ctaLabel ? (
          isChat ? (
            <a className="nf-cta" href="#" onClick={onChatClick}>
              {ctaLabel}
              <ArrowRight className="icon-sm" strokeWidth={1.75} />
            </a>
          ) : (
            <Link className="nf-cta" href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="icon-sm" strokeWidth={1.75} />
            </Link>
          )
        ) : null}
      </div>
    </li>
  );
}
