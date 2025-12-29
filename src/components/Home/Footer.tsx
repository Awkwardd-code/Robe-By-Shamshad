"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Send, Facebook, Twitter, Instagram, Youtube, Award, Camera, Users, FileText, Shield, Phone, Mail, MapPin, ChevronRight } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Newsletter subscription:", email);
    setEmail("");
  };

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 12
      }
    }
  };

  const buttonVariants: Variants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 10
      }
    },
    tap: { scale: 0.95 }
  };

  const iconVariants: Variants = {
    initial: { rotate: 0 },
    hover: { rotate: 10, transition: { type: "spring" as const, stiffness: 300 } }
  };

  const socialIconVariants: Variants = {
    initial: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.1, 
      rotate: 5,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 10
      }
    }
  };

  const formInputVariants: Variants = {
    focus: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  };

  const submitButtonVariants: Variants = {
    initial: { rotate: 0 },
    hover: { rotate: 5 },
    tap: { rotate: -5 }
  };

  const mutedTextColor = "text-[#A9A9A9]";
  const borderColor = "border-[#A9A9A9]";
  const cardBgColor = "bg-[#FFFFFF]";
  const socialBgColor = "bg-[#FFFFFF] border border-[#A9A9A9] text-[#5B1B1B]";
  const socialHoverBgColor = "hover:bg-[#A9A9A9]/20 hover:border-[#FFFFFF]";

  return (
    <footer className="bg-[#5B1B1B] text-[#FFFFFF] mt-auto transition-colors duration-300">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          
          {/* INFORMATION Column */}
          <motion.div variants={itemVariants}>
            <h3 className="text-lg font-bold mb-4 pb-2 border-b border-[#A9A9A9] text-[#FFFFFF]">INFORMATION</h3>
            <ul className="space-y-3">
              {[
                
                { label: "About", icon: null },
                { label: "Products", icon: Camera },
                { label: "Sales", icon: Award },
                { label: "Contact", icon: Users },
              
              ].map((item) => (
                <motion.li
                  key={item.label}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring" as const, stiffness: 400 }}
                >
                  <motion.a
                    href={`/${item.label.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                    className={`${mutedTextColor} hover:text-[#FFFFFF] transition-colors flex items-center gap-2 group`}
                    whileHover="hover"
                    initial="initial"
                  >
                    <motion.span 
                      className="w-2 h-2 bg-[#FFFFFF] rounded-full"
                      variants={iconVariants}
                    />
                    {item.icon && (
                      <motion.div variants={iconVariants}>
                        <item.icon className="h-4 w-4" />
                      </motion.div>
                    )}
                    {item.label}
                    <motion.div
                      className="ml-auto opacity-0 group-hover:opacity-100"
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </motion.div>
                  </motion.a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* POPULAR BRANDS Column */}
          <motion.div variants={itemVariants}>
            <h3 className="text-lg font-bold mb-4 pb-2 border-b border-[#A9A9A9] text-[#FFFFFF]">POPULAR BRANDS</h3>
            <ul className="space-y-3">
              <motion.li
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring" as const, stiffness: 300 }}
              >
                <span className="text-[#FFFFFF] font-semibold">Bites</span>
                <ul className="ml-4 mt-2 space-y-2">
                  {["Robe By ShamShad",].map((brand, index) => (
                    <motion.li
                      key={brand}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      viewport={{ once: true }}
                    >
                      <motion.a
                        href={`/`}
                    className={`${mutedTextColor} hover:text-[#FFFFFF] transition-colors text-sm flex items-center gap-2 group`}
                        whileHover={{ x: 3 }}
                      >
                        <motion.span 
                          className="w-1.5 h-1.5 bg-[#FFFFFF] rounded-full"
                          variants={iconVariants}
                        />
                        {brand}
                        <motion.span
                          className="opacity-0 group-hover:opacity-100"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          •
                        </motion.span>
                      </motion.a>
                    </motion.li>
                  ))}
                </ul>
              </motion.li>
            </ul>
          </motion.div>

          {/* CUSTOMER SERVICE Column */}
          <motion.div variants={itemVariants}>
            <h3 className="text-lg font-bold mb-4 pb-2 border-b border-[#A9A9A9] text-[#FFFFFF]">CUSTOMER SERVICE</h3>
            <ul className="space-y-3">
              {[
                { label: "Sales", indent: false },
               /*  { label: "FAQs", indent: false },
                { label: "MyStats", indent: true },
                { label: "Bites Stories", indent: true },
                { label: "All About Feet", indent: true }, */
                { label: "Contact", indent: true },
                { label: "About", indent: true },
                // { label: "Report Issue", indent: true },
              ].map((item) => (
                <motion.li
                  key={item.label}
                  className={item.indent ? "ml-4" : ""}
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring" as const, stiffness: 400 }}
                >
                  <motion.a
                    href={`/${item.label.toLowerCase().replace(/ /g, '-')}`}
                    className={`${mutedTextColor} hover:text-[#FFFFFF] transition-colors ${item.indent ? 'text-sm' : ''} flex items-center gap-2`}
                    whileHover="hover"
                    initial="initial"
                  >
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <span className={`w-${item.indent ? '1.5' : '2'} h-${item.indent ? '1.5' : '2'} bg-[#FFFFFF] rounded-full`} />
                    </motion.div>
                    {item.label}
                  </motion.a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* INFO Column */}
          <motion.div variants={itemVariants}>
            <h3 className="text-lg font-bold mb-4 pb-2 border-b border-[#A9A9A9] text-[#FFFFFF]">INFO</h3>
            <div className="space-y-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring" as const, stiffness: 300 }}
              >
                <p className={`${mutedTextColor} font-medium`}>Bites Shop Company Bangladesh Ltd.</p>
                <motion.div 
                  className="flex items-start gap-2 mt-2"
                  whileHover={{ x: 3 }}
                >
                  <motion.div
                    variants={iconVariants}
                    whileHover="hover"
                  >
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[#FFFFFF]" />
                  </motion.div>
                  <span className="text-sm text-[#A9A9A9]">Tongi Carbon, Bangladesh.</span>
                </motion.div>
              </motion.div>

              <motion.div 
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
              >
                <motion.div 
                  className="flex items-center gap-2"
                  variants={itemVariants}
                  whileHover={{ x: 3 }}
                >
                  <motion.div
                    variants={iconVariants}
                    whileHover="hover"
                  >
                    <Phone className="h-4 w-4 text-[#FFFFFF]" />
                  </motion.div>
                  <span className="text-sm text-[#A9A9A9]">Call us at: 00862020309 (Ben-Semi)</span>
                </motion.div>
                <motion.div 
                  className="flex items-center gap-2"
                  variants={itemVariants}
                  whileHover={{ x: 3 }}
                >
                  <motion.div
                    variants={iconVariants}
                    whileHover="hover"
                  >
                    <Mail className="h-4 w-4 text-[#FFFFFF]" />
                  </motion.div>
                  <span className="text-sm text-[#A9A9A9]">Email: bdscustomercare@uni-bs.com</span>
                </motion.div>
              </motion.div>

              {/* Newsletter Subscription */}
              {/* <motion.div 
                className="pt-6 border-t border-[#A9A9A9]"
                variants={itemVariants}
              >
                <h4 className="text-lg font-bold mb-4 text-[#FFFFFF]">Sign up for our Newsletter</h4>
                <motion.form 
                  onSubmit={handleSubmit} 
                  className="space-y-4"
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                >
                  <motion.div 
                    className="relative"
                    variants={itemVariants}
                    whileFocus="focus"
                  >
                    <motion.input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email "
                      className={`w-full px-4 py-3 ${cardBgColor} ${borderColor} border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B1B1B] focus:border-transparent text-[#4B4B4B] placeholder-[#A9A9A9] transition-colors duration-300`}
                      required
                      variants={formInputVariants}
                      whileFocus="focus"
                    />
                    <motion.button
                      type="submit"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#5B1B1B] hover:bg-[#5B1B1B]/90 text-white p-2 rounded-lg transition-colors"
                      variants={submitButtonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Send className="h-5 w-5" />
                    </motion.button>
                  </motion.div>
                  <motion.p 
                    className="text-xs text-[#A9A9A9]"
                    variants={itemVariants}
                  >
                    Subscribe to get updates on new arrivals, special offers and more.
                  </motion.p>
                </motion.form>
              </motion.div> */}
            </div>
          </motion.div>
        </motion.div>

        {/* Social Media & Bottom Section */}
        <motion.div 
          className="mt-12 pt-8 border-t border-[#A9A9A9]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Social Media Icons */}
            <motion.div 
              className="flex items-center gap-4"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                { icon: Facebook, href: "https://facebook.com" },
                { icon: Twitter, href: "https://twitter.com" },
                { icon: Instagram, href: "https://instagram.com" },
                { icon: Youtube, href: "https://youtube.com" },
              ].map((social, index) => (
                <motion.a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${socialBgColor} ${socialHoverBgColor} p-3 rounded-full transition-colors duration-300`}
                  variants={socialIconVariants}
                  whileHover="hover"
                  whileTap="tap"
                  custom={index}
                  initial="initial"
                >
                  <social.icon className="h-5 w-5" />
                </motion.a>
              ))}
            </motion.div>

            {/* Copyright */}
            <motion.div 
              className="text-center md:text-right"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-[#A9A9A9] text-sm">
                © {new Date().getFullYear()} Bites Shop Company Bangladesh Ltd. All rights reserved.
              </p>
              <div className="flex flex-wrap justify-center md:justify-end gap-4 mt-2">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((policy) => (
                  <motion.a
                    key={policy}
                    href={`/${policy.toLowerCase().replace(/ /g, '-')}`}
                    className="text-[#A9A9A9] hover:text-[#FFFFFF] text-sm transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {policy}
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
