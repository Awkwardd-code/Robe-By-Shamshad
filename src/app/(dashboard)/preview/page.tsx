import Image from "next/image";
import Link from "next/link";
import {
  Cormorant_Garamond,
  Hind_Siliguri,
  Inter,
} from "next/font/google";
import { CircleCheck } from "lucide-react";
import PreviewEnrollmentForm from "./_components/PreviewEnrollmentForm";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-preview-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-preview-body",
});

const banglaFont = Hind_Siliguri({
  subsets: ["latin", "bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-preview-bn",
});

const COURSE_ITEMS = [
  {
    title: "Zero to Hero Outlook for Corporate Men",
    subtitle: "যে আপনার ইমপ্রেশন হাজার গুণ বাড়িয়ে দেবে অভাবনীয়ভাবে",
  },
  {
    title: "10 min Get Ready Hack for Corporate Girls",
    subtitle: "ঘুম থেকে উঠতে দেরি হয়ে গিয়েছে? এখন কি হবে?",
  },
  {
    title: "Wedding Get-Ready Hacks (For both Men & Women)",
    subtitle: "যা না জানলে নিজের বেস্ট আউটলুকটা নিয়ে আসতে পারবেন না",
  },
];

const GALLERY_CARDS = [
  {
    tag: "DAY 4 STUDY",
    title: "Midnight Echoes",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
    className: "md:col-span-8",
  },
  {
    tag: "ESSENCE",
    title: "Ivory Dawn",
    image:
      "https://images.unsplash.com/photo-1464863979621-258859e62245?auto=format&fit=crop&w=900&q=80",
    className: "md:col-span-4",
  },
  {
    tag: "DETAILS",
    title: "The Signature Gift",
    image:
      "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=900&q=80",
    className: "md:col-span-4",
  },
  {
    tag: "COURSE STUDY CASE",
    title: "Azure Solace",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
    className: "md:col-span-8",
  },
];

function SiteHeader() {
  return (
    <header className="border-b border-[#ece7e4] bg-white/95 backdrop-blur transition-colors duration-300">
      <div className="mx-auto flex w-full max-w-285 items-center justify-between px-5 py-2.5 md:px-7 md:py-3">
        <h1 className="[font-family:var(--font-preview-display)] whitespace-nowrap text-[19px] font-semibold leading-none text-[#781525] transition-opacity duration-300 md:text-[36px]">
          Robe by Shamshad
        </h1>

        <nav className="hidden items-center gap-16 text-[13px] uppercase tracking-[0.08em] text-[#8f8782] md:flex">
          <a
            href="#"
            className="transition-all duration-300 hover:-translate-y-0.5 hover:text-[#781525]"
          >
            Collections
          </a>
          <a
            href="#"
            className="border-b border-[#cfbac0] pb-0.75 text-[#781525] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#781525]"
          >
            The Masterclass
          </a>
        </nav>

        <button
          type="button"
          className="rounded-lg bg-[#890f25] px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_8px_18px_rgba(137,15,37,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#741022] hover:shadow-[0_12px_24px_rgba(137,15,37,0.34)] active:translate-y-0 md:px-9 md:py-3 md:text-[13px]"
        >
          Enroll Now
        </button>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="bg-[#f5f4f4]">
      <div className="mx-auto grid w-full max-w-285 gap-9 px-5 py-8 md:grid-cols-2 md:items-stretch md:gap-14 md:px-7 md:py-10">
        <div className="h-full">
          <span className="inline-block rounded-full bg-[#efe8ea] px-4 py-2 text-[10px] uppercase tracking-widest text-[#a2888c]">
            Free 5-day email course
          </span>

          <h2 className="[font-family:var(--font-preview-bn)] pt-6 text-[clamp(2.4rem,6.4vw,5rem)] font-semibold leading-[0.98] text-[#7a1624] md:max-w-140">
            ৫ দিনের মধ্যে
            <br />
            নিজেকে নিয়ে
            <br />
            আসুন বেস্ট লুকে
          </h2>

          <p className="[font-family:var(--font-preview-bn)] max-w-140 pt-6 text-[clamp(1.02rem,1.7vw,1.72rem)] leading-[1.56] text-[#312d2d]">
            আজকে থেকে শুরু করে আগামী ৫ দিন প্রতিদিন আপনার মেইলের ইনবক্সে পৌঁছে যাবে
            বিভিন্ন টপিকের উপর লেখা ফ্যাশন হ্যাক।
          </p>

          <div className="pt-9">
            <h3 className="[font-family:var(--font-preview-bn)] text-[clamp(1.1rem,1.22vw,1.4rem)] font-medium text-[#252020]">
              কোর্সটিতে যা যা থাকছেঃ
            </h3>
            <ul className="space-y-4 pt-3">
              {COURSE_ITEMS.map((item) => (
                <li
                  key={item.title}
                  className="group flex items-start gap-3 transition-transform duration-300 hover:translate-x-1"
                >
                  <CircleCheck className="mt-0.75 h-4.25 w-4.25 shrink-0 text-[#8f1228] transition-transform duration-300 group-hover:scale-110" />
                  <div>
                    <p className="text-[clamp(1rem,1.35vw,1.45rem)] font-medium leading-[1.35] text-[#1d1d1d]">
                      {item.title}
                    </p>
                    <p className="[font-family:var(--font-preview-bn)] text-[clamp(0.95rem,1.1vw,1.14rem)] leading-[1.45] text-[#2a2727]">
                      {item.subtitle}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <PreviewEnrollmentForm />
        </div>

        <div className="flex items-center justify-center md:h-full md:justify-end">
          <div className="group relative w-[320px] max-w-full transition-transform duration-500 hover:-translate-y-1 md:my-auto md:w-115">
            <div className="absolute -right-1 top-4 z-10 rotate-[-11deg] rounded-[3px] bg-[#8c6520] px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f7f2e9] shadow-[0_10px_20px_rgba(0,0,0,0.18)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-9deg] md:-right-8 md:top-2 md:px-6">
              Free Enrollment
              <br />
              <span className="[font-family:var(--font-preview-display)] text-[22px] normal-case md:text-[28px]">
                Starting Today
              </span>
            </div>

            <div className="relative aspect-[0.64] overflow-hidden rounded-[2px] bg-[radial-gradient(ellipse_at_30%_20%,#68030f_0%,#250104_45%,#080809_100%)] shadow-[18px_24px_26px_rgba(0,0,0,0.22)] transition-all duration-500 group-hover:-rotate-[0.8deg] group-hover:shadow-[24px_32px_34px_rgba(0,0,0,0.28)]">
              <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_10%_15%,rgba(255,0,32,0.26)_0px,rgba(255,0,32,0.0)_180px,rgba(255,0,32,0.0)_260px)] transition-opacity duration-500 group-hover:opacity-90" />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.06),transparent_32%,rgba(255,255,255,0.06)_56%,transparent_72%)] transition-opacity duration-500 group-hover:opacity-80" />
              <div className="relative z-10 flex h-full flex-col p-6 text-white md:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b7aeb0]">
                  Masterclass Series
                </p>
                <span className="mt-5 block h-0.5 w-12 bg-white/90" />
                <h3 className="[font-family:var(--font-preview-display)] pt-4 text-[60px] font-semibold leading-[0.96] md:text-[70px]">
                  5
                </h3>
                <p className="[font-family:var(--font-preview-display)] max-w-70 text-[clamp(2rem,3.7vw,3.7rem)] font-semibold leading-[0.96]">
                  Days Guide
                  <br />
                  To Reach
                  <br />
                  The Best
                  <br />
                  Version
                  <br />
                  of
                  <br />
                  You
                </p>
                <div className="mt-auto pt-7">
                  <span className="block h-px w-full bg-white/30" />
                  <p className="[font-family:var(--font-preview-display)] pt-4 text-[24px] italic md:text-[27px]">
                    Tahrima Shamshad Toma
                  </p>
                  <p className="pt-1 text-[9px] uppercase tracking-[0.08em] text-[#c3bbc0] md:text-[10px]">
                    Founder & Chief Fashion Designer - Robe by Shamshad
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhilosophySection() {
  return (
    <section className="bg-[#efe8e4]">
      <div className="mx-auto grid w-full max-w-285 gap-10 px-5 py-10 md:grid-cols-[0.95fr_1.05fr] md:items-center md:gap-14 md:px-7 md:py-20">
        <div className="group relative">
          <Image
            src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80"
            alt="Sketches and textile references"
            width={1000}
            height={1200}
            className="h-105 w-full rounded-[3px] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] md:h-140"
          />
          <div className="absolute -bottom-10 right-0 hidden w-[52%] rounded-[2px] border-8 border-[#efe8e4] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition-transform duration-700 ease-out group-hover:-translate-y-1.5 md:block">
            <Image
              src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80"
              alt="Detail close-up of stitched fabric"
              width={600}
              height={800}
              className="h-70 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          </div>
        </div>

        <div className="pt-6 md:pt-0">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#b27d3d] md:text-[12px]">
            OUR CURRICULUM PHILOSOPHY
          </p>
          <h2 className="[font-family:var(--font-preview-display)] pt-3 text-[clamp(2.5rem,4.7vw,4.3rem)] font-semibold leading-[0.98] text-[#761727] md:max-w-137.5">
            Woven with Intention, Worn for Comfort.
          </h2>
          <p className="max-w-155 pt-6 text-[clamp(1.05rem,1.45vw,1.82rem)] leading-[1.55] text-[#3c3433]">
            This 5-day masterclass isn&apos;t just about fabric; it&apos;s a guide to living
            well. We believe luxury is a sensory experience that begins with the skin and
            radiates throughout your entire day.
          </p>
          <p className="max-w-155 pt-6 text-[clamp(1.05rem,1.45vw,1.82rem)] leading-[1.55] text-[#3c3433]">
            Each lesson is delivered to your inbox at sunrise, designed to be read during
            your morning ritual. We explore the intersection of textile science and the
            philosophy of &quot;Slow Living.&quot;
          </p>
          <p className="[font-family:var(--font-preview-display)] pt-8 text-[clamp(1.8rem,2.2vw,2.7rem)] italic text-[#7a1624]">
            ✧ The Silk Standard Masterclass
          </p>
        </div>
      </div>
    </section>
  );
}

type GalleryCardProps = {
  tag: string;
  title: string;
  image: string;
  className: string;
};

function GalleryCard({ tag, title, image, className }: GalleryCardProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(37,14,21,0.22)] ${className}`}
    >
      <Image
        src={image}
        alt={title}
        width={1200}
        height={700}
        className="h-47 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 md:h-62.5"
      />
      <div className="absolute inset-0 bg-linear-to-t from-[#3a060f]/70 via-[#4f0815]/25 to-transparent transition-opacity duration-500 group-hover:from-[#32040d]/78 group-hover:via-[#450613]/30" />
      <div className="absolute bottom-0 left-0 z-10 p-5 transition-transform duration-500 group-hover:-translate-y-0.5">
        <p className="text-[10px] uppercase tracking-widest text-[#d7ced0] md:text-[13px]">
          {tag}
        </p>
        <h3 className="[font-family:var(--font-preview-display)] pt-1 text-[clamp(2.15rem,3.2vw,3.25rem)] font-semibold leading-[0.94] text-white transition-all duration-500 group-hover:drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]">
          {title}
        </h3>
      </div>
    </article>
  );
}

function GallerySection() {
  return (
    <section className="bg-[#efe8e4]">
      <div className="mx-auto w-full max-w-285 px-5 pb-14 pt-10 md:px-7 md:pb-20 md:pt-14">
        <p className="text-center text-[11px] uppercase tracking-[0.12em] text-[#b27d3d] md:text-[12px]">
          VISUAL INSPIRATION
        </p>
        <h2 className="[font-family:var(--font-preview-display)] pb-8 pt-3 text-center text-[clamp(2.6rem,4.2vw,4rem)] font-semibold leading-[0.97] text-[#761727] md:pb-10">
          The Collection Gallery
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {GALLERY_CARDS.map((card) => (
            <GalleryCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-[#efe8e4]">
      <div className="mx-auto flex w-full max-w-285 flex-col items-start gap-7 border-t border-[#e2d8d3] px-5 py-10 md:flex-row md:items-center md:justify-between md:px-7">
        <p className="[font-family:var(--font-preview-display)] text-[clamp(2rem,2.3vw,2.6rem)] font-semibold italic text-[#7a1624]">
          Robe by Shamshad
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-3 text-[10px] uppercase tracking-[0.09em] text-[#b89e67] md:text-[12px]">
          <Link
            href="/privacy-policy"
            className="border-b border-[#e0d6ca] pb-0.5 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#8a733e]"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-enrollment"
            className="border-b border-[#e0d6ca] pb-0.5 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#8a733e]"
          >
            Terms of Enrollment
          </Link>
          <Link
            href="/contact"
            className="border-b border-[#e0d6ca] pb-0.5 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#8a733e]"
          >
            Contact
          </Link>
          <Link
            href="/press-kit"
            className="border-b border-[#e0d6ca] pb-0.5 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#8a733e]"
          >
            Press Kit
          </Link>
        </div>

        <p className="text-[10px] uppercase tracking-widest text-[#b89e67] md:text-[11px]">
          © {new Date().getFullYear()} Robe by Shamshad. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function PreviewPage() {
  return (
    <main
      className={`${displayFont.variable} ${bodyFont.variable} ${banglaFont.variable} bg-[#f5f4f4] text-[#1d1d1d] [font-family:var(--font-preview-body)]`}
    >
      <SiteHeader />
      <HeroSection />
      <PhilosophySection />
      <GallerySection />
      <SiteFooter />
    </main>
  );
}
