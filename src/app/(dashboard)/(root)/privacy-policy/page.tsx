import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Robe by Shamshad",
  description:
    "Read how Robe by Shamshad collects, uses, and protects your personal information.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16 text-[#2f2520]">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-sm leading-7 text-[#5f4f45]">
        We respect your privacy and only collect information needed to process
        orders, provide customer support, and improve your shopping experience.
      </p>
      <p className="mt-4 text-sm leading-7 text-[#5f4f45]">
        For account, order, or data requests, please contact us through the
        Contact page.
      </p>
    </main>
  );
}
