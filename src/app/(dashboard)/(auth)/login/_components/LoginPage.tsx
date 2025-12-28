/* eslint-disable react/no-unescaped-entities */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaGoogle, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaCheck } from "react-icons/fa";
import { useState, ChangeEvent, FormEvent, CSSProperties } from "react";
import { useAuth } from "@/context/AuthContext";

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

const initialFormState = {
  email: "",
  password: "",
  remember: false,
};

const LOGIN_ROUTE = "/api/auth/login";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setError(null);
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const isFormDisabled = isLoading;
  const shouldStyleCheckboxDisabled = isFormDisabled;
  const isSubmitDisabled = isLoading || !formData.email.trim() || !formData.password.trim();

  const GOOGLE_AUTH_REDIRECT = "/api/auth/google/redirect";

  const triggerGoogleAuth = () => {
    if (typeof window === "undefined") {
      setIsSocialLoading(false);
      return;
    }
    window.location.href = GOOGLE_AUTH_REDIRECT;
  };

  const handleSocialLogin = () => {
    if (isLoading || isSocialLoading) return;
    setIsSocialLoading(true);

    triggerGoogleAuth();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setIsLoading(true);
    setError(null);

    try {
    const response = await fetch(LOGIN_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to sign in. Please try again.");
      }

      setFormData(initialFormState);
      if (data?.user) {
        const nextUser = {
          ...data.user,
          id: data.user.id ?? data.user._id
        };
        setUser(nextUser);
      }
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in. Please try again.";
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
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: `linear-gradient(135deg, ${robe.cream}, #ffffff)`,
        ...cssVars,
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl" style={{ border: `1px solid ${robe.blush}` }}>
        <div className="grid lg:grid-cols-2">
          {/* Left Panel - Brand Story */}
          <div
            className="relative hidden lg:flex flex-col p-8 border-r"
            style={{
              background: `linear-gradient(180deg, #ffffff, ${robe.cream})`,
              borderRight: `1px solid ${robe.blush}`,
              color: robe.text,
            }}
          >
            <div className="flex flex-col items-center mb-8">
              <div className="relative h-20 w-48 mb-4">
                <Image
                  src="/logo.jpg"
                  alt="ROBE by Shamshad logo"
                  fill
                  sizes="192px"
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-2xl font-serif font-bold tracking-wider mb-1" style={{ color: robe.maroon }}>
                ROBE
              </p>
              <p className="text-sm font-light tracking-[0.3em] uppercase text-slate-600">BY SHAMSHAD</p>
            </div>

            <h2 className="text-2xl font-serif font-bold mb-4" style={{ color: robe.maroon }}>
              Welcome Back
            </h2>
            <p className="text-base text-slate-600 mb-6 leading-relaxed">
              Sign in to continue your style journey with exclusive collections, personalized recommendations, and member-only benefits.
            </p>

            <div className="space-y-4 text-sm text-slate-600 mb-8">
              {[
                {
                  title: "Exclusive Access",
                  desc: "Shop new collections before they're available to the public.",
                },
                {
                  title: "Personal Styling",
                  desc: "Continue receiving curated outfit recommendations just for you.",
                },
                
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: robe.sand }} />
                  <div>
                    <p className="font-semibold" style={{ color: robe.text }}>
                      {item.title}
                    </p>
                    <p className="leading-relaxed text-slate-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-600 mb-2">
                Don't have an account?
              </p>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg border px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] transition-all hover:opacity-95"
                style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
              >
                Create an Account
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right Panel - Compact Form */}
          <div className="p-6 lg:p-8">
            {/* Mobile Brand Header */}
            <div className="lg:hidden mb-6 rounded-xl border bg-white p-6 text-center" style={{ borderColor: robe.blush }}>
              <div className="relative h-16 w-40 mx-auto mb-3">
                <Image
                  src="/logo.jpg"
                  alt="ROBE by Shamshad logo"
                  fill
                  sizes="160px"
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-xl font-serif font-bold tracking-wider mb-1" style={{ color: robe.maroon }}>
                ROBE
              </p>
              <p className="text-xs font-light tracking-[0.3em] uppercase mb-3 text-slate-600">BY SHAMSHAD</p>
              <p className="text-sm text-slate-600">Sign in to continue your style journey with us.</p>
            </div>

            <div className="mb-6">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                style={{ backgroundColor: robe.cream, color: robe.maroon }}
              >
                <FaEnvelope className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </div>
              <h2 className="text-xl font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                Access Your Account
              </h2>
              <p className="text-sm text-slate-600">Enter your credentials to continue shopping</p>
            </div>

            {/* Google Login Button Only */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleSocialLogin}
                disabled={isLoading || isSocialLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border bg-white px-4 py-3.5 text-sm font-medium transition-all hover:shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                style={{ borderColor: robe.blush, color: robe.maroon }}
              >
                <FaGoogle className="w-4.5 h-4.5" />
                <span>{isSocialLoading ? "Connecting..." : "Continue with Google"}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center mb-6">
              <div className="flex-1 h-px" style={{ backgroundColor: robe.blush }} />
              <span className="px-4 text-xs text-slate-500">Or sign in with email</span>
              <div className="flex-1 h-px" style={{ backgroundColor: robe.blush }} />
            </div>

            {/* Email/Password Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: robe.text }}>
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: robe.sand }}>
                    <FaEnvelope className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    className={`${inputClasses} pl-10 border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium" style={{ color: robe.text }}>
                    Password
                  </label>
                  <Link href="/forget-password" className="text-sm font-medium transition-colors" style={{ color: robe.maroon }}>
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: robe.sand }}>
                    <FaLock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    className={`${inputClasses} pl-10 pr-10 border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                    style={{ color: robe.maroon }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${shouldStyleCheckboxDisabled ? "opacity-60" : ""}`}
                style={{ backgroundColor: robe.cream }}
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    id="remember"
                    name="remember"
                    className="sr-only peer"
                    checked={formData.remember}
                    onChange={handleInputChange}
                    disabled={isFormDisabled}
                  />

                  <label
                    htmlFor="remember"
                    className={`flex h-4 w-4 items-center justify-center rounded border bg-white transition-all ${shouldStyleCheckboxDisabled ? "cursor-not-allowed" : "cursor-pointer"
                      } peer-checked:border-(--robe-maroon) peer-checked:bg-(--robe-maroon)`}
                    style={{ borderColor: robe.sand }}
                  >
                    <FaCheck className="h-2.5 w-2.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                  </label>
                </div>

                <label
                  htmlFor="remember"
                  className={`text-sm leading-relaxed transition-all ${shouldStyleCheckboxDisabled ? "cursor-text" : "cursor-pointer"
                    }`}
                  style={{ color: robe.text }}
                >
                  Remember me on this device.
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full rounded-lg px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-white transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: robe.maroon }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = robe.maroonHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = robe.maroon)}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Footer note */}
            <div className="mt-6 space-y-3">
              <p className="text-center text-xs text-slate-500">
                By signing in, you agree to our{" "}
                <Link href="/terms" className="font-semibold" style={{ color: robe.maroon }}>
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold" style={{ color: robe.maroon }}>
                  Privacy Policy
                </Link>
              </p>
              <p className="text-center text-sm text-slate-600 lg:hidden">
                New to ROBE?{" "}
                <Link href="/register" className="font-semibold" style={{ color: robe.maroon }}>
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
