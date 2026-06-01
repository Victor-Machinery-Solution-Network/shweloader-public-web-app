import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd, aboutPageSchema } from "@/lib/seo/jsonld";
import { Reveal } from "@/components/about/reveal";

import "@/styles/pages/about.css";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description:
    "Shwe Loader is an emerging one-stop online marketplace for machinery, commercial trucks, spare parts, services, and rentals in Myanmar — founded by Victor Machinery Solution Network (VMSN) in 2018.",
  path: "/about",
});

const SALES_EMAIL = "sales@shweloader.com";

// ── Static editorial content (from the design source) ──────────────────────
type Glyph = "shield" | "spark" | "value" | "grow";

const COMMITMENTS: { t: string; d: string; glyph: Glyph }[] = [
  {
    t: "Trust & Transparency",
    d: "Every connection built on fairness — verified sellers, clear pricing, no hidden surprises.",
    glyph: "shield",
  },
  {
    t: "Innovation & Technology",
    d: "Smarter tools for smarter business — search that finds, listings that perform, deals that close.",
    glyph: "spark",
  },
  {
    t: "Value Creation",
    d: "Helping partners maximize opportunities — every listing reaches the right buyer, every time.",
    glyph: "value",
  },
  {
    t: "Growth Together",
    d: "Building success side by side — a community that compounds when one of us wins, all of us win.",
    glyph: "grow",
  },
];

const STORY: string[] = [
  "Shwe Loader is an emerging one-stop online marketplace for machinery, commercial trucks, spare parts, services, and rentals in Myanmar. Our purpose is simple: to make it easy for businesses and individuals to buy, sell, rent, and connect — anytime, anywhere.",
  "Founded by Victor Machinery Solution Network Co., Ltd. (VMSN) in 2018, Shwe Loader was created with a bold vision: to provide a trusted digital space where opportunities flow freely, deals happen faster, and businesses grow stronger.",
  "Shwe Loader is more than a website — it is a tool that works for you 24/7, helping sellers showcase their products, buyers find reliable deals, and business partners reach each other without barriers.",
];

const CATEGORIES = [
  "Machinery",
  "Commercial Trucks",
  "Spare Parts",
  "Services",
  "Rentals",
  "Inspection",
  "Financing",
];

const MARQUEE_DARK = [
  "We move Myanmar",
  "Built for the trade",
  "Trusted since 2018",
  "Open 24/7",
];

// ── SVG art ────────────────────────────────────────────────────────────────
function TruckSVG() {
  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%" }}
    >
      <line
        x1="0"
        y1="100"
        x2="240"
        y2="100"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.6"
      />
      <g fill="rgba(251,205,74,0.78)">
        <rect x="36" y="58" width="100" height="36" rx="2" />
        <path d="M138 70 L172 70 L184 82 L184 94 L138 94 Z" />
        <rect x="146" y="74" width="22" height="12" fill="rgba(15,11,6,0.7)" />
      </g>
      <circle cx="64" cy="98" r="10" fill="#0c0a07" stroke="rgba(251,205,74,0.5)" />
      <circle cx="116" cy="98" r="10" fill="#0c0a07" stroke="rgba(251,205,74,0.5)" />
      <circle cx="166" cy="98" r="10" fill="#0c0a07" stroke="rgba(251,205,74,0.5)" />
    </svg>
  );
}

const GLYPH_PATHS: Record<Glyph, ReactNode> = {
  shield: <path d="M12 2L4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3zM9 12l2 2 4-4" />,
  spark: (
    <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2" />
  ),
  value: <path d="M3 17l6-6 4 4 8-8M21 7v6h-6" />,
  grow: <path d="M4 20c4 0 6-2 8-6s4-6 8-6M12 14a4 4 0 100-8 4 4 0 000 8z" />,
};

function Glyph({ name }: { name: Glyph }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPH_PATHS[name]}
    </svg>
  );
}

// ── Marquee (pure-CSS animation, no client JS) ─────────────────────────────
function Marquee({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <div className={dark ? "mq mq-dark" : "mq"}>
      <div className="mq-track">
        {[0, 1, 2].map((i) => (
          <div className="mq-row" key={i} aria-hidden={i > 0}>
            {items.map((it, k) => (
              <span className="mq-item" key={k}>
                <span className="mq-text">{it}</span>
                <span className="mq-dot" aria-hidden="true">
                  ✦
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <div className="ax-page">
      <JsonLd data={aboutPageSchema()} />

      {/* HERO */}
      <section className="ax-hero">
        <div className="ax-hero-top">
          <span className="ax-chapter">Chapter 01</span>
          <span className="ax-chapter-rule" />
          <span className="ax-chapter">About Shwe Loader · 2018 →</span>
        </div>
        <h1 className="ax-h1">
          <span className="ax-line">
            <span>An emerging one-stop</span>
          </span>
          <span className="ax-line">
            <span>marketplace for Myanmar&rsquo;s</span>
          </span>
          <span className="ax-line">
            <span>
              machinery &amp; <em>commercial trucks</em>.
            </span>
          </span>
        </h1>
        <p className="ax-deck">
          Built so businesses and individuals can buy, sell, rent, and connect —
          anytime, anywhere. Founded in Yangon by Victor Machinery Solution
          Network in 2018.
        </p>
        <div className="ax-byline">
          <div>
            <span className="ax-byline-k">Founded</span>
            <span className="ax-byline-v">2018</span>
          </div>
          <div>
            <span className="ax-byline-k">Operator</span>
            <span className="ax-byline-v">VMSN Co., Ltd.</span>
          </div>
          <div>
            <span className="ax-byline-k">Coverage</span>
            <span className="ax-byline-v">Myanmar nationwide</span>
          </div>
          <div>
            <span className="ax-byline-k">Operating</span>
            <span className="ax-byline-v">24 / 7</span>
          </div>
        </div>
      </section>

      <Marquee items={CATEGORIES} />

      {/* STORY */}
      <section className="ax-story">
        <div className="ax-story-grid">
          <aside className="ax-story-rail">
            <div className="ax-rail-stick">
              <div className="ax-rail-eye">Our story</div>
              <div className="ax-rail-num">2018</div>
              <div className="ax-rail-line" />
              <p className="ax-rail-cap">
                Founded by Victor Machinery Solution Network Co., Ltd.
              </p>
            </div>
          </aside>
          <div className="ax-story-body">
            <Reveal>
              <h2 className="ax-h2">
                An emerging one-stop marketplace, founded with a bold mandate.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="ax-body-lg">{STORY[0]}</p>
            </Reveal>
            <Reveal delay={200}>
              <div className="ax-story-photo">
                <div className="ax-photo ax-photo-wide">
                  <span className="ax-ph-tag">
                    <span className="ax-dot" />
                    On the yard
                  </span>
                  <div className="ax-ph-art">
                    <TruckSVG />
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p className="ax-body-lg">{STORY[1]}</p>
            </Reveal>
            <Reveal delay={120}>
              <blockquote className="ax-quote">
                <span className="ax-quote-mark">“</span>
                More than a website — a tool that works for you <em>24/7</em>.
              </blockquote>
            </Reveal>
            <Reveal delay={120}>
              <p className="ax-body-lg">{STORY[2]}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* VISION / MISSION */}
      <section className="ax-vm">
        <div className="ax-vm-cream">
          <div className="ax-vm-inner">
            <div className="ax-vm-head">
              <span className="ax-q">“</span>
              <div className="ax-eye">Vision</div>
            </div>
            <p className="ax-vm-statement">
              To make machinery and truck trading in Myanmar{" "}
              <em>easy, trusted, and accessible</em> for everyone — connecting
              businesses and people to endless opportunities.
            </p>
            <div className="ax-vm-foot">
              <span className="ax-vm-tag">North star</span>
              <span className="ax-vm-rule" />
            </div>
          </div>
        </div>
        <div className="ax-vm-ink">
          <div className="ax-vm-inner">
            <div className="ax-vm-head">
              <span className="ax-q ax-q-gold">“</span>
              <div className="ax-eye ax-eye-gold">Mission</div>
            </div>
            <p className="ax-vm-statement ax-on-dark">
              To build Myanmar&rsquo;s most trusted one-stop online platform for
              machinery and commercial trucks <em>by 2030</em> — empowering
              sellers, buyers, and businesses with transparency, technology, and
              growth opportunities.
            </p>
            <div className="ax-vm-foot">
              <span className="ax-vm-tag ax-on-dark">Operating mandate</span>
              <span className="ax-vm-rule ax-rule-gold" />
            </div>
          </div>
        </div>
      </section>

      {/* COMMITMENTS */}
      <section className="ax-commit">
        <div className="ax-commit-head">
          <Reveal>
            <div className="ax-eye">Our commitments</div>
            <h2 className="ax-h2 ax-h2-tight">
              Four promises we hold to every deal.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="ax-body-lg ax-commit-intro">
              These are the operating principles every listing, dealer, and
              transaction on Shwe Loader is held to. No exceptions, no asterisks.
            </p>
          </Reveal>
        </div>
        <div className="ax-commit-grid">
          {COMMITMENTS.map((c, i) => (
            <Reveal key={c.t} delay={i * 90} className="ax-c-card-wrap">
              <article className="ax-c-card">
                <div className="ax-c-num">
                  N°{String(i + 1).padStart(2, "0")}
                </div>
                <div className="ax-c-glyph">
                  <Glyph name={c.glyph} />
                </div>
                <h3 className="ax-c-title">{c.t}</h3>
                <p className="ax-c-body">{c.d}</p>
                <span className="ax-c-arrow" aria-hidden="true">
                  →
                </span>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 2030 AMBITION */}
      <section className="ax-2030">
        <div className="ax-2030-bg" aria-hidden="true">
          <span className="ax-2030-numerals">2030</span>
        </div>
        <div className="ax-2030-content">
          <Reveal>
            <span className="ax-eye ax-eye-gold">Our ambition</span>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="ax-2030-line">
              We strive to become Myanmar&rsquo;s <em>most trusted</em> and
              valuable marketplace for machinery and commercial trucks —
              empowering thousands of businesses nationwide.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="ax-2030-foot">
              Shwe Loader is not just a platform. It is a community, a network,
              and a promise — to deliver growth, innovation, and success to
              everyone who chooses to work with us.
            </p>
          </Reveal>
        </div>
      </section>

      <Marquee items={MARQUEE_DARK} dark />

      {/* CTA */}
      <section className="ax-cta">
        <div className="ax-cta-card">
          <div>
            <div className="ax-eye">Get in touch</div>
            <h2 className="ax-cta-line">
              Have a listing, question, or partnership in mind?
            </h2>
            <p className="ax-cta-sub">
              We reply within one business day — in English or Myanmar.
            </p>
          </div>
          <div className="ax-cta-actions">
            <a className="ax-btn ax-btn-ink" href={`mailto:${SALES_EMAIL}`}>
              Contact Shwe Loader →
            </a>
            <Link className="ax-btn ax-btn-ghost" href="/browse">
              Browse marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
