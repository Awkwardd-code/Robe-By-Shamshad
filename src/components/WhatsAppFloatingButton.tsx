"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

const SCROLL_THRESHOLD = 320;
const MOBILE_WHATSAPP_REGEX = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i;

type WhatsAppFloatingButtonProps = {
  phoneNumber: string;
  message: string;
};

export default function WhatsAppFloatingButton({
  phoneNumber,
  message,
}: WhatsAppFloatingButtonProps) {
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsBackToTopVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const cleanedNumber = phoneNumber.replace(/[^\d]/g, "");
  const isMobile =
    typeof navigator !== "undefined" &&
    MOBILE_WHATSAPP_REGEX.test(navigator.userAgent);
  const whatsappUrl = isMobile
    ? `whatsapp://send?phone=${cleanedNumber}&text=${encodeURIComponent(
        message
      )}`
    : `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className={[
        "group fixed right-8 z-50",
        isBackToTopVisible ? "bottom-24" : "bottom-8",
        "grid place-items-center",
        "h-12 w-12 rounded-2xl",
        "bg-linear-to-br from-[#6B0F1A] to-[#D4A76A] text-white",
        "shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]",
        "transition-all duration-300 ease-out",
        "hover:from-[#5E0D17] hover:to-[#C89B62]",
        "hover:shadow-[0_18px_45px_-18px_rgba(0,0,0,0.7)] hover:scale-[1.04]",
        "active:scale-[0.98]",
      ].join(" ")}
    >
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-white/35 via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative grid place-items-center h-9 w-9 rounded-xl bg-white/15 border border-white/30">
        <MessageCircle className="h-4 w-4 text-white" />
      </span>
    </a>
  );
}
