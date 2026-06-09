import type { Metadata } from "next";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { AuthModalMount } from "@/components/shared/auth-modal-mount";
import { DeferredWidgets } from "@/components/shared/deferred-widgets";
import { BfcacheGuard } from "@/components/shared/bfcache-guard";

/** The whole app area is private — never indexed. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <AuthModalMount />
      <DeferredWidgets />
      <BfcacheGuard />
    </>
  );
}
