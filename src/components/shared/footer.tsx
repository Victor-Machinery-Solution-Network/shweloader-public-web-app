import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, Facebook, MessageCircle } from "lucide-react";

import { T } from "@/components/t";

/**
 * Site footer — dark warm-charcoal in both themes (the design CSS keeps the
 * white logo + dark background regardless of `[data-theme]`). Server component:
 * static markup, no interactivity. Headings are translatable via <T>; link
 * labels stay EN (chrome) and category links deep-link into /browse.
 */

const HOTLINE_DISPLAY = "+95 9 940 475 000";
const HOTLINE_TEL = "+959940475000";
const SALES_EMAIL = "sales@shweloader.com";

// Stable, code-level links only — no admin-editable (CRUD) category names, so a
// rename in the catalog can never break these. `type` is the equipment/attachment
// catalog split and `sort` is a code enum.
const MARKETPLACE_LINKS: { label: string; href: string }[] = [
  { label: "Browse All", href: "/browse" },
  { label: "Equipment", href: "/browse?type=equipment" },
  { label: "Attachments", href: "/browse?type=attachment" },
  { label: "Newest Items", href: "/browse?sort=newest" },
  { label: "Saved", href: "/saved" },
];

const COMPANY_LINKS: { label: string; href: string }[] = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blogs" },
];

export function Footer() {
  return (
    <footer className="sl-footer">
      <div className="container sl-footer-grid">
        <div className="sl-footer-brand">
          <Image
            src="/brand/parent_company_logo.png"
            alt="Victor Machinery Solution Network Co., Ltd"
            width={297}
            height={80}
            className="sl-footer-logo"
            priority={false}
          />
          <p className="sl-footer-tagline">
            Myanmar&apos;s marketplace for heavy equipment and machinery.
          </p>
          <ul className="sl-footer-contact">
            <li>
              <a
                href={`tel:${HOTLINE_TEL}`}
                aria-label={`Call our hotline ${HOTLINE_DISPLAY}`}
              >
                <Phone width={14} height={14} strokeWidth={2} aria-hidden="true" />
                <span>{HOTLINE_DISPLAY}</span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${SALES_EMAIL}`}
                aria-label={`Email our sales team ${SALES_EMAIL}`}
              >
                <Mail width={14} height={14} strokeWidth={2} aria-hidden="true" />
                <span>{SALES_EMAIL}</span>
              </a>
            </li>
          </ul>
        </div>

        <div className="sl-footer-col">
          <div className="sl-footer-col-h">
            <T path="footer.marketplace" />
          </div>
          <ul className="sl-footer-col-list">
            {MARKETPLACE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="sl-footer-col">
          <div className="sl-footer-col-h">
            <T path="footer.company" />
          </div>
          <ul className="sl-footer-col-list">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
          <div className="sl-footer-col-h" style={{ marginTop: 20 }}>
            <T path="footer.legal" />
          </div>
          {/* Native anchors (not next/link): the legal page is a single route
              with hash-driven tabs, and Next's client nav updates the hash via
              pushState WITHOUT firing `hashchange`, so the tab wouldn't switch
              when already on /legal. A plain <a> does real hash navigation. */}
          <ul className="sl-footer-col-list">
            <li>
              <a href="/legal#terms">
                <T path="footer.terms" />
              </a>
            </li>
            <li>
              <a href="/legal#privacy">
                <T path="footer.privacy" />
              </a>
            </li>
          </ul>
        </div>

        <div className="sl-footer-col sl-footer-follow">
          <div className="sl-footer-col-h">
            <T path="footer.follow" />
          </div>
          <div className="sl-footer-social" aria-label="Social channels">
            <a
              href="https://facebook.com/shweloader"
              target="_blank"
              rel="noopener noreferrer"
              className="sl-footer-social-btn"
              aria-label="Facebook"
            >
              <Facebook aria-hidden="true" />
            </a>
            <a
              href={`viber://chat?number=%2B${HOTLINE_TEL.replace(/^\+/, "")}`}
              className="sl-footer-social-btn"
              aria-label="Viber"
            >
              <MessageCircle aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="sl-footer-bar">
        <div className="container sl-footer-bar-inner">
          <span>© 2026 ShweLoader · Yangon, Myanmar</span>
        </div>
      </div>
    </footer>
  );
}
