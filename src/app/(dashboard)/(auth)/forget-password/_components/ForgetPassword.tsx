"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, FormEvent, ChangeEvent, CSSProperties } from "react";
import { FaEnvelope } from "react-icons/fa";

const robe = {
  cream: "#FBF3E8",
  maroon: "#944C35",
  sand: "#E2B188",
  blush: "#F1D6C1",
  text: "#3b2a22",
  maroonHover: "#7f3f2d",
};

const inputClasses =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 transition-all duration-200";

export default function ForgetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setError(null);
    setSuccess(null);
  };

  const FORGET_PASSWORD_ROUTE = "/api/auth/forget-password";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(FORGET_PASSWORD_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to send reset link. Please try again.");
      }

      setSuccess("If an account exists for this email, a reset link has been sent.");
      setEmail("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to send reset link. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const cssVars: CSSProperties = {
    "--robe-maroon": robe.maroon,
    "--robe-blush": robe.blush,
    "--robe-sand": robe.sand,
  } as CSSProperties;

  return (
    <section
      className="min-h-screen flex items-center justify-center px-4 py-6"
      style={{
        background: `linear-gradient(135deg, ${robe.cream}, #ffffff)`,
        ...cssVars,
      }}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-lg"
        style={{ border: `1px solid ${robe.blush}` }}
      >
        <div className="grid md:grid-cols-2">
          {/* Left panel */}
          <div
            className="relative hidden md:flex flex-col p-6 border-r"
            style={{
              background: `linear-gradient(180deg, #ffffff, ${robe.cream})`,
              borderRight: `1px solid ${robe.blush}`,
              color: robe.text,
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="relative h-9 w-28">
                <Image
                  src="/logo.jpg"
                  alt="ROBE by Shamshad logo"
                  fill
                  sizes="112px"
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-600">
                ROBE by Shamshad
              </p>
            </div>

            <h2 className="text-xl font-bold mb-2" style={{ color: robe.maroon }}>
              Forgot Password?
            </h2>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Enter your email and we’ll send you a secure reset link to regain access to your account.
            </p>

            <div className="space-y-2 text-xs text-slate-600">
              {[
                "Secure, single-use reset link",
                "Fast access recovery",
                "Keep your account protected",
              ].map((info) => (
                <div key={info} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                  <p className="leading-relaxed">{info}</p>
                </div>
              ))}
            </div>

            <div
              className="mt-4 rounded-lg border p-4 text-xs leading-relaxed"
              style={{
                borderColor: robe.blush,
                backgroundColor: robe.cream,
                color: robe.text,
              }}
            >
              <p
                className="font-semibold uppercase tracking-[0.2em] text-[0.6rem] mb-2"
                style={{ color: robe.maroon }}
              >
                Account reminders
              </p>
              <p>
                For your security, nothing changes until you confirm via the email link. If you didn’t request this, you can safely ignore it.
              </p>
            </div>

            <div className="mt-6">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-600 mb-2">
                Remembered it?
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg border px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] transition-all hover:opacity-95"
                style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
              >
                Back to sign in
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col justify-between p-6">
            <div>
              <div
                className="md:hidden mb-4 rounded-xl border p-4"
                style={{ borderColor: robe.blush, backgroundColor: robe.cream, color: robe.text }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative h-8 w-24">
                    <Image
                      src="/logo.jpg"
                      alt="ROBE by Shamshad logo"
                      fill
                      sizes="96px"
                      className="object-contain"
                      priority
                    />
                  </div>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-slate-600">
                    ROBE
                  </p>
                </div>
                <p className="text-[0.7rem] text-slate-600 leading-relaxed">
                  Reset access quickly and get back to your style journey.
                </p>
              </div>

              <div className="mb-4">
                <div
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[0.6rem] font-semibold uppercase tracking-[0.2em] mb-2"
                  style={{ backgroundColor: robe.cream, color: robe.maroon }}
                >
                  <FaEnvelope className="h-3 w-3" />
                  <span>Password help</span>
                </div>
                <h2 className="text-lg font-bold mb-1" style={{ color: robe.maroon }}>
                  Send reset instructions
                </h2>
                <p className="text-xs text-slate-600">We’ll email you a link to set a new password.</p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-[0.75rem] font-medium mb-1 block" style={{ color: robe.text }}>
                    Email Address
                  </label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                  value={email}
                  onChange={handleEmailChange}
                  required
                  disabled={isLoading}
                />
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                {success && (
                  <p
                    className="text-xs border rounded-md px-3 py-2"
                    style={{ color: robe.text, backgroundColor: robe.cream, borderColor: robe.blush }}
                  >
                    {success}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full rounded-lg px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: robe.maroon }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = robe.maroonHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = robe.maroon)}
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <div className="mt-5 rounded-lg border p-4" style={{ borderColor: robe.blush, backgroundColor: "#fff" }}>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.2em] mb-2"
                  style={{ color: robe.maroon }}
                >
                  What happens next?
                </p>
                <ul className="space-y-2 text-[0.7rem] text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                    You receive a single-use reset link that stays active for 1 hour.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                    Open the link to set a new password instantly.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                    Log back in to continue shopping.
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-center text-[0.6rem] text-slate-500 md:hidden">
                Back to{" "}
                <Link href="/login" className="font-semibold" style={{ color: robe.maroon }}>
                  sign in
                </Link>
              </p>

              <p className="mt-3 text-center text-[0.65rem] text-slate-500">
                Need an account?{" "}
                <Link href="/register" className="font-semibold" style={{ color: robe.maroon }}>
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
