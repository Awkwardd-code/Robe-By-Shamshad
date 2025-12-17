/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { 
  FaInstagram, 
  FaFacebookF, 
  FaPinterest, 
  
  FaLeaf, 

  FaAward,
  FaHandsHelping,
  FaRibbon,
  FaPalette,
  FaSeedling
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

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="text-center mb-12">
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] mb-4"
      style={{ backgroundColor: robe.cream, color: robe.maroon }}
    >
      <span>{title}</span>
    </div>
    <h2
      className="text-3xl font-serif font-bold mb-4"
      style={{ color: robe.maroon }}
    >
      {subtitle}
    </h2>
    <div className="w-20 h-0.5 mx-auto" style={{ backgroundColor: robe.sand }} />
  </div>
);

export default function AboutPage() {
  const cssVars: CSSProperties = {};
  (cssVars as any)["--robe-maroon"] = robe.maroon;
  (cssVars as any)["--robe-blush"] = robe.blush;
  (cssVars as any)["--robe-sand"] = robe.sand;

  const values = [
    {
      icon: <FaLeaf className="w-8 h-8" />,
      title: "Sustainable Elegance",
      description: "We source ethically and prioritize eco-friendly materials without compromising on luxury.",
      color: robe.maroon,
    },
    {
      icon: <FaHandsHelping className="w-8 h-8" />,
      title: "Artisanal Craftsmanship",
      description: "Each piece is meticulously crafted by skilled artisans preserving traditional techniques.",
      color: robe.text,
    },
    {
      icon: <FaSeedling className="w-8 h-8" />,
      title: "Community First",
      description: "We support local communities and celebrate the stories behind every creation.",
      color: robe.sand,
    },
    {
      icon: <FaRibbon className="w-8 h-8" />,
      title: "Timeless Quality",
      description: "We believe in creating pieces that last, designed to become heirlooms.",
      color: robe.maroon,
    },
  ];

  const team = [
    {
      name: "Shamshad Begum",
      role: "Founder & Creative Director",
      initials: "SB",
      bio: "With 20+ years in traditional textile arts, Shamshad brings heritage craftsmanship to modern luxury.",
      expertise: ["Textile Heritage", "Design Innovation", "Sustainable Practices"],
    },
    {
      name: "Ayesha Rahman",
      role: "Head of Design",
      initials: "AR",
      bio: "Trained in Milan, Ayesha blends contemporary aesthetics with Bangladeshi textile heritage.",
      expertise: ["Contemporary Design", "Color Theory", "Pattern Development"],
    },
    {
      name: "Rahim Khan",
      role: "Production Lead",
      initials: "RK",
      bio: "Third-generation artisan ensuring every stitch meets our exacting standards of quality.",
      expertise: ["Quality Control", "Traditional Techniques", "Team Leadership"],
    },
  ];

  const milestones = [
    { year: "2010", event: "Shamshad begins her journey with a small Dhaka atelier" },
    { year: "2015", event: "ROBE brand officially launches with first collection" },
    { year: "2018", event: "Expands to international markets with sustainable focus" },
    { year: "2021", event: "Wins Sustainable Fashion Award for ethical practices" },
    { year: "2023", event: "Opens flagship store with zero-waste production facility" },
  ];

  const patterns = [
    "M0,0 L100,0 L100,100 L0,100 Z",
    "M20,20 L80,20 L80,80 L20,80 Z",
    "M50,0 L100,50 L50,100 L0,50 Z",
    "M0,0 Q50,20 100,0 T200,0",
  ];

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${robe.cream}, #ffffff)` }}>
      {/* Hero Section */}
      <section className="relative py-20 px-4 md:px-8 overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-5">
          <svg className="w-full h-full">
            <pattern
              id="pattern-circles"
              x="0"
              y="0"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
              patternContentUnits="userSpaceOnUse"
            >
              <circle cx="50" cy="50" r="2" fill={robe.maroon} />
            </pattern>
            <rect width="100%" height="100%" fill="url(#pattern-circles)" />
          </svg>
        </div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] mb-6"
                style={{ backgroundColor: robe.cream, color: robe.maroon }}
              >
                <span>Our Story</span>
              </div>
              
              <h1
                className="text-4xl md:text-5xl font-serif font-bold mb-6 leading-tight"
                style={{ color: robe.maroon }}
              >
                Where Tradition Meets <span className="italic">Contemporary</span> Elegance
              </h1>
              
              <div className="space-y-4 mb-8">
                <p className="text-lg leading-relaxed" style={{ color: robe.text }}>
                  Founded by Shamshad Begum in 2015, ROBE celebrates the rich textile heritage of Bangladesh 
                  through modern, sustainable luxury. Each piece tells a story of craftsmanship, culture, and 
                  conscious creation.
                </p>
                <p className="text-lg leading-relaxed" style={{ color: robe.text }}>
                  Our journey began in a small Dhaka studio and has grown into a global celebration of 
                  Bangladeshi craftsmanship, blending centuries-old techniques with contemporary design.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/collections"
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition-all hover:shadow-lg cursor-pointer"
                  style={{ backgroundColor: robe.maroon, color: "white" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = robe.maroonHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = robe.maroon)
                  }
                >
                  Explore Collections
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition-all hover:opacity-95 cursor-pointer"
                  style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
                >
                  Contact Us
                </Link>
              </div>
            </div>
            
            {/* Visual Pattern Display */}
            <div className="relative">
              <div
                className="h-96 w-full rounded-2xl relative overflow-hidden border"
                style={{ backgroundColor: robe.cream, borderColor: robe.blush }}
              >
                {/* Geometric Pattern Display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-8 p-8">
                    {patterns.map((path, index) => (
                      <div
                        key={index}
                        className="relative w-32 h-32"
                        style={{ color: robe.maroon }}
                      >
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full opacity-70"
                        >
                          <path
                            d={path}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Floating Stats */}
                <div className="absolute top-6 left-6">
                  <div
                    className="w-20 h-20 rounded-full flex flex-col items-center justify-center"
                    style={{ backgroundColor: robe.maroon, color: "white" }}
                  >
                    <span className="text-2xl font-bold">8+</span>
                    <span className="text-xs">Years</span>
                  </div>
                </div>
                
                <div className="absolute bottom-6 right-6">
                  <div
                    className="w-20 h-20 rounded-full flex flex-col items-center justify-center"
                    style={{ backgroundColor: robe.sand, color: robe.text }}
                  >
                    <span className="text-2xl font-bold">50+</span>
                    <span className="text-xs">Artisans</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 md:px-8" style={{ backgroundColor: "white" }}>
        <div className="container mx-auto max-w-6xl">
          <SectionHeader title="Our Philosophy" subtitle="Crafted with Conscience" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="p-8 rounded-xl border transition-all hover:shadow-lg cursor-pointer group"
                style={{ borderColor: robe.blush, backgroundColor: robe.cream }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: robe.blush, color: value.color }}
                >
                  {value.icon}
                </div>
                <h3 className="text-xl font-serif font-bold mb-4" style={{ color: robe.maroon }}>
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: robe.text }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Timeline */}
      <section className="py-20 px-4 md:px-8 relative">
        <div className="absolute inset-0" style={{ backgroundColor: robe.cream }} />
        
        <div className="container mx-auto max-w-4xl relative z-10">
          <SectionHeader title="Journey Through Time" subtitle="Our Milestones" />
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 hidden md:block" style={{ backgroundColor: robe.sand }} />
            
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className={`flex flex-col md:flex-row items-center mb-12 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
              >
                <div className="w-full md:w-5/12 mb-4 md:mb-0">
                  <div
                    className={`p-6 rounded-xl border text-center md:text-left ${index % 2 === 0 ? "md:text-right" : ""}`}
                    style={{ borderColor: robe.blush, backgroundColor: "white" }}
                  >
                    <div
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                      style={{ backgroundColor: robe.maroon, color: "white" }}
                    >
                      <span className="text-xl font-bold">{milestone.year}</span>
                    </div>
                    <h3 className="text-2xl font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                      {milestone.year}
                    </h3>
                    <p className="text-sm" style={{ color: robe.text }}>
                      {milestone.event}
                    </p>
                  </div>
                </div>
                
                <div className="w-8 h-8 rounded-full mx-4 shrink-0 hidden md:flex items-center justify-center" style={{ backgroundColor: robe.maroon, color: "white" }}>
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>
                
                <div className="w-full md:w-5/12 hidden md:block">
                  {/* Empty spacer */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4 md:px-8" style={{ backgroundColor: "white" }}>
        <div className="container mx-auto max-w-6xl">
          <SectionHeader title="The Visionaries" subtitle="Meet Our Team" />
          
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="group">
                <div className="relative h-64 w-full rounded-xl overflow-hidden mb-6 border" style={{ borderColor: robe.blush }}>
                  <div
                    className="absolute inset-0 flex items-center justify-center text-6xl font-bold transition-all duration-300 group-hover:scale-110"
                    style={{ 
                      backgroundColor: index === 0 ? robe.maroon : 
                                     index === 1 ? robe.sand : 
                                     robe.blush,
                      color: index === 0 ? "white" : robe.text
                    }}
                  >
                    {member.initials}
                  </div>
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                    style={{ backgroundColor: robe.maroon }}
                  />
                </div>
                
                <h3 className="text-xl font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                  {member.name}
                </h3>
                <p className="text-sm font-medium mb-3" style={{ color: robe.sand }}>
                  {member.role}
                </p>
                <p className="text-sm leading-relaxed mb-4" style={{ color: robe.text }}>
                  {member.bio}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {member.expertise.map((skill, skillIndex) => (
                    <span
                      key={skillIndex}
                      className="px-3 py-1 text-xs rounded-full"
                      style={{ backgroundColor: robe.cream, color: robe.text }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Craftsmanship Showcase */}
      <section className="py-20 px-4 md:px-8 relative">
        <div className="absolute inset-0 opacity-10">
          {/* Pattern Background */}
          <svg className="w-full h-full">
            <defs>
              <pattern id="textile-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0,20 L40,20 M20,0 L20,40" stroke={robe.maroon} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#textile-pattern)" />
          </svg>
        </div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <SectionHeader title="Our Craft" subtitle="The Art of Creation" />
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Material Selection",
                description: "We source only the finest sustainable materials, ensuring both quality and ethical standards.",
                color: robe.maroon,
                icon: <FaLeaf className="w-6 h-6" />
              },
              {
                title: "Traditional Techniques",
                description: "Preserving centuries-old weaving and embroidery methods passed down through generations.",
                color: robe.text,
                icon: <FaPalette className="w-6 h-6" />
              },
              {
                title: "Modern Innovation",
                description: "Blending traditional craftsmanship with contemporary design and sustainable technology.",
                color: robe.sand,
                icon: <FaAward className="w-6 h-6" />
              },
            ].map((item, index) => (
              <div
                key={index}
                className="p-8 rounded-xl border text-center"
                style={{ 
                  borderColor: robe.blush, 
                  backgroundColor: "white",
                  color: item.color
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: robe.cream }}
                >
                  {item.icon}
                </div>
                <h3 className="text-xl font-serif font-bold mb-4" style={{ color: robe.maroon }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: robe.text }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social & Contact CTA */}
      <section className="py-20 px-4 md:px-8">
        <div
          className="container mx-auto max-w-4xl rounded-2xl p-8 md:p-12 text-center"
          style={{ backgroundColor: robe.cream, border: `1px solid ${robe.blush}` }}
        >
          <h2 className="text-3xl font-serif font-bold mb-6" style={{ color: robe.maroon }}>
            Join Our Community
          </h2>
          
          <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: robe.text }}>
            Follow our journey, discover behind-the-scenes stories, and be the first to know about new collections.
          </p>
          
          <div className="flex justify-center gap-6 mb-10">
            {[
              { icon: <FaInstagram />, label: "Instagram", color: "#E1306C" },
              { icon: <FaFacebookF />, label: "Facebook", color: "#1877F2" },
              { icon: <FaPinterest />, label: "Pinterest", color: "#E60023" },
            ].map((social) => (
              <a
                key={social.label}
                href="#"
                className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-lg cursor-pointer"
                style={{ backgroundColor: social.color }}
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition-all hover:opacity-95 cursor-pointer"
              style={{ borderColor: robe.blush, color: robe.maroon, backgroundColor: "#fff" }}
            >
              Get in Touch
            </Link>
            <Link
              href="/newsletter"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition-all hover:shadow-lg cursor-pointer"
              style={{ backgroundColor: robe.maroon, color: "white" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = robe.maroonHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = robe.maroon)
              }
            >
              Subscribe to Newsletter
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <footer className="py-12 px-4 text-center border-t" style={{ borderColor: robe.blush }}>
        <div className="container mx-auto max-w-4xl">
          {/* Logo Replacement with Typography */}
          <div className="mb-6">
            <p
              className="text-2xl font-serif font-bold tracking-wider mb-1"
              style={{ color: robe.maroon }}
            >
              ROBE
            </p>
            <p className="text-xs font-light tracking-[0.3em] uppercase mb-4 text-slate-600">
              BY SHAMSHAD
            </p>
          </div>
          
          <p className="text-sm mb-4" style={{ color: robe.text }}>
            ROBE by Shamshad © {new Date().getFullYear()}. All rights reserved.
          </p>
          
          <p className="text-xs text-slate-600 max-w-2xl mx-auto">
            Crafting sustainable luxury from the heart of Bangladesh to the world. 
            Every piece tells a story of heritage, craftsmanship, and conscious creation.
          </p>
          
          <div className="mt-8 flex justify-center gap-6">
            <Link href="/privacy" className="text-xs text-slate-600 hover:text-slate-800 cursor-pointer">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-slate-600 hover:text-slate-800 cursor-pointer">
              Terms of Service
            </Link>
            <Link href="/sustainability" className="text-xs text-slate-600 hover:text-slate-800 cursor-pointer">
              Sustainability
            </Link>
            <Link href="/contact" className="text-xs text-slate-600 hover:text-slate-800 cursor-pointer">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}