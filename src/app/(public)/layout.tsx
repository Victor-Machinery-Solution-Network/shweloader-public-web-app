import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { AuthModalMount } from "@/components/shared/auth-modal-mount";
import { DeferredWidgets } from "@/components/shared/deferred-widgets";
import { getSiteSettings } from "@/lib/api/settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Header is a client component, so the admin's Articles toggle is resolved
  // here (server) and passed down. Footer is a server component and reads
  // settings itself.
  const { articlesEnabled } = await getSiteSettings();
  return (
    <>
      <Header showBlogs={articlesEnabled} />
      <main id="main">{children}</main>
      <Footer />
      <AuthModalMount />
      <DeferredWidgets promo />
    </>
  );
}
