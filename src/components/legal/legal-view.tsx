"use client";

// ============================================================
// Legal — Terms of Service + Privacy Policy on one page.
// Tab switch up top + sticky section nav (TOC) with scroll-spy.
// Ports homepage/Legal.jsx → typed client component.
// ============================================================

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type DocKey = "terms" | "privacy";

interface LegalSectionData {
  id: string;
  h: string;
  /** Paragraphs of body copy. */
  body: string[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: string[];
}

interface LegalDoc {
  label: string;
  updated: string;
  sections: LegalSectionData[];
}

const LEGAL: Record<DocKey, LegalDoc> = {
  terms: {
    label: "Terms of Service",
    updated: "Last updated 1 June 2026",
    sections: [
      {
        id: "acceptance",
        h: "Acceptance of terms",
        body: [
          "These Terms of Service govern your access to and use of the ShweLoader website, mobile applications, and related services (together, the “Platform”), operated by Victor Machinery Solution Network Co., Ltd. (“ShweLoader”, “we”, “us”).",
          "By accessing or using the Platform, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must not use the Platform.",
        ],
      },
      {
        id: "accounts",
        h: "Accounts & eligibility",
        body: [
          "You must be at least 18 years old and capable of forming a binding contract to create an account. You are responsible for keeping your login credentials confidential and for all activity that occurs under your account.",
          "You agree to provide accurate, current, and complete information during registration and to keep it up to date. We may suspend or close accounts that contain false, misleading, or incomplete information.",
        ],
      },
      {
        id: "listings",
        h: "Listings & content",
        body: [
          "Sellers are solely responsible for the accuracy of their listings, including specifications, condition, pricing, location, and ownership of the equipment offered. Listings must describe real machinery that the seller has the right to sell or rent.",
          "By posting content, you grant ShweLoader a non-exclusive, royalty-free licence to host, display, and promote that content across the Platform and our marketing channels. You retain ownership of your content.",
        ],
        bullets: [
          "No counterfeit, stolen, or misrepresented equipment.",
          "No duplicate listings for the same unit.",
          "Photos must depict the actual item offered.",
        ],
      },
      {
        id: "transactions",
        h: "Transactions & payments",
        body: [
          "ShweLoader is a marketplace that connects buyers, sellers, and renters. We are not a party to any transaction and do not take possession of, inspect, or guarantee any equipment listed on the Platform.",
          "Prices are shown in MMK and, where provided, USD. Payment terms, deposits, inspections, delivery, and transfer of title are agreed directly between the buyer and seller. We strongly recommend an on-site viewing before any payment.",
        ],
      },
      {
        id: "partner",
        h: "Verified Partner program",
        body: [
          "Selected dealers may participate in our Verified Partner program after a review of their business credentials. Verified Partners agree to additional standards for responsiveness, listing accuracy, and customer conduct.",
          "Verification reflects a review at a point in time and is not a warranty of any specific transaction. We may revoke Verified Partner status at any time for conduct that breaches these Terms.",
        ],
      },
      {
        id: "prohibited",
        h: "Prohibited activities",
        body: [
          "To keep the marketplace safe and trustworthy, you agree not to engage in the activities below when using the Platform.",
        ],
        bullets: [
          "Posting fraudulent, misleading, or unlawful listings.",
          "Harassing, threatening, or defrauding other users.",
          "Scraping, reverse-engineering, or overloading the Platform.",
          "Circumventing fees or redirecting users off-platform to evade our rules.",
          "Uploading malware or attempting to gain unauthorized access.",
        ],
      },
      {
        id: "liability",
        h: "Disclaimers & liability",
        body: [
          "The Platform is provided “as is” and “as available” without warranties of any kind, whether express or implied. We do not warrant that listings are accurate, that equipment is fit for any purpose, or that the Platform will be uninterrupted or error-free.",
          "To the maximum extent permitted by law, ShweLoader is not liable for any indirect, incidental, or consequential damages arising from your use of the Platform or from any transaction between users.",
        ],
      },
      {
        id: "termination",
        h: "Suspension & termination",
        body: [
          "We may suspend or terminate your access to the Platform, with or without notice, if you breach these Terms, create risk for other users, or use the Platform in a way that could expose us to legal liability.",
          "You may close your account at any time. Sections of these Terms that by their nature should survive termination — including content licences, disclaimers, and limitations of liability — will continue to apply.",
        ],
      },
      {
        id: "changes",
        h: "Changes to these terms",
        body: [
          "We may update these Terms from time to time to reflect changes in our services, the law, or our practices. When we make material changes, we will update the “last updated” date and, where appropriate, notify you through the Platform.",
          "Your continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.",
        ],
      },
      {
        id: "contact",
        h: "Contact us",
        body: [
          "Questions about these Terms can be sent to our team. We aim to reply within one business day, in English or Myanmar.",
          "Email: sales@shweloader.com — Victor Machinery Solution Network Co., Ltd., Yangon, Myanmar.",
        ],
      },
    ],
  },
  privacy: {
    label: "Privacy Policy",
    updated: "Last updated 1 June 2026",
    sections: [
      {
        id: "collect",
        h: "Information we collect",
        body: [
          "We collect information you provide directly — such as your name, phone number, email address, company details, and the content of listings and messages you create on the Platform.",
          "We also collect information automatically when you use the Platform, including device and browser data, IP address, pages viewed, and interactions, in order to operate and improve our services.",
        ],
      },
      {
        id: "use",
        h: "How we use your information",
        body: [
          "We use your information to operate the marketplace, connect buyers with sellers, secure accounts, provide support, and improve the Platform.",
        ],
        bullets: [
          "Publishing and promoting the listings you post.",
          "Enabling messaging and enquiries between users.",
          "Detecting fraud and enforcing our Terms.",
          "Sending service updates and, with consent, marketing.",
        ],
      },
      {
        id: "sharing",
        h: "Sharing & disclosure",
        body: [
          "Listing details you publish are visible to other users and the public. Contact details you choose to share are made available to interested buyers and renters through the Platform.",
          "We share information with service providers who help us run the Platform (such as hosting and analytics) under appropriate confidentiality obligations, and where required by law or to protect our users.",
        ],
      },
      {
        id: "cookies",
        h: "Cookies & tracking",
        body: [
          "We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the Platform is used. You can control cookies through your browser settings, though some features may not work without them.",
        ],
      },
      {
        id: "security",
        h: "Data security",
        body: [
          "We apply technical and organizational measures designed to protect your information against unauthorized access, alteration, or loss. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
        ],
      },
      {
        id: "rights",
        h: "Your rights & choices",
        body: [
          "You can access and update most of your information directly in your account settings. You may also ask us to correct or delete your personal data, or to stop sending you marketing messages.",
          "To exercise these rights, contact us using the details below. We may need to verify your identity before acting on a request.",
        ],
      },
      {
        id: "retention",
        h: "Data retention",
        body: [
          "We keep your information for as long as your account is active and as needed to provide the Platform, comply with our legal obligations, resolve disputes, and enforce our agreements. When information is no longer needed, we delete or anonymize it.",
        ],
      },
      {
        id: "children",
        h: "Children's privacy",
        body: [
          "The Platform is intended for business and professional use and is not directed to children under 18. We do not knowingly collect personal information from children. If you believe a child has provided us information, please contact us so we can remove it.",
        ],
      },
      {
        id: "intl",
        h: "International users",
        body: [
          "ShweLoader operates from Myanmar. If you access the Platform from outside Myanmar, your information may be processed in Myanmar where data-protection laws may differ from those in your country. By using the Platform you consent to this processing.",
        ],
      },
      {
        id: "contact",
        h: "Contact us",
        body: [
          "If you have questions about this Privacy Policy or how we handle your information, please get in touch. We aim to respond within one business day.",
          "Email: sales@shweloader.com — Victor Machinery Solution Network Co., Ltd., Yangon, Myanmar.",
        ],
      },
    ],
  },
};

const DOC_KEYS = Object.keys(LEGAL) as DocKey[];

function LegalSection({ s }: { s: LegalSectionData }) {
  return (
    <section className="lg-section" id={s.id} data-lg-section={s.id}>
      <h2 className="lg-section-h">{s.h}</h2>
      {s.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {s.bullets ? (
        <ul>
          {s.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function LegalView() {
  const [doc, setDoc] = useState<DocKey>("terms");
  const [active, setActive] = useState<string>(LEGAL.terms.sections[0].id);

  const data = LEGAL[doc];

  // Resolve the initial document from the URL hash on mount.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "privacy") {
      setDoc("privacy");
      setActive(LEGAL.privacy.sections[0].id);
    }
  }, []);

  // Reflect the active document in the URL hash and reset position.
  useEffect(() => {
    try {
      history.replaceState(null, "", "#" + doc);
    } catch {
      /* noop */
    }
    setActive(LEGAL[doc].sections[0].id);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [doc]);

  // Scroll-spy: highlight the section nearest the top of the viewport.
  useEffect(() => {
    const ids = LEGAL[doc].sections.map((s) => s.id);
    const onScroll = () => {
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) cur = id;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [doc]);

  const goTo = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 84,
          behavior: "smooth",
        });
      }
    },
    [],
  );

  return (
    <div className="lg-page" data-screen-label="Legal">
      <div className="lg-wrap">
        <nav className="lg-crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight className="icon-sm" aria-hidden="true" />
          <span className="cur">Legal</span>
        </nav>

        <header className="lg-head">
          <h1 className="lg-h1">{data.label}</h1>
          <div className="lg-updated">{data.updated}</div>
          <div className="lg-tabs" role="tablist" aria-label="Legal documents">
            {DOC_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === doc}
                className={cn("lg-tab", k === doc && "is-on")}
                onClick={() => setDoc(k)}
              >
                {LEGAL[k].label}
              </button>
            ))}
          </div>
        </header>

        <div className="lg-grid">
          <aside className="lg-nav" aria-label="Sections">
            <span className="lg-nav-eyebrow">On this page</span>
            {data.sections.map((s) => (
              <a
                key={s.id}
                href={"#" + s.id}
                className={cn("lg-nav-link", s.id === active && "is-active")}
                onClick={(e) => goTo(e, s.id)}
              >
                {s.h}
              </a>
            ))}
          </aside>

          <div className="lg-content">
            {data.sections.map((s) => (
              <LegalSection key={doc + s.id} s={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
