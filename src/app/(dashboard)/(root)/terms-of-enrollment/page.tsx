import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Enrollment | Robe by Shamshad",
  description:
    "Review enrollment terms for courses, offers, and learning content by Robe by Shamshad.",
  alternates: {
    canonical: "/terms-of-enrollment",
  },
};

export default function TermsOfEnrollmentPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16 text-[#2f2520]">
      <h1 className="text-3xl font-semibold tracking-tight">
        Terms of Enrollment
      </h1>
      <p className="mt-4 text-sm leading-7 text-[#5f4f45]">
        By enrolling in our programs, you agree to the course access rules,
        content usage limits, and payment terms stated by Robe by Shamshad.
      </p>
      <p className="mt-4 text-sm leading-7 text-[#5f4f45]">
        Detailed policies for refunds or access issues are shared during
        enrollment and through customer support.
      </p>
    </main>
  );
}
