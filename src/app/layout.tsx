import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import MetaCapi from "@/components/MetaCapi";
import ToastProvider from "@/components/ToastProvider";
import { AuthProvider } from "@/context/AuthContext";
import { CommerceProvider } from "@/context/CommerceContext";
import { BuyNowProvider } from "@/context/BuyNowContext";
import { getSessionUser } from "@/lib/server-session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

const ORGANIZATION_LD_JSON = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  "@id": "https://robe.byshamshad.com/#organization",
  name: "Robe by Shamshad",
  url: "https://robe.byshamshad.com",
  logo: "https://robe.byshamshad.com/logo.jpg",
  image: "https://robe.byshamshad.com/logo.jpg",
  description:
    "Robe by Shamshad is a premium clothing brand in Dhaka, Bangladesh offering modern apparel for men and women.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Niketan, Gulshan 1",
    addressLocality: "Dhaka",
    addressCountry: "BD",
  },
  telephone: "+8801401836480",
  email: "shamshad.robe@gmail.com",
  areaServed: "Bangladesh",
  brand: {
    "@type": "Brand",
    name: "Robe by Shamshad",
  },
  sameAs: [
    "https://www.facebook.com/robebyshamshad/",
    "https://www.instagram.com/robebyshamshad/",
    "https://bd.linkedin.com/in/robe-by-shamshad-abb15b293",
    "https://www.youtube.com/@RobebyShamshad",
  ],
};

/* 🔥 IMPROVED METADATA */
export const metadata: Metadata = {
  metadataBase: new URL("https://robe.byshamshad.com"),

  title:
    "Robe by Shamshad | Premium Clothing & Apparel in Dhaka, Bangladesh",

  description:
    "Robe by Shamshad is a premium clothing brand based in Dhaka, Bangladesh, offering modern, high-quality apparel for men and women. Discover stylish collections, enjoy free delivery on your first purchase, and elevate your everyday fashion.",

  keywords: [
    "Robe by Shamshad",
    "Clothing brand in Dhaka",
    "Bangladesh fashion",
    "Premium apparel Bangladesh",
    "Men and women clothing Dhaka",
  ],

  authors: [{ name: "Robe by Shamshad" }],

  icons: {
    icon: "/favicon.ico",
  },

  manifest: "/site.webmanifest",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title:
      "Robe by Shamshad | Premium Clothing & Apparel in Dhaka",
    description:
      "Premium clothing brand in Dhaka offering modern apparel for men and women. Shop high-quality fashion and enjoy free delivery on your first purchase.",
    url: "https://robe.byshamshad.com",
    siteName: "Robe by Shamshad",
    images: [
      {
        url: "https://robe.byshamshad.com/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Robe by Shamshad Clothing Brand",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title:
      "Robe by Shamshad | Premium Clothing & Apparel in Dhaka",
    description:
      "Discover premium fashion from Robe by Shamshad in Dhaka, Bangladesh.",
    images: ["https://robe.byshamshad.com/logo.jpg"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getSessionUser();

  return (
    <html lang="en">
      <head>
        {/* 🔥 STRUCTURED DATA (VERY IMPORTANT FOR AI SEO) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_LD_JSON),
          }}
        />

        {/* Google Tag Manager */}
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id=GTM-TKXSMQZB'+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TKXSMQZB');`,
          }}
        />

        {/* Meta Pixel */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', '820661157705137');
fbq('init', '1548666406233185');
fbq('init', '857404480130156');
fbq('track', 'PageView');
            `,
          }}
        />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* GTM NoScript */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TKXSMQZB"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        {/* Facebook NoScript Pixels */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=820661157705137&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        <MetaCapi />

        <AuthProvider initialUser={initialUser}>
          <CommerceProvider>
            <BuyNowProvider>
              {children}
              <ToastProvider />
            </BuyNowProvider>
          </CommerceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
