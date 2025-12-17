"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, ChangeEvent, FormEvent, useEffect, CSSProperties } from "react";
import { FaLock } from "react-icons/fa";

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

interface ResetPasswordProps {
  initialToken?: string;
}

export default function ResetPassword({ initialToken = "" }: ResetPasswordProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams?.get("token") || initialToken;

  const [formData, setFormData] = useState({
    token: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tokenFromQuery) {
      setFormData((prev) => (prev.token ? prev : { ...prev, token: tokenFromQuery }));
    }
  }, [tokenFromQuery]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setError(null);
    setSuccess(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const passwordsMatch =
    formData.password.length >= 8 && formData.password === formData.confirmPassword;

  const hasToken = Boolean(formData.token.trim());
  const isSubmitDisabled = isLoading || !hasToken || !passwordsMatch;

  const RESET_PASSWORD_ROUTE = "/api/auth/reset-password";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(RESET_PASSWORD_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: formData.token.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to reset password.");
      }

      setSuccess("Password updated successfully. Redirecting to sign in...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to reset password.";
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
                  src="/images/logo.jpg"
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
              Secure a fresh password
            </h2>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Choose a new password to keep your account secure. Strong passphrases help protect your personal details and orders.
            </p>

            <div className="space-y-2 text-xs text-slate-600">
              {[
                "Use at least 8 characters with numbers and symbols",
                "Avoid reusing passwords from other services",
                "Change it again if you suspect unusual activity",
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
                Protect your account
              </p>
              <p>
                For your security, password changes only apply after confirmation. If you didn’t request this reset, you can safely ignore it.
              </p>
            </div>

            <div className="mt-6">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-600 mb-2">
                Need help?
              </p>
              <Link
                href="/forget-password"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg border px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] transition-all hover:opacity-95"
                style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
              >
                Resend link
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
                      src="/images/logo.jpg"
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
                  Reset your password to keep shopping and tracking orders without interruption.
                </p>
              </div>

              <div className="mb-4">
                <div
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[0.6rem] font-semibold uppercase tracking-[0.2em] mb-2"
                  style={{ backgroundColor: robe.cream, color: robe.maroon }}
                >
                  <FaLock className="h-3 w-3" />
                  <span>Secure account</span>
                </div>
                <h2 className="text-lg font-bold mb-1" style={{ color: robe.maroon }}>
                  Choose a new password
                </h2>
                <p className="text-xs text-slate-600">Enter and confirm your brand new password below.</p>
              </div>

              {!hasToken && (
                <div
                  className="mb-4 rounded-md border px-3 py-2 text-xs"
                  style={{ borderColor: robe.blush, backgroundColor: robe.cream, color: robe.text }}
                >
                  The reset link is missing or expired. Please request a new password reset email.
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-[0.75rem] font-medium mb-1 block" style={{ color: robe.text }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter new password"
                    className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="text-[0.75rem] font-medium mb-1 block" style={{ color: robe.text }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Repeat password"
                    className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
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
                  disabled={isSubmitDisabled}
                  className="w-full rounded-lg px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: robe.maroon }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = robe.maroonHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = robe.maroon)}
                >
                  {isLoading ? "Updating..." : "Update password"}
                </button>
              </form>

              <div className="mt-5 rounded-lg border p-4" style={{ borderColor: robe.blush, backgroundColor: "#fff" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: robe.maroon }}>
                  Password tips
                </p>
                <ul className="space-y-2 text-[0.7rem] text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                    Combine words with uppercase, lowercase, and symbols.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                    Avoid reusing old passwords.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                    Change it again if you suspect any unusual activity.
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-center text-[0.6rem] text-slate-500 md:hidden">
                Need the reset email again?{" "}
                <Link href="/forget-password" className="font-semibold" style={{ color: robe.maroon }}>
                  Resend link
                </Link>
              </p>

              <p className="mt-3 text-center text-[0.65rem] text-slate-500">
                Back to{" "}
                <Link href="/login" className="font-semibold" style={{ color: robe.maroon }}>
                  sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
