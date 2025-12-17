/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { 
  FaMapMarkerAlt, 
  FaPhone, 
  FaEnvelope, 
  FaClock, 
  FaInstagram, 
  FaFacebookF, 
  FaPinterest,
  FaCheck,
  FaPaperPlane
} from "react-icons/fa";
import { CSSProperties } from "react";

const robe = {
  cream: "#FBF3E8",
  maroon: "#944C35",
  sand: "#E2B188",
  blush: "#F1D6C1",
  text: "#3b2a22",
  maroonHover: "#7f3f2d",
};

const inputClasses =
  "w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 transition-all";

export default function ContactPage() {
  const cssVars: CSSProperties = {};
  (cssVars as any)["--robe-maroon"] = robe.maroon;
  (cssVars as any)["--robe-blush"] = robe.blush;
  (cssVars as any)["--robe-sand"] = robe.sand;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: "" });

  const contactInfo = [
    {
      icon: <FaMapMarkerAlt className="w-5 h-5" />,
      title: "Our Atelier",
      details: ["123 Textile Avenue", "Dhaka 1212", "Bangladesh"],
      color: robe.maroon,
    },
    {
      icon: <FaPhone className="w-5 h-5" />,
      title: "Phone",
      details: ["+880 1234 567890", "Mon-Fri: 9AM-6PM"],
      color: robe.text,
    },
    {
      icon: <FaEnvelope className="w-5 h-5" />,
      title: "Email",
      details: ["hello@robeshamshad.com", "support@robeshamshad.com"],
      color: robe.sand,
    },
    {
      icon: <FaClock className="w-5 h-5" />,
      title: "Business Hours",
      details: ["Mon-Fri: 9:00 AM - 6:00 PM", "Sat: 10:00 AM - 4:00 PM", "Sun: Closed"],
      color: robe.maroon,
    },
  ];

  const faqItems = [
    {
      question: "How long does shipping take?",
      answer: "International shipping takes 7-14 business days. Express shipping available for 3-5 business days.",
    },
    {
      question: "What is your return policy?",
      answer: "We accept returns within 30 days of delivery. Items must be unworn with original tags attached.",
    },
    {
      question: "Do you offer custom sizing?",
      answer: "Yes, we offer bespoke tailoring. Please contact us at least 3 weeks before your needed date.",
    },
    {
      question: "Are your materials sustainable?",
      answer: "All our materials are ethically sourced and 95% of our fabrics are organic or recycled.",
    },
  ];

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear any previous status when user starts typing
    if (submitStatus.type) {
      setSubmitStatus({ type: null, message: "" });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    // Simulate API call
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2; // 80% success rate for demo
      if (isSuccess) {
        setSubmitStatus({
          type: 'success',
          message: 'Thank you for your message! We\'ll get back to you within 24 hours.'
        });
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });
      } else {
        setSubmitStatus({
          type: 'error',
          message: 'Something went wrong. Please try again or email us directly.'
        });
      }
      setIsSubmitting(false);
    }, 1500);
  };

  const isFormValid = formData.name && formData.email && formData.message;

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${robe.cream}, #ffffff)` }}>
      {/* Hero Header */}
      <section className="py-12 px-4 md:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] mb-4"
              style={{ backgroundColor: robe.cream, color: robe.maroon }}
            >
              <span>Get in Touch</span>
            </div>
            
            <h1
              className="text-4xl md:text-5xl font-serif font-bold mb-6"
              style={{ color: robe.maroon }}
            >
              Connect With <span className="italic">Our Studio</span>
            </h1>
            
            <p className="text-lg max-w-2xl mx-auto" style={{ color: robe.text }}>
              Have questions about our collections, need styling advice, or want to discuss custom designs?
              We're here to help you create your perfect look.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-4 md:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <div
                className="rounded-2xl border p-8 mb-8"
                style={{ backgroundColor: "white", borderColor: robe.blush }}
              >
                <h2 className="text-2xl font-serif font-bold mb-6" style={{ color: robe.maroon }}>
                  Send Us a Message
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block" style={{ color: robe.text }}>
                        Your Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block" style={{ color: robe.text }}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="you@example.com"
                        className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block" style={{ color: robe.text }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+880 1XXXXXXXXX"
                        className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block" style={{ color: robe.text }}>
                        Subject *
                      </label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className={`${inputClasses} border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                        required
                        disabled={isSubmitting}
                      >
                        <option value="">Select a subject</option>
                        <option value="general">General Inquiry</option>
                        <option value="order">Order Support</option>
                        <option value="custom">Custom Design</option>
                        <option value="wholesale">Wholesale Inquiry</option>
                        <option value="care">Product Care</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: robe.text }}>
                      Your Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us how we can help you..."
                      rows={6}
                      className={`${inputClasses} resize-none border-(--robe-blush) focus:border-(--robe-maroon) focus:ring-(--robe-blush)`}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div
                    className="rounded-2xl border p-4 text-sm text-slate-600 flex flex-col gap-2"
                    style={{ backgroundColor: "#fff", borderColor: robe.blush }}
                  >
                    <p className="font-semibold uppercase tracking-[0.2em]" style={{ color: robe.maroon }}>
                      Need a quicker reply?
                    </p>
                    <p>
                      Our concierge team monitors messages in real time between 9 AM – 6 PM BD time. Mention your order number
                      or preferred collection to help us fast-track the reply.
                    </p>
                    <p className="text-[0.8rem] text-slate-500">
                      You can also reach us at{" "}
                      <Link href="tel:+8801234567890" className="font-semibold" style={{ color: robe.maroon }}>
                        +880 1234 567890
                      </Link>
                      {" "}or{" "}
                      <Link href="mailto:hello@robeshamshad.com" className="font-semibold" style={{ color: robe.maroon }}>
                        hello@robeshamshad.com
                      </Link>
                      .
                    </p>
                  </div>
                  
                  {submitStatus.type && (
                    <div
                      className={`p-4 rounded-lg border ${submitStatus.type === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${submitStatus.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {submitStatus.type === 'success' ? (
                            <FaCheck className="w-4 h-4" />
                          ) : (
                            <span className="text-sm font-bold">!</span>
                          )}
                        </div>
                        <p className={`text-sm ${submitStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                          {submitStatus.message}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
                    className="relative overflow-hidden w-full rounded-lg text-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.15em] transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-3"
                    style={{ backgroundColor: robe.maroon }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = robe.maroonHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = robe.maroon)
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 text-white"
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
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
              
              {/* Social Media */}
              <div
                className="rounded-2xl border p-8"
                style={{ backgroundColor: robe.cream, borderColor: robe.blush }}
              >
                <h3 className="text-xl font-serif font-bold mb-6" style={{ color: robe.maroon }}>
                  Follow Our Journey
                </h3>
                <p className="text-sm mb-6" style={{ color: robe.text }}>
                  Join our community for behind-the-scenes looks, styling tips, and new collection previews.
                </p>
                
                <div className="flex gap-4">
                  {[
                    { icon: <FaInstagram />, label: "Instagram", color: "#E1306C" },
                    { icon: <FaFacebookF />, label: "Facebook", color: "#1877F2" },
                    { icon: <FaPinterest />, label: "Pinterest", color: "#E60023" },
                  ].map((social) => (
                    <a
                      key={social.label}
                      href="#"
                      className="flex-1 rounded-lg border px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all hover:shadow-md cursor-pointer"
                      style={{ 
                        borderColor: robe.blush, 
                        color: robe.maroon, 
                        backgroundColor: "white" 
                      }}
                      aria-label={social.label}
                    >
                      {social.icon}
                      <span>{social.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div
                className="rounded-2xl border p-8 mt-6"
                style={{ backgroundColor: "white", borderColor: robe.blush }}
              >
                <h3 className="text-xl font-serif font-bold mb-4" style={{ color: robe.maroon }}>
                  Want a curated look?
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Book a private styling call or request fabric swatches directly through our concierge team. We’ll
                  walk you through the newest drapes, fabrics, and tailoring notes before you visit.
                </p>
                <div className="flex flex-col gap-3 md:flex-row">
                  <Link
                    href="/appointments"
                    className="flex-1 rounded-lg border px-4 py-3 text-sm font-semibold text-center transition hover:shadow-md"
                    style={{ borderColor: robe.blush, color: robe.maroon }}
                  >
                    Schedule a consultation
                  </Link>
                  <Link
                    href="/collections"
                    className="flex-1 rounded-lg border px-4 py-3 text-sm font-semibold text-center transition hover:shadow-md"
                    style={{ borderColor: robe.blush, color: robe.maroon }}
                  >
                    Browse curated capsules
                  </Link>
                </div>
              </div>

              <div
                className="rounded-2xl border p-8 mt-6"
                style={{ backgroundColor: robe.cream, borderColor: robe.blush }}
              >
                <h3 className="text-xl font-serif font-bold mb-4" style={{ color: robe.maroon }}>
                  Studio promises
                </h3>
                <div className="grid gap-4 sm:grid-cols-3 text-sm">
                  {[
                    { label: "Live styling", value: "24/7 concierge" },
                    { label: "Craft time", value: "4-6 weeks per bespoke set" },
                    { label: "Sustainability", value: "95% certified textiles" },
                  ].map((promise) => (
                    <div
                      key={promise.label}
                      className="rounded-xl border px-4 py-3 bg-white"
                      style={{ borderColor: robe.blush }}
                    >
                      <p className="text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: robe.maroon }}>
                        {promise.label}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: robe.text }}>
                        {promise.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Contact Information */}
            <div>
              {/* Contact Cards */}
              <div className="space-y-6 mb-12">
                {contactInfo.map((info, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-xl border transition-all hover:shadow-md cursor-pointer"
                    style={{ 
                      borderColor: robe.blush, 
                      backgroundColor: "white",
                      color: info.color
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: robe.cream }}
                      >
                        {info.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                          {info.title}
                        </h3>
                        <div className="space-y-1">
                          {info.details.map((detail, idx) => (
                            <p key={idx} className="text-sm" style={{ color: robe.text }}>
                              {detail}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Map/Studio Visualization */}
              <div
                className="rounded-2xl border p-8 mb-12"
                style={{ backgroundColor: robe.cream, borderColor: robe.blush }}
              >
                <h3 className="text-xl font-serif font-bold mb-6" style={{ color: robe.maroon }}>
                  Visit Our Atelier
                </h3>
                
                <div className="relative h-64 rounded-lg overflow-hidden mb-6">
                  {/* Map Visualization with Pattern */}
                  <div className="absolute inset-0" style={{ backgroundColor: robe.sand }}>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-10">
                      <svg className="w-full h-full">
                        <pattern
                          id="grid-pattern"
                          x="0"
                          y="0"
                          width="40"
                          height="40"
                          patternUnits="userSpaceOnUse"
                        >
                          <rect width="40" height="40" fill="none" stroke={robe.maroon} strokeWidth="1" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                      </svg>
                    </div>
                    
                    {/* Marker */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
                        style={{ backgroundColor: robe.maroon, color: "white" }}
                      >
                        <FaMapMarkerAlt className="w-6 h-6" />
                      </div>
                    </div>
                    
                    {/* Location text */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <div className="px-4 py-2 rounded-full" style={{ backgroundColor: "white" }}>
                        <p className="text-xs font-semibold" style={{ color: robe.maroon }}>
                          Dhaka, Bangladesh
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: robe.text }}>
                    <span className="font-semibold">Directions:</span> Located in the heart of Dhaka's textile district.
                    Our atelier is open for private appointments and consultations.
                  </p>
                  <p className="text-sm" style={{ color: robe.text }}>
                    <span className="font-semibold">Parking:</span> Available on-site for visitors.
                  </p>
                  <p className="text-sm" style={{ color: robe.text }}>
                    <span className="font-semibold">Accessibility:</span> Fully wheelchair accessible.
                  </p>
                </div>
              </div>
              
              {/* FAQ */}
              <div>
                <h3 className="text-xl font-serif font-bold mb-6" style={{ color: robe.maroon }}>
                  Frequently Asked Questions
                </h3>
                
                <div className="space-y-4">
                  {faqItems.map((item, index) => (
                    <details
                      key={index}
                      className="group rounded-lg border cursor-pointer"
                      style={{ borderColor: robe.blush, backgroundColor: "white" }}
                    >
                      <summary className="list-none px-6 py-4 flex justify-between items-center">
                        <span className="text-sm font-medium" style={{ color: robe.text }}>
                          {item.question}
                        </span>
                        <span
                          className="text-lg transition-transform group-open:rotate-180"
                          style={{ color: robe.maroon }}
                        >
                          ▼
                        </span>
                      </summary>
                      <div className="px-6 pb-4 pt-2">
                        <p className="text-sm" style={{ color: robe.text }}>
                          {item.answer}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
                
                <div className="mt-6 text-center">
                  <Link
                    href="/faq"
                    className="inline-flex items-center text-sm font-medium transition-colors cursor-pointer"
                    style={{ color: robe.maroon }}
                  >
                    View all FAQs
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 px-4 md:px-8">
        <div className="container mx-auto max-w-4xl">
          <div
            className="rounded-2xl p-8 md:p-12 text-center relative overflow-hidden"
            style={{ backgroundColor: robe.cream, border: `1px solid ${robe.blush}` }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full">
                <defs>
                  <pattern id="newsletter-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                    <circle cx="30" cy="30" r="20" fill="none" stroke={robe.maroon} strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#newsletter-pattern)" />
              </svg>
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-serif font-bold mb-4" style={{ color: robe.maroon }}>
                Stay in Style
              </h2>
              
              <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: robe.text }}>
                Subscribe to our newsletter for exclusive previews, styling tips, and special offers.
              </p>
              
              <div className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="flex-1 rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-1"
                    style={{ 
                      borderColor: robe.blush, 
                      color: robe.text,
                      backgroundColor: "white"
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-lg px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition-all hover:shadow-lg cursor-pointer whitespace-nowrap"
                    style={{ backgroundColor: robe.maroon, color: "white" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = robe.maroonHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = robe.maroon)
                    }
                  >
                    Subscribe
                  </button>
                </div>
                <p className="text-xs mt-3 text-slate-600">
                  By subscribing, you agree to our Privacy Policy. Unsubscribe at any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: robe.blush }}>
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0 text-center md:text-left">
              <p
                className="text-xl font-serif font-bold tracking-wider mb-1"
                style={{ color: robe.maroon }}
              >
                ROBE
              </p>
              <p className="text-xs font-light tracking-[0.3em] uppercase text-slate-600">
                BY SHAMSHAD
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link href="/privacy" className="text-slate-600 hover:text-slate-800 cursor-pointer">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-slate-600 hover:text-slate-800 cursor-pointer">
                Terms of Service
              </Link>
              <Link href="/shipping" className="text-slate-600 hover:text-slate-800 cursor-pointer">
                Shipping & Returns
              </Link>
              <Link href="/careers" className="text-slate-600 hover:text-slate-800 cursor-pointer">
                Careers
              </Link>
              <Link href="/contact" className="text-slate-600 hover:text-slate-800 cursor-pointer">
                Contact
              </Link>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              © {new Date().getFullYear()} ROBE by Shamshad. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
