import { Suspense } from "react";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { noindexMetadata } from "@/lib/seo/metadata";
import { getToken } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/client";
import { redirectIfBlacklisted } from "@/lib/auth/blacklist-redirect";
import {
  NotificationRow,
  type NotificationItem,
} from "@/components/notifications/notification-row";
import { SignedOutPrompt } from "./signed-out-prompt";
import "@/styles/pages/notifications.css";

export const metadata = noindexMetadata;

/** Static shell → Suspense → token-gated async Content (Cache Components). */
export default function NotificationsPage() {
  // The (app) layout already provides <main id="main"> — use a div here to
  // avoid nesting a second <main> (invalid HTML); keep the nf-page class.
  return (
    <div className="nf-page" data-screen-label="Notifications">
      <div className="nf-wrap">
        <nav className="nf-crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight className="icon-sm" strokeWidth={1.75} />
          <span className="cur">Notifications</span>
        </nav>

        <header className="nf-head-block">
          <h1 className="nf-h1">Notifications</h1>
        </header>

        <Suspense fallback={<NotificationsSkeleton />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}

async function Content() {
  const token = await getToken();
  if (!token) {
    return <SignedOutPrompt />;
  }

  // Authed feed. Shape is UNVERIFIED — treat as loosely typed, guard everything.
  // TODO: verify against live worker.
  let raw: unknown = [];
  try {
    raw = await apiFetch<unknown>("/notifications", { token });
  } catch (e) {
    redirectIfBlacklisted(e);
    raw = [];
  }
  const items = normalizeItems(raw);

  const unread = items.filter((i) => isUnread(i));
  const earlier = items.filter((i) => !isUnread(i));

  return (
    <>
      {items.length === 0 ? (
        <div className="nf-empty">
          <span className="nf-empty-ic" aria-hidden="true">
            <Bell strokeWidth={1.75} />
          </span>
          <div className="nf-empty-h">You&apos;re all caught up</div>
          <div className="nf-empty-s">
            Updates from ShweLoader will show up here.
          </div>
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <section className="nf-section">
              <div className="nf-sec-head">
                <span className="nf-sec-label">New</span>
              </div>
              <ul className="nf-list">
                {unread.map((it, idx) => (
                  <NotificationRow key={it.id ?? `u-${idx}`} item={it} />
                ))}
              </ul>
            </section>
          )}
          {earlier.length > 0 && (
            <section className="nf-section">
              <div className="nf-sec-head">
                <span className="nf-sec-label">Earlier</span>
              </div>
              <ul className="nf-list">
                {earlier.map((it, idx) => (
                  <NotificationRow key={it.id ?? `e-${idx}`} item={it} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

/** Tolerate `[]`, `{ items: [] }`, `{ notifications: [] }`, or junk. */
function normalizeItems(raw: unknown): NotificationItem[] {
  let list: unknown = raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    list = obj.items ?? obj.notifications ?? obj.data ?? [];
  }
  if (!Array.isArray(list)) return [];
  return list.filter(
    (x): x is NotificationItem => !!x && typeof x === "object",
  );
}

function isUnread(item: NotificationItem): boolean {
  if (typeof item.unread === "boolean") return item.unread;
  if (typeof item.read === "boolean") return !item.read;
  return false;
}

function NotificationsSkeleton() {
  return (
    <>
      <section className="nf-section" aria-hidden="true">
        <ul className="nf-list">
          {[0, 1, 2].map((i) => (
            <li className="nf-row" key={i}>
              <span className="nf-ic" />
              <div className="nf-main">
                <div className="nf-head">
                  <span className="nf-title">Loading…</span>
                </div>
                <p className="nf-body">&nbsp;</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
