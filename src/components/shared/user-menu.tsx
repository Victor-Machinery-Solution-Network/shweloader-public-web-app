"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  LogOut,
  MessageCircle,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useI18n } from "@/components/providers/language-provider";

/**
 * Default avatar — a soft gold disc with a person glyph, identical for every
 * user (no photo upload). `size` controls the diameter.
 */
export function Avatar({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={"sl-avatar " + className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <User
        strokeWidth={1.75}
        style={{ width: Math.round(size * 0.52), height: Math.round(size * 0.52) }}
      />
    </span>
  );
}

// Unread counts surfaced in the account menu (and on the collapsed chip). These
// are presentational placeholders matching the design until a live unread
// source is wired in.
const UNREAD = { notifications: 3, messages: 2 };
const UNREAD_TOTAL = UNREAD.notifications + UNREAD.messages;

/**
 * Signed-in identity cluster — avatar + first name + chevron trigger that opens
 * an account menu (profile / notifications / messages / sign out). Closes on
 * outside click, Escape, and route navigation; coordinates with the mobile
 * hamburger drawer via the shared `sl-menu-open` event so only one is open.
 */
export function UserMenu() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [render, setRender] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Lock body scroll while open on mobile (it's a full overlay there); on desktop
  // it's a small anchored dropdown, so leave the page scrollable.
  useEffect(() => {
    if (!open) return;
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 880px)").matches
    )
      return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep the menu mounted through its close animation, then unmount the backdrop.
  useEffect(() => {
    if (open) {
      setRender(true);
      return;
    }
    if (!render) return;
    const id = setTimeout(() => setRender(false), 300);
    return () => clearTimeout(id);
  }, [open, render]);

  // Coordinate with the hamburger drawer — opening one closes the other.
  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent("sl-menu-open", { detail: "user" }));
    }
  }, [open]);
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== "user") setOpen(false);
    };
    window.addEventListener("sl-menu-open", onOther);
    return () => window.removeEventListener("sl-menu-open", onOther);
  }, []);

  const firstName =
    (user?.fullName || "").trim().split(/\s+/)[0] || t("account.title");
  const isPartner = !!user?.partner;

  return (
    <div className="mh-user" ref={wrapRef}>
      <button
        type="button"
        className={"mh-user-trigger" + (open ? " is-open" : "")}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t("account.title")}
      >
        <span className="mh-user-av">
          <Avatar size={32} />
          {UNREAD_TOTAL > 0 && (
            <span className="mh-user-dot tnum">
              {UNREAD_TOTAL > 9 ? "9+" : UNREAD_TOTAL}
            </span>
          )}
        </span>
        <span className="mh-user-name">{firstName}</span>
        <ChevronDown className="icon-sm mh-user-chev" strokeWidth={1.75} />
      </button>

      <div
        className={"mh-user-menu" + (open ? " is-open" : "")}
        role="menu"
        aria-hidden={!open}
      >
        <div className="mh-user-card">
          <Avatar size={44} />
          <div className="mh-user-card-text">
            <div className="mh-user-card-name">
              {user?.fullName}
              {isPartner ? (
                <ShieldCheck
                  className="icon-sm mh-user-verified"
                  strokeWidth={1.75}
                />
              ) : (
                <Shield
                  className="icon-sm mh-user-unverified"
                  strokeWidth={1.75}
                />
              )}
            </div>
            {user?.username && (
              <div className="mh-user-card-mail">@{user.username}</div>
            )}
          </div>
        </div>

        <div className="mh-user-sep" role="none" />

        <Link
          href="/account"
          className="mh-user-item"
          role="menuitem"
          onClick={() => setOpen(false)}
        >
          <User className="icon-sm" strokeWidth={1.75} />
          <span>{t("account.profile")}</span>
          <ArrowRight className="icon-sm mh-user-go" strokeWidth={1.75} />
        </Link>
        <Link
          href="/notifications"
          className="mh-user-item"
          role="menuitem"
          onClick={() => setOpen(false)}
        >
          <Bell className="icon-sm" strokeWidth={1.75} />
          <span>{t("notifications.title")}</span>
          <span className="mh-user-badge tnum">{UNREAD.notifications}</span>
          <ArrowRight className="icon-sm mh-user-go" strokeWidth={1.75} />
        </Link>
        <Link
          href="/chat"
          className="mh-user-item"
          role="menuitem"
          onClick={() => setOpen(false)}
        >
          <MessageCircle className="icon-sm" strokeWidth={1.75} />
          <span>{t("chat.title")}</span>
          <span className="mh-user-badge tnum">{UNREAD.messages}</span>
          <ArrowRight className="icon-sm mh-user-go" strokeWidth={1.75} />
        </Link>

        <div className="mh-user-sep" role="none" />

        <button
          type="button"
          className="mh-user-item mh-user-item--signout"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            void signOut();
          }}
        >
          <LogOut className="icon-sm" strokeWidth={1.75} />
          <span>{t("actions.signOut")}</span>
          <LogOut className="icon-sm mh-user-go" strokeWidth={1.75} />
        </button>
      </div>

      {render && (
        <button
          type="button"
          className={"mh-user-backdrop" + (open ? "" : " is-closing")}
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
