"use client";

import { FormEvent, useMemo, useState } from "react";
import { Mail, User } from "lucide-react";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function PreviewEnrollmentForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  const isDisabled = useMemo(() => {
    return state === "submitting" || !name.trim() || !email.trim();
  }, [email, name, state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDisabled) return;

    try {
      setState("submitting");
      setMessage("");

      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          source: "preview-masterclass",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setState("error");
        setMessage(payload.error || "Unable to submit your enrollment.");
        return;
      }

      setState("success");
      setMessage(payload.message || "Enrollment received successfully.");
      setName("");
      setEmail("");
    } catch (error) {
      console.error("Preview enrollment failed:", error);
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 w-full max-w-107.5 rounded-[10px] border border-[#ede5e0] bg-[#f7f6f6] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] md:mt-10 md:p-8"
    >
      <label htmlFor="preview-name" className="sr-only">
        Full Name
      </label>
      <div className="mb-4 flex h-14 items-center rounded-lg border border-[#e9dfda] bg-[#eee7e3] px-4 text-[#b9a8a0] transition-all duration-300 focus-within:border-[#c4a4ad] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(137,15,37,0.08)]">
        <User size={15} className="mr-3 shrink-0" />
        <input
          id="preview-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full Name"
          autoComplete="name"
          className="w-full bg-transparent text-[15px] text-[#473d3b] outline-none placeholder:text-[#b9a8a0]"
          required
        />
      </div>

      <label htmlFor="preview-email" className="sr-only">
        Email Address
      </label>
      <div className="mb-4 flex h-14 items-center rounded-lg border border-[#e9dfda] bg-[#eee7e3] px-4 text-[#b9a8a0] transition-all duration-300 focus-within:border-[#c4a4ad] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(137,15,37,0.08)]">
        <Mail size={15} className="mr-3 shrink-0" />
        <input
          id="preview-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email Address"
          autoComplete="email"
          className="w-full bg-transparent text-[15px] text-[#473d3b] outline-none placeholder:text-[#b9a8a0]"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className="h-14 w-full rounded-lg bg-[#890f25] text-[14px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_8px_16px_rgba(137,15,37,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#741022] hover:shadow-[0_12px_20px_rgba(137,15,37,0.36)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "submitting" ? "Submitting..." : "Enroll For Free"}
      </button>

      <p className="pt-5 text-center text-[10px] uppercase tracking-[0.11em] text-[#c6bab4]">
        Join Our Private Masterclass.
      </p>

      {message ? (
        <p
          className={`pt-3 text-center text-sm ${
            state === "success" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
