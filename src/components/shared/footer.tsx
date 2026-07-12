import Image from "next/image";
import Link from "next/link";
import { Phone, Mail } from "lucide-react";

import { T } from "@/components/t";
import { getContactEmails, getSiteSettings } from "@/lib/api/settings";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/seo/metadata";

/**
 * Site footer — dark warm-charcoal in both themes (the design CSS keeps the
 * white logo + dark background regardless of `[data-theme]`). Server component:
 * static markup, no interactivity. Headings are translatable via <T>; link
 * labels stay EN (chrome) and category links deep-link into /browse.
 * The hotline comes from Admin → Settings → Contact Phone (getSiteSettings).
 */

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

// Filled brand glyphs (official Simple Icons paths). Inline SVG keeps the bundle
// lean (no icon dependency) and inherits the footer's color via `currentColor`.
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

function ViberIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
      <path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906 2.57-.002.168.13.306.3.31.166.003.305-.13.31-.297.025-1.175-.334-2.193-1.067-2.994-.74-.81-1.777-1.253-3.05-1.346h-.024zm.463 1.63c-.16.002-.29.127-.3.287-.008.167.12.31.288.32.523.028.875.175 1.113.422.24.245.388.62.416 1.164.01.167.15.295.318.287.167-.008.295-.15.287-.317-.03-.644-.215-1.178-.58-1.557-.367-.378-.893-.574-1.52-.607h-.018z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.27 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export async function Footer() {
  const [{ sales: SALES_EMAIL }, { contactPhone, articlesEnabled }] =
    await Promise.all([getContactEmails(), getSiteSettings()]);
  // Display as stored ("+95 9 940 475 000"); strip spaces for tel:/Viber/Telegram.
  const HOTLINE_DISPLAY = contactPhone;
  const HOTLINE_TEL = contactPhone.replace(/\s+/g, "");
  const companyLinks = articlesEnabled
    ? COMPANY_LINKS
    : COMPANY_LINKS.filter((l) => l.href !== "/blogs");
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
          {/* Official store badge artwork (required by Apple/Google guidelines).
              The Play badge PNG carries ~8% built-in padding, so it renders
              slightly taller to visually match the Apple badge's 40px. */}
          <div className="sl-footer-badges">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Image
                src="/brand/app-store-badge.svg"
                alt="Download on the App Store"
                width={120}
                height={40}
              />
            </a>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Image
                src="/brand/google-play-badge.png"
                alt="Get it on Google Play"
                width={124}
                height={48}
              />
            </a>
          </div>
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
            {companyLinks.map((link) => (
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
              <FacebookIcon />
            </a>
            <a
              href={`viber://chat?number=%2B${HOTLINE_TEL.replace(/^\+/, "")}`}
              className="sl-footer-social-btn"
              aria-label="Viber"
            >
              <ViberIcon />
            </a>
            <a
              href={`https://t.me/${HOTLINE_TEL}`}
              target="_blank"
              rel="noopener noreferrer"
              className="sl-footer-social-btn"
              aria-label="Telegram"
            >
              <TelegramIcon />
            </a>
            <a
              href="https://www.tiktok.com/@shweloader_vmsn?_r=1&_t=ZS-97OiO5J3BUj"
              target="_blank"
              rel="noopener noreferrer"
              className="sl-footer-social-btn"
              aria-label="TikTok"
            >
              <TikTokIcon />
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
