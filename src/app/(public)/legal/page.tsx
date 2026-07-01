import type { Metadata } from "next";

import { LegalView } from "@/components/legal/legal-view";
import { getContactEmails } from "@/lib/api/settings";
import { buildMetadata } from "@/lib/seo/metadata";

import "@/styles/pages/legal.css";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Privacy",
  description:
    "ShweLoader Terms of Service and Privacy Policy — how the marketplace works, your responsibilities, and how we handle your information.",
  path: "/legal",
});

export default async function LegalPage() {
  const { privacy } = await getContactEmails();
  return <LegalView privacyEmail={privacy} />;
}
