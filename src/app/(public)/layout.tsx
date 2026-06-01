import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { AuthModalMount } from "@/components/shared/auth-modal-mount";
import { DeferredWidgets } from "@/components/shared/deferred-widgets";

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
      <AuthModalMount />
      <DeferredWidgets promo />
    </>
  );
}
