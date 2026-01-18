import type { ReactNode } from "react";
import { Suspense } from "react";
import Header from "@/components/Home/Header";
import Footer from "@/components/Home/Footer";
import BackToTop from "@/components/BackToTop";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";

const WHATSAPP_NUMBER = "8801401836480";
const WHATSAPP_MESSAGE =
  "Hi ROBE by Shamshad! I love your sustainable luxury and heritage craftsmanship from Bangladesh. Please help me choose a piece from your latest collection.";

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
      <WhatsAppFloatingButton
        phoneNumber={WHATSAPP_NUMBER}
        message={WHATSAPP_MESSAGE}
      />
      <BackToTop />
    </>
  );
}

function HeaderFallback() {
  return (
    <div className="min-h-23 bg-white" aria-hidden="true" />
  );
}
