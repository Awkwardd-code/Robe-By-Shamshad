import type { ReactNode } from "react";
import { Suspense } from "react";
import Header from "@/components/Home/Header";
import Footer from "@/components/Home/Footer";
import BackToTop from "@/components/BackToTop";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main className="min-h-screen">{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}

function HeaderFallback() {
  return (
    <div className="min-h-[92px] bg-white" aria-hidden="true" />
  );
}
