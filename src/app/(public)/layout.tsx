import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { AuthModal } from "@/components/shared/auth-modal";
import { LiveChat } from "@/components/shared/live-chat";
import { PromoPopup } from "@/components/shared/promo-popup";

export default function PublicLayout({
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
      <PromoPopup />
    </>
  );
}
