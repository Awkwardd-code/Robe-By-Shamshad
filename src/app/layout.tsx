import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
