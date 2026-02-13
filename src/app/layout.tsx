import type { Metadata } from "next";
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

export const viewport = { width: "device-width", initialScale: 1 };

export const themeColor = [
  { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  { media: "(prefers-color-scheme: dark)", color: "#000000" },
];

export const metadata: Metadata = {
  title: "Robe by Shamshad || A Trusted Platform for Modern Clothing and Apparel",
  description: "Discover Robe by Shamshad, your go-to destination for trendy and high-quality clothing and apparel. Explore our diverse collection and elevate your style today.",

  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Robe by Shamshad || A Trusted Platform for Modern Clothing and Apparel",
    description:
      "Discover Robe by Shamshad, your go-to destination for trendy and high-quality clothing and apparel. Explore our diverse collection and elevate your style today.",
    url: "https://robe.byshamshad.com",
    siteName: "Robe by Shamshad",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Robe by Shamshad",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Robe by Shamshad || A Trusted Platform for Modern Clothing and Apparel",
    description:
      "Discover Robe by Shamshad, your go-to destination for trendy and high-quality clothing and apparel. Explore our diverse collection and elevate your style today.",
    images: ["/logo.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getSessionUser();

  return (
    <html lang="en">
      <head>
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TKXSMQZB');`,
          }}
        />
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '820661157705137');
                fbq('track', 'PageView');`,
          }}
        />
        <Script
          id="meta-pixel-2"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '1548666406233185');
                fbq('track', 'PageView');`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TKXSMQZB"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <MetaCapi />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=820661157705137&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1548666406233185&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
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
