/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, ChangeEvent, FormEvent, useEffect, useMemo } from "react";
import { FaGoogle } from "react-icons/fa";
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
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 transition duration-200";

const defaultValues = {
  fullName: "",
  email: "",
  phone: "",
  bio: "",
};

const defaultAvatar = {
  url: "",
  publicId: "",
};

export default function ProfilePage() {
  const { user, isLoading: authLoading, error: authError, refreshUser, setUser } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(defaultValues);
  const [initialForm, setInitialForm] = useState(defaultValues);
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [initialAvatar, setInitialAvatar] = useState(defaultAvatar);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const formatted = {
        fullName: user.name,
        email: user.email,
        phone: user.phone || "",
        bio: user.bio || "",
      };
      setFormData(formatted);
      setInitialForm(formatted);

      const avatarState = {
        url: user.avatar || "",
        publicId: user.avatarPublicId || "",
      };
      setAvatar(avatarState);
      setInitialAvatar(avatarState);
    }
  }, [user]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormError(null);
    setFormMessage(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setFormMessage(null);
    setIsUploadingImage(true);

    try {
      const form = new FormData();
      form.append("image", file);
      if (avatar.publicId) form.append("oldPublicId", avatar.publicId);

      const method = avatar.publicId ? "PUT" : "POST";
      const response = await fetch("/api/cloudinary/upload", { method, body: form });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to upload image.");

      const updatedAvatar = { url: data.imageUrl, publicId: data.publicId || "" };
      setAvatar(updatedAvatar);
      setFormMessage("Profile image uploaded. Remember to save changes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload image.";
      setUploadError(message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setFormError(null);
    setFormMessage(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          bio: formData.bio.trim(),
          avatar: avatar.url,
          avatarPublicId: avatar.publicId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to update profile.");

      const updatedUser = data.user;
      setUser(updatedUser);
      setFormMessage("Profile updated successfully.");

      setInitialForm({
        fullName: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || "",
        bio: updatedUser.bio || "",
      });
      setInitialAvatar({
        url: updatedUser.avatar || "",
        publicId: updatedUser.avatarPublicId || "",
      });

      await refreshUser(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile.";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(initialForm);
    setAvatar(initialAvatar);
    setFormError(null);
    setFormMessage(null);
  };

  const isBusy = authLoading || isSaving || isUploadingImage;

  const initials = useMemo(() => {
    const name = (formData.fullName || "").trim();
    if (!name) return "R";
    const parts = name.split(" ").filter(Boolean);
    const a = parts[0]?.[0] ?? "R";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }, [formData.fullName]);

  const profileStrength = useMemo(() => {
    let score = 0;
    if (formData.fullName.trim()) score += 25;
    if (formData.email.trim()) score += 25;
    if (formData.phone.trim()) score += 20;
    if (formData.bio.trim()) score += 20;
    if (avatar.url) score += 10;
    return Math.min(100, score);
  }, [formData, avatar.url]);

  const profileChecklist = useMemo(
    () => [
      {
        label: "Phone",
        detail: formData.phone.trim() || "Add a phone for faster support",
      },
      {
        label: "Bio",
        detail: formData.bio.trim() ? "Crafted" : "Share a short story",
      },
      {
        label: "Avatar",
        detail: avatar.url ? "Uploaded" : "No photo yet",
      },
    ],
    [formData.phone, formData.bio, avatar.url]
  );

  if (!authLoading && !user) {
    return (
      <section
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: `linear-gradient(135deg, ${robe.cream}, #ffffff)` }}
      >
        <div className="max-w-md rounded-xl bg-white shadow p-6 text-center" style={{ border: `1px solid ${robe.blush}` }}>
          <p className="text-sm text-slate-600 mb-4">You need to be signed in to view this page.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: robe.maroon }}
          >
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="min-h-screen flex items-center justify-center px-4 py-6"
      style={{
        background: `linear-gradient(135deg, ${robe.cream}, #ffffff)`,
        ["--robe-maroon" as any]: robe.maroon,
        ["--robe-blush" as any]: robe.blush,
        ["--robe-sand" as any]: robe.sand,
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-lg" style={{ border: `1px solid ${robe.blush}` }}>
        <div className="grid md:grid-cols-2">
          {/* LEFT: Filled content (no empty space) */}
          <div
            className="relative hidden md:flex flex-col p-6 border-r"
            style={{
              background: `linear-gradient(180deg, #ffffff, ${robe.cream})`,
              borderRight: `1px solid ${robe.blush}`,
              color: robe.text,
            }}
          >
            <div className="flex items-center gap-3 mb-5">
                <div className="relative h-9 w-24">
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
                Profile Center
              </p>
            </div>

            {/* Profile preview card */}
            <div className="rounded-xl border p-4" style={{ borderColor: robe.blush, backgroundColor: "#fff" }}>
              <div className="flex items-center gap-3">
                <div
                  className="relative h-14 w-14 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: robe.cream, border: `1px solid ${robe.blush}` }}
                >
                  {avatar.url ? (
                    <Image src={avatar.url} alt="Profile avatar" fill className="object-cover" sizes="56px" />
                  ) : (
                    <span className="text-lg font-bold" style={{ color: robe.maroon }}>
                      {initials}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: robe.text }}>
                    {formData.fullName?.trim() || "ROBE Member"}
                  </p>
                  <p className="text-xs text-slate-600 truncate">{formData.email?.trim() || "your@email.com"}</p>
                  <p className="text-[0.7rem] text-slate-500 truncate">
                    {formData.phone?.trim() ? `📞 ${formData.phone.trim()}` : "Add a phone for faster support"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em]" style={{ color: robe.maroon }}>
                    Profile strength
                  </p>
                  <p className="text-[0.7rem] font-semibold" style={{ color: robe.text }}>
                    {profileStrength}%
                  </p>
                </div>
                <div className="h-2 w-full rounded-full" style={{ backgroundColor: robe.cream, border: `1px solid ${robe.blush}` }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${profileStrength}%`,
                      backgroundColor: robe.maroon,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Add a bio + phone to complete your profile and get better recommendations.
                </p>
              </div>
            </div>

            {/* Snapshot statistics */}
            <div className="mt-5 grid gap-3 text-xs text-slate-600">
              {[
                { label: "Wishlist items", value: "5", helper: "Favorited recently" },
                { label: "Verified email", value: "Yes", helper: "Last checked just now" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border px-3 py-2 bg-white"
                  style={{ borderColor: robe.blush }}
                >
                  <p className="text-[0.55rem] uppercase tracking-[0.3em] mb-1" style={{ color: robe.maroon }}>
                    {stat.label}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: robe.text }}>
                    {stat.value}
                  </p>
                  <p className="text-[0.65rem] text-slate-500 mt-1">
                    {stat.helper}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 text-xs text-slate-600">
              <div
                className="rounded-lg border bg-white p-4 space-y-2"
                style={{ borderColor: robe.blush }}
              >
                <p className="text-[0.6rem] uppercase tracking-[0.3em]" style={{ color: robe.maroon }}>
                  Account detail
                </p>
                {profileChecklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-semibold" style={{ color: robe.text }}>
                      {item.label}
                    </span>
                    <span className="text-[0.65rem] text-slate-500">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits / tips */}
            <div className="mt-5 space-y-3 text-xs text-slate-600">
              <div className="rounded-lg border p-3" style={{ borderColor: robe.blush, backgroundColor: robe.cream }}>
                <p className="text-[0.6rem] uppercase tracking-[0.3em] mb-1" style={{ color: robe.maroon }}>
                  Member perks
                </p>
                <p className="font-semibold" style={{ color: robe.text }}>
                  Early drops • Private offers • Faster checkout
                </p>
                <p className="mt-1 text-slate-600">Keep your details updated so we can personalize your experience.</p>
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: robe.blush, backgroundColor: "#fff" }}>
                <p className="text-[0.6rem] uppercase tracking-[0.3em] mb-2" style={{ color: robe.maroon }}>
                  Quick checklist
                </p>
                <ul className="space-y-2">
                  {[
                    "Upload a clear profile photo",
                    "Add your phone for delivery updates",
                    "Write a short bio for styling suggestions",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                      <span className="leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg border px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] transition-all hover:opacity-95"
                style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
              >
                Back to home
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* RIGHT */}
          <div className="p-6">
            <div className="md:hidden mb-4 rounded-xl border p-4" style={{ borderColor: robe.blush, backgroundColor: robe.cream, color: robe.text }}>
              <p className="text-[0.7rem] text-slate-600 leading-relaxed">
                Update your profile details and avatar.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: robe.text }}>
                  Profile Image
                </p>
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="relative w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden"
                    style={{ borderColor: robe.blush, backgroundColor: robe.cream }}
                  >
                    {avatar.url ? (
                      <Image src={avatar.url} alt="Profile avatar" fill className="object-cover" sizes="128px" />
                    ) : (
                      <span className="text-xs text-slate-600">No photo</span>
                    )}
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-[0.65rem]" style={{ color: robe.text }}>
                        Uploading...
                      </div>
                    )}
                  </div>

                  <label
                    className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition hover:opacity-95 cursor-pointer"
                    style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={isUploadingImage || isSaving}
                    />
                    {avatar.url ? "Change photo" : "Upload photo"}
                  </label>
                </div>

                {uploadError && (
                  <p className="mt-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    {uploadError}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={isBusy || authLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[0.7rem] font-semibold transition hover:opacity-95 cursor-pointer disabled:opacity-50"
                  style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
                >
                  <FaGoogle className="h-4 w-4" style={{ color: robe.sand }} /> Connect Google
                </button>
              </div>

              {authLoading ? (
                <div className="py-10 text-center text-sm text-slate-500">Loading profile...</div>
              ) : (
                <>
                  <div>
                    <label className="text-[0.75rem] font-medium mb-1 block" style={{ color: robe.text }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                    className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                      disabled={isBusy}
                    />
                  </div>

                  <div>
                    <label className="text-[0.75rem] font-medium mb-1 block" style={{ color: robe.text }}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                      disabled={isBusy}
                    />
                  </div>

                  <div>
                    <label className="text-[0.75rem] font-medium mb-1 block" style={{ color: robe.text }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                      disabled={isBusy}
                    />
                  </div>

                  <div>
                    <label className="text-[0.75rem] font-medium mb-1 block" style={{ color: robe.text }}>
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      className={`${inputClasses} resize-none border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                      placeholder="Tell us about your style journey..."
                      disabled={isBusy}
                    />
                  </div>
                </>
              )}

              {(authError || formError) && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {formError || authError}
                </p>
              )}

              {formMessage && (
                <p className="text-xs border rounded-md px-3 py-2" style={{ color: robe.text, backgroundColor: robe.cream, borderColor: robe.blush }}>
                  {formMessage}
                </p>
              )}

              <div className="rounded-lg border p-4 text-[0.7rem] text-slate-600 space-y-1" style={{ borderColor: robe.blush, backgroundColor: "#fff" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: robe.maroon }}>
                  Quick guide
                </p>
                <p>• Keep contact details current for delivery verification.</p>
                <p>• Bio helps us tailor recommendations.</p>
                <p>• Profile image should be appropriate and community-friendly.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isBusy || authLoading}
                  className="flex-1 cursor-pointer rounded-lg px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-white shadow-md transition hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: robe.maroon }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = robe.maroonHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = robe.maroon)}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isBusy || authLoading}
                  className="flex-1 cursor-pointer rounded-lg border px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.15em] transition hover:opacity-95 disabled:opacity-50"
                  style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
                >
                  Reset
                </button>

                <Link
                  href="/"
                  className="flex-1 cursor-pointer inline-flex items-center justify-center rounded-lg border px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.15em] transition hover:opacity-95"
                  style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
                >
                  Back
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
