import type { Metadata } from "next";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { AuthModal } from "@/components/shared/auth-modal";
import { LiveChat } from "@/components/shared/live-chat";

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
      <AuthModal />
      <LiveChat />
    </>
  );
}
