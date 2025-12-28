/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, ChangeEvent, FormEvent, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash, FaCheck, FaGoogle } from "react-icons/fa";
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
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 transition-all";

const initialFormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  termsAccepted: false,
};

const BANGLADESH_PHONE_PATTERN = /^01[3-9]\d{8}$/;

const toBangladeshInternationalFormat = (value: string) => {
  if (!value) return "";
  const normalized = value.trim();
  if (!normalized.startsWith("0")) return "";
  return `+880${normalized.slice(1)}`;
};

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [formData, setFormData] = useState({ ...initialFormState });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isVerificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [isVerifying, setIsVerifying] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormError(null);
    setSuccessMessage(null);

    // Update field value or checkbox state
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    setSuccessMessage(null);
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setFormData((prev) => ({ ...prev, phone: digits }));
  };

  const GOOGLE_AUTH_REDIRECT = "/api/auth/google/redirect";

  const triggerGoogleAuth = () => {
    if (typeof window === "undefined") {
      setIsSocialLoading(false);
      return;
    }
    window.location.href = GOOGLE_AUTH_REDIRECT;
  };

  const handleSocialLogin = () => {
    if (isSocialLoading || isRegistering) return;
    setIsSocialLoading(true);

    triggerGoogleAuth();
  };

  const handleModalClose = () => {
    setVerificationModalOpen(false);
    setVerificationCode("");
    setVerificationError(null);
    setVerificationId(null);
  };

  const handleVerificationCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setVerificationCode(digits);
    setVerificationError(null);
  };

  const handleVerificationSubmit = async () => {
    if (!verificationId || verificationCode.length !== 6) return;
    setVerificationError(null);
    setIsVerifying(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "verify",
          verificationId,
          code: verificationCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Verification failed. Please try again.");
      }

      if (data?.user) {
        const nextUser = {
          ...data.user,
          id: data.user.id ?? data.user._id
        };
        setUser(nextUser);
      }

      setFormError(null);
      setSuccessMessage("Registration complete! Welcome to ROBE by Shamshad.");
      handleModalClose();
      setFormData({ ...initialFormState });
      setShowPassword(false);
      router.push("/");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Verification failed. Please try again.";
      setVerificationError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!formData.termsAccepted) {
      setFormError("Please accept the Terms & Privacy Policy.");
      return;
    }
    if (formData.password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }
    let normalizedPhone = "";
    if (formData.phone.trim()) {
      if (!BANGLADESH_PHONE_PATTERN.test(formData.phone.trim())) {
        setFormError(
          "Please enter a valid Bangladeshi phone number (e.g., 01XXXXXXXXX)."
        );
        return;
      }
      normalizedPhone = toBangladeshInternationalFormat(formData.phone.trim());
    }

    setVerificationId(null);
    setIsRegistering(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: normalizedPhone,
          password: formData.password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.verificationId) {
        throw new Error(
          data?.error || "Failed to start email verification. Please try again."
        );
      }

      setVerificationId(data.verificationId);
      setVerificationCode("");
      setVerificationError(null);
      setVerificationModalOpen(true);
      setSuccessMessage(
        "Verification code sent to your email. Please enter it below."
      );
    } catch (error) {
      console.error("Registration failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.";
      setFormError(message);
    } finally {
      setIsRegistering(false);
    }
  };

  const isFormDisabled = isRegistering || isVerifying;
  const hasRequiredFields = Boolean(
    formData.name.trim() && formData.email.trim() && formData.password.trim()
  );
  const shouldStyleCheckboxDisabled = isFormDisabled;
  const isSubmitDisabled =
    isRegistering || isVerifying || !hasRequiredFields || !formData.termsAccepted;

  const cssVars: CSSProperties = {};
  (cssVars as any)["--robe-maroon"] = robe.maroon;
  (cssVars as any)["--robe-blush"] = robe.blush;
  (cssVars as any)["--robe-sand"] = robe.sand;

  return (
    <>
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
            {/* Left Panel - Brand Story */}
            <div
              className="relative hidden md:flex flex-col p-8 border-r"
              style={{
                background: `linear-gradient(180deg, #ffffff, ${robe.cream})`,
                borderRight: `1px solid ${robe.blush}`,
                color: robe.text,
              }}
            >
              <div className="flex flex-col items-center mb-8">
                <div className="relative h-16 w-40 mb-4">
                  <Image
                    src="/logo.jpg"
                    alt="ROBE by Shamshad logo"
                    fill
                    sizes="160px"
                    className="object-contain"
                    priority
                  />
                </div>
                <p
                  className="text-lg font-serif font-bold tracking-wider mb-2"
                  style={{ color: robe.maroon }}
                >
                  ROBE
                </p>
                <p className="text-xs font-light tracking-[0.3em] uppercase text-slate-600">
                  BY SHAMSHAD
                </p>
              </div>

              <h2
                className="text-2xl font-serif font-bold mb-4"
                style={{ color: robe.maroon }}
              >
                Join Our Style Journey
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Become a member to unlock exclusive collections, early access to new
                arrivals, and personalized style recommendations.
              </p>

              <div className="space-y-4 text-sm text-slate-600 mb-8">
                {[
                  {
                    title: "Exclusive Access",
                    desc: "Be the first to shop new collections before anyone else.",
                  },
                  {
                    title: "Personal Styling",
                    desc: "Get curated outfit recommendations based on your preferences.",
                  },
                  {
                    title: "Member Benefits",
                    desc: "Enjoy free shipping, early sale access, and birthday surprises.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div
                      className="mt-1 h-2 w-2 rounded-full"
                      style={{ backgroundColor: robe.sand }}
                    />
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
                  Already Have an Account?
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-lg border px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] transition-all hover:opacity-95"
                  style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
                >
                  sign in
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right Panel - Registration Form */}
            <div className="p-6 md:p-8">
              {/* Mobile Brand Header */}
              <div
                className="md:hidden mb-6 rounded-xl border bg-white p-6 text-center"
                style={{ borderColor: robe.blush }}
              >
                <div className="relative h-12 w-32 mx-auto mb-3">
                  <Image
                    src="/images/robe-logo.png"
                    alt="ROBE by Shamshad logo"
                    fill
                    sizes="128px"
                    className="object-contain"
                    priority
                  />
                </div>
                <p
                  className="text-lg font-serif font-bold tracking-wider mb-1"
                  style={{ color: robe.maroon }}
                >
                  ROBE
                </p>
                <p className="text-xs font-light tracking-[0.3em] uppercase mb-3 text-slate-600">
                  BY SHAMSHAD
                </p>
                <p className="text-sm text-slate-600">
                  Create your account to start your style journey with us.
                </p>
              </div>

              <div className="mb-6">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                  style={{ backgroundColor: robe.cream, color: robe.maroon }}
                >
                  <span>Begin Your Style Journey</span>
                </div>
                <h2
                  className="text-xl font-serif font-bold mb-2"
                  style={{ color: robe.maroon }}
                >
                  Create Account
                </h2>
                <p className="text-sm text-slate-600">
                  Join our community of style enthusiasts.
                </p>
              </div>

              {/* Google Login Only */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleSocialLogin}
                  disabled={isSocialLoading || isFormDisabled}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm font-medium transition-all hover:shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  style={{ borderColor: robe.blush, color: robe.maroon }}
                >
                  <FaGoogle className="w-4 h-4" />
                  <span>{isSocialLoading ? "Connecting..." : "Continue with Google"}</span>
                </button>
              </div>

              <div className="flex items-center mb-6">
                <div className="flex-1 h-px" style={{ backgroundColor: robe.blush }} />
                <span className="px-4 text-xs text-slate-500">Or sign up with email</span>
                <div className="flex-1 h-px" style={{ backgroundColor: robe.blush }} />
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: robe.text }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                    required
                    disabled={isFormDisabled}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: robe.text }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                      required
                      disabled={isRegistering || isVerifying}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: robe.text }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="01XXXXXXXXX"
                      className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                      disabled={isFormDisabled}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium" style={{ color: robe.text }}>
                      Password *
                    </label>
                    <span className="text-xs text-slate-500">Min. 8 characters</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a secure password"
                      className={`${inputClasses} pr-10 border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                      minLength={8}
                      required
                      disabled={isFormDisabled}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                      style={{ color: robe.maroon }}
                      disabled={isFormDisabled}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <FaEyeSlash className="w-4 h-4" />
                      ) : (
                        <FaEye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-4 rounded-lg transition-all ${shouldStyleCheckboxDisabled ? "opacity-60" : ""
                    }`}
                  style={{ backgroundColor: robe.cream }}
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleInputChange}
                      className="sr-only peer"
                      id="terms"
                      disabled={isFormDisabled}
                    />

                    {/* Make the visual box a label tied to the input */}

                    <label
                      htmlFor="terms"
                      className={`flex h-5 w-5 items-center justify-center rounded border bg-white transition-all ${shouldStyleCheckboxDisabled ? "cursor-not-allowed" : "cursor-pointer"
                        } peer-checked:border-(--robe-maroon) peer-checked:bg-(--robe-maroon)`}
                      style={{ borderColor: robe.sand }}
                    >
                      <FaCheck className="h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                    </label>
                  </div>

                  {/* Keep the terms text outside the checkbox label to avoid nested links */}
                  <div
                    className={`text-sm leading-relaxed transition-all ${shouldStyleCheckboxDisabled ? "cursor-text" : ""
                      }`}
                    style={{ color: robe.text }}
                  >
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className={`font-semibold transition-colors ${shouldStyleCheckboxDisabled ? "pointer-events-none" : ""
                        }`}
                      style={{ color: robe.maroon }}
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className={`font-semibold transition-colors ${shouldStyleCheckboxDisabled ? "pointer-events-none" : ""
                        }`}
                      style={{ color: robe.maroon }}
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>


                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    {formError}
                  </p>
                )}

                {successMessage && (
                  <p
                    className="text-sm rounded-lg px-4 py-3 border"
                    style={{
                      color: robe.text,
                      backgroundColor: robe.cream,
                      borderColor: robe.blush,
                    }}
                  >
                    {successMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="relative overflow-hidden w-full rounded-lg text-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: robe.maroon }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = robe.maroonHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = robe.maroon)
                  }
                >
                  {!isSubmitDisabled && formData.termsAccepted && !isRegistering && !isVerifying && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[2.5rem] text-white/20">
                      <FaCheck />
                    </span>
                  )}
                  {isRegistering ? (
                    <span className="relative flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    <span className="relative">Create Account</span>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600 md:hidden">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold"
                  style={{ color: robe.maroon }}
                >
                  Sign in
                </Link>
              </p>

              <p className="mt-6 text-center text-xs text-slate-500">
                By creating an account, you agree to our terms and confirm you have read
                our privacy policy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verification Modal */}
      {isVerificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border"
            style={{ borderColor: robe.blush }}
          >
            <h3 className="text-lg font-serif font-bold mb-2" style={{ color: robe.maroon }}>
              Verify Your Email
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Enter the 6-digit code sent to{" "}
              <span className="font-semibold" style={{ color: robe.text }}>
                {formData.email}
              </span>
              .
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={verificationCode}
              onChange={handleVerificationCodeChange}
              className="w-full rounded-lg border px-4 py-3 text-center tracking-[0.3em] text-xl focus:ring-1 outline-none"
              style={{
                borderColor: robe.blush,
                color: robe.text,
                boxShadow: "none",
              }}
              placeholder="••••••"
              maxLength={6}
              autoFocus
              disabled={isVerifying}
            />
            {verificationError && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                {verificationError}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all cursor-pointer hover:opacity-95"
                style={{ borderColor: robe.blush, color: robe.text, backgroundColor: "#fff" }}
                disabled={isVerifying}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerificationSubmit}
                disabled={verificationCode.length !== 6 || isVerifying}
                className="flex-1 rounded-lg px-4 py-3 text-sm font-medium text-white transition-all disabled:opacity-50 cursor-pointer hover:opacity-95"
                style={{ backgroundColor: robe.maroon }}
              >
                {isVerifying ? "Verifying..." : "Verify & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}





