"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Heart } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useAuth } from "@/lib/auth/use-auth";
import { AuthButtons } from "@/components/shared/auth-buttons";
import { LangSwitch } from "@/components/shared/lang-switch";
import { ThemeSwitch, ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/shared/user-menu";

interface NavLink {
  id: string;
  labelKey: string;
  href: string;
}

const LINKS: NavLink[] = [
  { id: "home", labelKey: "nav.home", href: "/" },
  { id: "browse", labelKey: "nav.browse", href: "/browse" },
  { id: "blogs", labelKey: "nav.blogs", href: "/blogs" },
  { id: "about", labelKey: "nav.about", href: "/about" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Global site header — sticky blurred bar with logo (light/dark swap), primary
 * nav, theme toggle, language switch, Saved heart, and the auth cluster
 * (signed-out buttons or the signed-in user menu). On mobile the nav collapses
 * into a hamburger drawer with a slide-down preferences + account panel.
 */
export function Header() {
  const { t } = useI18n();
  const { signedIn } = useAuth();
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer on Escape and when the viewport grows past the breakpoint.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 880) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  // Lock body scroll while the drawer is open so the page behind it can't scroll.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // Close the drawer when the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Coordinate with the account panel — opening the drawer closes it, and v.v.
  useEffect(() => {
    if (menuOpen) {
      window.dispatchEvent(new CustomEvent("sl-menu-open", { detail: "nav" }));
    }
  }, [menuOpen]);
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== "nav") setMenuOpen(false);
    };
    window.addEventListener("sl-menu-open", onOther);
    return () => window.removeEventListener("sl-menu-open", onOther);
  }, []);

  return (
    <header className="mh">
      <div className="container mh-row">
        <Link
          href="/"
          className="sl-logo"
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          aria-label="ShweLoader"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/loader.png"
            width={305}
            height={256}
            style={{ height: 30, width: "auto", marginRight: 8 }}
            alt=""
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo_dark_with_slogan.svg"
            className="sl-logo-light"
            width={1300}
            height={256}
            style={{ height: 30, width: "auto" }}
            alt="ShweLoader"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo_white_with_slogan.svg"
            className="sl-logo-dark"
            width={975}
            height={192}
            style={{ height: 30, width: "auto", display: "none" }}
            alt="ShweLoader"
          />
        </Link>

        <div className="mh-spacer" style={{ flex: 1 }} />

        <nav
          className="mh-nav"
          style={{ display: "flex", gap: 28, alignItems: "center" }}
          aria-label="Primary"
        >
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className={"mh-link" + (isActive(pathname, l.href) ? " is-active" : "")}
              style={{ textDecoration: "none" }}
              aria-current={isActive(pathname, l.href) ? "page" : undefined}
            >
              {t(l.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="mh-spacer" style={{ flex: 1 }} />

        <div
          className="mh-actions"
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <ThemeToggle />
          <Link href="/saved" className="mh-icon" aria-label={t("actions.saved")}>
            <Heart size={20} strokeWidth={1.75} />
          </Link>
          <LangSwitch />
          <span className="mh-divider" />
          {signedIn ? <UserMenu /> : <AuthButtons />}
        </div>

        {/* Hamburger — visible mobile only */}
        <button
          type="button"
          className={"mh-burger" + (menuOpen ? " is-open" : "")}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile drawer — slide-down panel under the header */}
      <div
        className={"mh-drawer" + (menuOpen ? " is-open" : "")}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <nav className="mh-drawer-nav" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className={
                "mh-drawer-link" + (isActive(pathname, l.href) ? " is-active" : "")
              }
              aria-current={isActive(pathname, l.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {t(l.labelKey)}
              <ArrowRight className="icon-sm mh-drawer-arrow" strokeWidth={1.75} />
            </Link>
          ))}
          <Link
            href="/saved"
            className="mh-drawer-link"
            onClick={() => setMenuOpen(false)}
          >
            {t("actions.saved")}
            <ArrowRight className="icon-sm mh-drawer-arrow" strokeWidth={1.75} />
          </Link>
        </nav>

        <div className="mh-drawer-actions">
          <div className="mh-drawer-prefs">
            <div className="mh-drawer-theme">
              <span className="mh-drawer-eyebrow">Theme</span>
              <ThemeSwitch />
            </div>
            <div className="mh-drawer-lang">
              <LangSwitch />
            </div>
          </div>
          {!signedIn && (
            <div className="mh-drawer-auth">
              <AuthButtons />
            </div>
          )}
        </div>
      </div>

      {/* Backdrop — taps outside the drawer to close */}
      {menuOpen && (
        <button
          type="button"
          className="mh-drawer-backdrop"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
        />
      )}
    </header>
  );
}
