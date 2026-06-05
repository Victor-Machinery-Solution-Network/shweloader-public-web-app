"use client";

// ============================================================
// Legal — Terms of Service + Privacy Policy on one page.
// Tab switch up top + sticky section nav (TOC) with scroll-spy.
//
// Content is the SINGLE SOURCE OF TRUTH copy from the mobile app
// (shweloader-public-mobile-app `src/i18n/translations.ts`, EN + MY), mirrored
// here verbatim with "Shwe Loader" normalized to the website's "ShweLoader"
// spelling. Keep both repos in sync when this text changes — mobile is canonical.
// Language follows the site-wide toggle via useI18n(); section ids are shared
// across locales so the TOC + scroll-spy work regardless of language.
// ============================================================

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useI18n } from "@/components/providers/language-provider";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// useLayoutEffect on the client (measure before paint, no flash), useEffect on
// the server (no-op) to avoid React's SSR warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

const LEGAL: Record<Locale, Record<DocKey, LegalDoc>> = {
  en: {
    terms: {
      label: "Terms of Service",
      updated: "Last updated: April 21, 2026",
      sections: [
        {
          id: "acceptance",
          h: "Acceptance of Terms",
          body: [
            "By accessing and using ShweLoader, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.",
          ],
        },
        {
          id: "use-of-service",
          h: "Use of Service",
          body: [
            "ShweLoader provides an online marketplace for buying, selling, and renting machinery, commercial trucks, spare parts, and related services in Myanmar. Users must be at least 18 years old to use the platform.",
          ],
        },
        {
          id: "user-accounts",
          h: "User Accounts",
          body: [
            "You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility.",
          ],
        },
        {
          id: "listings",
          h: "Listings & Transactions",
          body: [
            "All listings must be accurate and represent real machinery, trucks, parts, or services being offered. ShweLoader facilitates connections between buyers and sellers but is not a party to any transaction.",
          ],
        },
        {
          id: "prohibited",
          h: "Prohibited Conduct",
          body: [
            "You may not use ShweLoader to post illegal, fraudulent, misleading, or infringing content; impersonate others; interfere with the platform's operation; spam other users; or engage in abusive or harassing behaviour. We reserve the right to remove content and suspend or terminate accounts that violate these terms.",
          ],
        },
        {
          id: "your-content",
          h: "Your Content",
          body: [
            "You retain ownership of content you upload—listings, photos, descriptions, and messages. By uploading, you grant ShweLoader a non-exclusive, royalty-free licence to host, display, and promote that content on our platform and related marketing channels for the purpose of operating the service.",
          ],
        },
        {
          id: "intellectual-property",
          h: "Intellectual Property",
          body: [
            "All content, trademarks, and intellectual property on ShweLoader are owned by or licensed to us. You may not copy, modify, or distribute our content without permission.",
          ],
        },
        {
          id: "liability",
          h: "Limitation of Liability",
          body: [
            "ShweLoader is not responsible for the quality, safety, or legality of listed items. We do not guarantee the accuracy of listings or the ability of parties to complete transactions.",
          ],
        },
        {
          id: "changes",
          h: "Changes to These Terms",
          body: [
            "We may update these terms from time to time as the platform evolves. Material changes will be communicated in-app or by email where appropriate. Your continued use of ShweLoader after changes take effect means you accept the updated terms.",
          ],
        },
        {
          id: "governing-law",
          h: "Governing Law",
          body: [
            "These terms are governed by the laws of Myanmar. Any disputes shall be resolved in the courts of Yangon.",
          ],
        },
      ],
    },
    privacy: {
      label: "Privacy Policy",
      updated: "Last updated: April 21, 2026",
      sections: [
        {
          id: "collect",
          h: "Information We Collect",
          body: [
            "We collect information you provide when creating an account, including your name, email, phone number, business details, and usage data to improve our services.",
          ],
        },
        {
          id: "how-we-use",
          h: "How We Use Information",
          body: [
            "We use collected information to provide and improve our services, facilitate communication between buyers and sellers, and send relevant notifications.",
          ],
        },
        {
          id: "sharing",
          h: "Information Sharing",
          body: [
            "We do not sell your personal information. We may share your contact details with sellers when you submit an enquiry, and with service providers who help us operate the platform.",
          ],
        },
        {
          id: "notifications",
          h: "Notifications & Communications",
          body: [
            "We send push notifications, SMS, and in-app messages for account activity, listing updates, enquiries, and chat replies. To deliver these we store device identifiers and push notification tokens. You can disable push notifications at any time from your device settings.",
          ],
        },
        {
          id: "security",
          h: "Data Security",
          body: [
            "We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.",
          ],
        },
        {
          id: "rights",
          h: "Your Rights",
          body: [
            "You have the right to access, update, or delete your personal information at any time through your account settings or by contacting our support team.",
          ],
        },
        {
          id: "contact",
          h: "Contact Us",
          body: [
            "For privacy-related questions, contact us at privacy@shweloader.com.",
          ],
        },
      ],
    },
  },
  my: {
    terms: {
      label: "စည်းကမ်းချက်",
      updated: "နောက်ဆုံး ပြင်ဆင်ချက် - ၂၁ ဧပြီ ၂၀၂၆",
      sections: [
        {
          id: "acceptance",
          h: "စည်းကမ်းချက်များ လက်ခံခြင်း",
          body: [
            "ShweLoader ကို ဝင်ရောက်အသုံးပြုခြင်းဖြင့် ဤဝန်ဆောင်မှုစည်းကမ်းချက်များကို လက်ခံရန် သဘောတူပါသည်။ အကယ်၍ သဘောမတူပါက ဆက်လက်အသုံးမပြုရန် မေတ္တာရပ်ခံအပ်ပါသည်။",
          ],
        },
        {
          id: "use-of-service",
          h: "ဝန်ဆောင်မှု အသုံးပြုခြင်း",
          body: [
            "ShweLoader သည် မြန်မာနိုင်ငံရှိ စက်ယန္တရားများ၊ လုပ်ငန်းသုံး မော်တော်ယာဉ်များ၊ အပိုပစ္စည်းများနှင့် ဆက်စပ်ဝန်ဆောင်မှုများကို ဝယ်ယူရန်၊ ရောင်းချရန်နှင့် ငှားရမ်းရန်အတွက် အွန်လိုင်းဈေးကွက်တစ်ခု ဖြစ်ပါသည်။ အသက် ၁၈ နှစ်ပြည့်ပြီးမှသာ အသုံးပြုနိုင်ပါသည်။",
          ],
        },
        {
          id: "user-accounts",
          h: "အသုံးပြုသူ အကောင့်များ",
          body: [
            "သင့်အကောင့် လုံခြုံရေး အထောက်အထားများ ထိန်းသိမ်းရန် သင့်တွင် တာဝန်ရှိပါသည်။ သင့်အကောင့်အောက်ရှိ လှုပ်ရှားမှုအားလုံးသည် သင့်တာဝန်သာ ဖြစ်ပါသည်။",
          ],
        },
        {
          id: "listings",
          h: "ကြော်ငြာနှင့် ငွေကြေးလွှဲပြောင်းမှုများ",
          body: [
            "ကြော်ငြာအားလုံး တိကျမှန်ကန်ပြီး အမှန်တကယ်ရှိသော စက်ယန္တရား၊ မော်တော်ယာဉ်၊ အပိုပစ္စည်း သို့မဟုတ် ဝန်ဆောင်မှုများသာ ဖြစ်ရပါမည်။ ShweLoader သည် ဝယ်သူနှင့်ရောင်းသူများကို ချိတ်ဆက်ပေးသော်လည်း ငွေကြေးလွှဲပြောင်းမှုများတွင် ပါဝင်ပတ်သက်ခြင်း မရှိပါ။",
          ],
        },
        {
          id: "prohibited",
          h: "တားမြစ်ထားသော လုပ်ဆောင်ချက်များ",
          body: [
            "သင်သည် ShweLoader ကို အသုံးပြု၍ တရားမဝင်သော၊ လိမ်လည်လှည့်ဖြားသော၊ ထင်ယောင်ထင်မှားဖြစ်စေသော သို့မဟုတ် မူပိုင်ခွင့်ချိုးဖောက်သော အကြောင်းအရာများကို တင်ခြင်း၊ အခြားသူများအဖြစ် ဟန်ဆောင်ခြင်း၊ ပလက်ဖောင်း၏ လုပ်ဆောင်ချက်များကို နှောင့်ယှက်ခြင်း၊ အခြားအသုံးပြုသူများထံ စပမ်း (Spam) ပေးပို့ခြင်း သို့မဟုတ် စော်ကားသော သို့မဟုတ် အနှောင့်အယှက်ပေးသော အပြုအမူများ ပြုလုပ်ခြင်းတို့ကို မပြုလုပ်ရပါ။ ဤစည်းကမ်းချက်များကို ချိုးဖောက်ပါက အကြောင်းအရာများကို ဖယ်ရှားရန်နှင့် အကောင့်များကို ဆိုင်းငံ့ရန် သို့မဟုတ် အပြီးတိုင် ပိတ်သိမ်းရန် အခွင့်အရေးကို ကျွန်ုပ်တို့က အပြည့်အဝ ရယူထားပါသည်။",
          ],
        },
        {
          id: "your-content",
          h: "သင်၏ အကြောင်းအရာများ",
          body: [
            "သင် upload ပြုလုပ်သော အကြောင်းအရာများဖြစ်သည့် ကြော်ငြာများ၊ ဓာတ်ပုံများ၊ အသေးစိတ်ဖော်ပြချက်များနှင့် မက်ဆေ့ဂျ်များ၏ မူရင်းပိုင်ဆိုင်ခွင့်သည် သင့်ထံတွင် ဆက်လက်တည်ရှိပါသည်။ သို့သော် ၎င်းတို့ကို တင်လိုက်ခြင်းအားဖြင့် သင်သည် ဝန်ဆောင်မှု လည်ပတ်နိုင်ရန် ရည်ရွယ်ချက်အတွက် ShweLoader အား အဆိုပါ အကြောင်းအရာများကို ကျွန်ုပ်တို့၏ ပလက်ဖောင်းနှင့် ဆက်စပ် မားကတ်တင်းလမ်းကြောင်းများတွင် သိမ်းဆည်းရန် (host)၊ ပြသရန်နှင့် ပရိုမိုးရှင်းပြုလုပ်ရန် သီးသန့်မဟုတ်သော (non-exclusive)၊ မူပိုင်ခွင့်ကြေးပေးရန်မလိုသော (royalty-free) ခွင့်ပြုချက် (လိုင်စင်) ကို ပေးအပ်ပြီး ဖြစ်ပါသည်။",
          ],
        },
        {
          id: "intellectual-property",
          h: "ဉာဏပစ္စည်းမူပိုင်ခွင့်",
          body: [
            "ShweLoader ရှိ အကြောင်းအရာအားလုံး၊ ကုန်အမှတ်တံဆိပ်များနှင့် ဉာဏပစ္စည်းမူပိုင်ခွင့်များသည် ကျွန်ုပ်တို့ပိုင် (သို့) လိုင်စင်ရယူထားခြင်း ဖြစ်ပါသည်။ ခွင့်ပြုချက်မရှိဘဲ ကူးယူခြင်း၊ ပြင်ဆင်ခြင်း၊ ဖြန့်ဝေခြင်း မပြုရပါ။",
          ],
        },
        {
          id: "liability",
          h: "တာဝန်ခံမှု ကန့်သတ်ချက်",
          body: [
            "ShweLoader သည် စာရင်းတင်ထားသော ပစ္စည်းများ၏ အရည်အသွေး၊ ဘေးကင်းမှု သို့မဟုတ် တရားဝင်မှုတို့အတွက် တာဝန်မရှိပါ။ ဝယ်သူနှင့် ရောင်းသူကြား အဆင်ပြေချောမွေ့မှုများကိုသာ အတတ်နိုင်ဆုံး ကူညီပံ့ပိုးပေးပါသည်။",
          ],
        },
        {
          id: "changes",
          h: "ဤစည်းကမ်းချက်များအား ပြင်ဆင်ပြောင်းလဲခြင်း",
          body: [
            "ပလက်ဖောင်း တိုးတက်ပြောင်းလဲလာသည်နှင့်အမျှ ဤစည်းကမ်းချက်များကို ကျွန်ုပ်တို့က အခါအားလျော်စွာ အဆင့်မြှင့်တင်မှုများ ပြုလုပ်နိုင်ပါသည်။ အဓိကကျသော အပြောင်းအလဲများကို အက်ပ်အတွင်းမှတစ်ဆင့် သို့မဟုတ် သင့်လျော်သလို အီးမေးလ်မှတစ်ဆင့် အသိပေးသွားမည်ဖြစ်ပါသည်။ ပြောင်းလဲမှုများ အသက်ဝင်ပြီးနောက်ပိုင်း ShweLoader ကို သင် ဆက်လက်အသုံးပြုခြင်းသည် အဆိုပါ အဆင့်မြှင့်တင်ထားသော စည်းကမ်းချက်များကို သဘောတူလက်ခံသည်ဟု မှတ်ယူမည်ဖြစ်ပါသည်။",
          ],
        },
        {
          id: "governing-law",
          h: "အုပ်ချုပ်မှုဥပဒေ",
          body: [
            "ဤစည်းကမ်းချက်များသည် မြန်မာနိုင်ငံ ဥပဒေနှင့်အညီ အကျုံးဝင်ပါသည်။ အငြင်းပွားမှုများကို ရန်ကုန်တရားရုံးတွင် ဖြေရှင်းမည်ဖြစ်ပါသည်။",
          ],
        },
      ],
    },
    privacy: {
      label: "ကိုယ်ရေးလုံခြုံမှု",
      updated: "နောက်ဆုံး ပြင်ဆင်ချက် - ၂၁ ဧပြီ ၂၀၂၆",
      sections: [
        {
          id: "collect",
          h: "ကျွန်ုပ်တို့ ကောက်ယူသော အချက်အလက်များ",
          body: [
            "အကောင့်ဖန်တီးစဉ် သင်ဖြည့်စွက်သော အမည်၊ အီးမေးလ်၊ ဖုန်းနံပါတ်၊ လုပ်ငန်းအချက်အလက်များနှင့် ဝန်ဆောင်မှုတိုးတက်စေရန်အတွက် အသုံးပြုမှုဒေတာများကို ကောက်ယူပါသည်။",
          ],
        },
        {
          id: "how-we-use",
          h: "အချက်အလက် အသုံးပြုပုံ",
          body: [
            "ဝန်ဆောင်မှုပေးရန်၊ ဝယ်သူနှင့်ရောင်းသူ ဆက်သွယ်ရေးကို လွယ်ကူစေရန်နှင့် သက်ဆိုင်ရာ အကြောင်းကြားချက်များ ပို့ရန်အတွက် ကောက်ယူထားသော အချက်အလက်များကို အသုံးပြုပါသည်။",
          ],
        },
        {
          id: "sharing",
          h: "အချက်အလက် မျှဝေခြင်း",
          body: [
            "သင့်ကိုယ်ရေးအချက်အလက်များကို အခြားအဖွဲ့အစည်းများသို့ မရောင်းချပါ။ သင် စုံစမ်းမှုပြုလုပ်သောအခါ ရောင်းသူများနှင့် ဆက်သွယ်နိုင်ရန် သင့်အချက်အလက်ကို မျှဝေပေးနိုင်ပါသည်။",
          ],
        },
        {
          id: "notifications",
          h: "အသိပေးချက်များနှင့် ဆက်သွယ်မှုများ",
          body: [
            "အကောင့်အတွင်း လုပ်ဆောင်မှုများ၊ ကြော်ငြာ အဆင့်မြှင့်တင်မှုများ၊ စုံစမ်းမေးမြန်းမှုများနှင့် ချတ် (Chat) စာပြန်မှုများအတွက် ကျွန်ုပ်တို့သည် Push Notifications များ၊ SMS များနှင့် အက်ပ်တွင်း မက်ဆေ့ဂျ်များကို ပေးပို့ပါသည်။ ၎င်းတို့ကို ပေးပို့နိုင်ရန်အတွက် ဖုန်း/စက်ပစ္စည်း မှတ်ပုံတင်အချက်အလက်များ (device identifiers) နှင့် Push Notification တိုကင်များကို ကျွန်ုပ်တို့ သိမ်းဆည်းထားပါသည်။ သင်၏ ဖုန်း/စက်ပစ္စည်း Settings (ဆက်တင်) မှတစ်ဆင့် Push Notifications များကို အချိန်မရွေး ပိတ်ထားနိုင်ပါသည်။",
          ],
        },
        {
          id: "security",
          h: "ဒေတာ လုံခြုံရေး",
          body: [
            "သင့်ကိုယ်ရေးအချက်အလက်များကို ကာကွယ်ရန် သင့်လျော်သော လုံခြုံရေးအစီအမံများ ချမှတ်ထားပါသည်။ သို့သော် အင်တာနက်ပေါ်မှ ဒေတာပို့ဆောင်မှုတိုင်းသည် ရာခိုင်နှုန်းပြည့် လုံခြုံမှုမရှိနိုင်သည်ကို သတိပြုစေလိုပါသည်။",
          ],
        },
        {
          id: "rights",
          h: "သင့်အခွင့်အရေးများ",
          body: [
            "သင့်အကောင့်ဆက်တင်များမှတစ်ဆင့် သို့မဟုတ် ပံ့ပိုးမှုအဖွဲ့သို့ ဆက်သွယ်၍ သင့်အချက်အလက်များကို အချိန်မရွေး ကြည့်ရှုရန်၊ ပြင်ဆင်ရန် သို့မဟုတ် ဖျက်ရန် အခွင့်အရေးရှိပါသည်။",
          ],
        },
        {
          id: "contact",
          h: "ဆက်သွယ်ရန်",
          body: [
            "ကိုယ်ရေးအချက်အလက်ဆိုင်ရာ မေးခွန်းများရှိပါက privacy@shweloader.com သို့ ဆက်သွယ်နိုင်ပါသည်။",
          ],
        },
      ],
    },
  },
};

const DOC_KEYS: DocKey[] = ["terms", "privacy"];

/** UI chrome strings that aren't part of the legal copy itself. */
const CHROME: Record<Locale, { home: string; legal: string }> = {
  en: { home: "Home", legal: "Legal" },
  my: { home: "ပင်မ", legal: "ဥပဒေဆိုင်ရာ" },
};

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
  const { locale } = useI18n();
  const docs = LEGAL[locale] ?? LEGAL.en;
  const chrome = CHROME[locale] ?? CHROME.en;

  const [doc, setDoc] = useState<DocKey>("terms");

  const data = docs[doc];

  // Sliding pill highlight: measure the active tab and glide a single element to
  // its position/width (like the homepage Buy/Rent toggle). Measured rather than
  // a fixed 50% so the EN/MY labels — which differ in width — always fit.
  const tabsRef = useRef<HTMLDivElement>(null);
  const [glide, setGlide] = useState<{ left: number; width: number } | null>(null);

  useIsoLayoutEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const measure = () => {
      const active = el.querySelector<HTMLElement>(`[data-doc="${doc}"]`);
      if (active) setGlide({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    // Re-measure once webfonts load, since label widths can shift.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [doc, locale]);

  // Sync the active document from the URL hash — on mount AND whenever the hash
  // changes, so the footer's Terms/Privacy links switch the tab even when we're
  // already on this page (no remount).
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash === "privacy" || hash === "terms") setDoc(hash);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // When the active document changes, reflect it in the URL hash and reset
  // scroll. Skipped on first render so an incoming "#privacy" isn't clobbered.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      history.replaceState(null, "", "#" + doc);
    } catch {
      /* noop */
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [doc]);

  return (
    <div className="lg-page" data-screen-label="Legal">
      <div className="lg-wrap">
        <nav className="lg-crumbs" aria-label="Breadcrumb">
          <Link href="/">{chrome.home}</Link>
          <ChevronRight className="icon-sm" aria-hidden="true" />
          <span className="cur">{chrome.legal}</span>
        </nav>

        <header className="lg-head">
          <h1 className="lg-h1">{data.label}</h1>
          <div className="lg-updated">{data.updated}</div>
          <div className="lg-tabs" role="tablist" aria-label="Legal documents" ref={tabsRef}>
            <span
              className="lg-tab-glide"
              aria-hidden="true"
              style={
                glide
                  ? { transform: `translateX(${glide.left}px)`, width: glide.width }
                  : { opacity: 0 }
              }
            />
            {DOC_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                data-doc={k}
                aria-selected={k === doc}
                className={cn("lg-tab", k === doc && "is-on")}
                onClick={() => setDoc(k)}
              >
                {docs[k].label}
              </button>
            ))}
          </div>
        </header>

        <div className="lg-grid">
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
