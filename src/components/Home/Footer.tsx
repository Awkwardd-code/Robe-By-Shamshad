import {
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const mutedTextColor = "text-[#A9A9A9]";
  const socialBgColor =
    "bg-[#FFFFFF] border border-[#A9A9A9] text-[#5B1B1B]";
  const socialHoverBgColor =
    "hover:bg-[#A9A9A9]/20 hover:border-[#FFFFFF]";

  return (
    <footer className="bg-[#5B1B1B] text-white mt-auto">
      
      <div className="container mx-auto px-4 py-12">

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

          {/* INFORMATION */}
          <section>
            <h2 className="text-lg font-bold mb-4 border-b border-[#A9A9A9] pb-2">
              Information
            </h2>

            <ul className="space-y-3">
              {["About", "Products", "Sales", "Contact"].map((item) => (
                <li key={item}>
                  <a
                    href={`/${item.toLowerCase()}`}
                    className={`${mutedTextColor} hover:text-white flex items-center gap-2`}
                  >
                    <span className="w-2 h-2 bg-white rounded-full" />
                    {item}
                    <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* CUSTOMER SERVICE */}
          <section>
            <h2 className="text-lg font-bold mb-4 border-b border-[#A9A9A9] pb-2">
              Customer Service
            </h2>

            <ul className="space-y-3">
              {["Products", "Sales", "Contact", "About"].map((item) => (
                <li key={item}>
                  <a
                    href={`/${item.toLowerCase()}`}
                    className={`${mutedTextColor} hover:text-white flex items-center gap-2`}
                  >
                    <span className="w-2 h-2 bg-white rounded-full" />
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* 🔥 BUSINESS INFO (CRITICAL FIX) */}
          <section>
            <h2 className="text-lg font-bold mb-4 border-b border-[#A9A9A9] pb-2">
              Contact & Business Info
            </h2>

            {/* 🔥 MACHINE-READABLE ADDRESS */}
            <address className="not-italic space-y-4">
              <p className="font-semibold">Robe by Shamshad</p>

              <p className={`${mutedTextColor} flex gap-2`}>
                <MapPin className="h-4 w-4 mt-1" />
                Niketan, Gulshan 1, Dhaka, Bangladesh
              </p>

              <p className={`${mutedTextColor} flex gap-2`}>
                <Phone className="h-4 w-4 mt-1" />
                <a href="tel:+8801401836480">
                  +880 1401-836480
                </a>
              </p>

              <p className={`${mutedTextColor} flex gap-2`}>
                <Mail className="h-4 w-4 mt-1" />
                <a href="mailto:shamshad.robe@gmail.com">
                  shamshad.robe@gmail.com
                </a>
              </p>
            </address>

            {/* 🔥 AI-READABLE BENEFIT */}
            <p className="text-sm text-[#A9A9A9] mt-4">
              We offer free delivery on your first purchase across Dhaka.
            </p>
          </section>
        </div>

        {/* BOTTOM */}
        <div className="mt-12 pt-8 border-t border-[#A9A9A9] flex flex-col md:flex-row justify-between items-center gap-6">

          {/* SOCIAL */}
          <div className="flex gap-4">
            {[
              { icon: Facebook, href: "https://www.facebook.com/robebyshamshad/" },
              { icon: Linkedin, href: "https://bd.linkedin.com/in/robe-by-shamshad-abb15b293" },
              { icon: Instagram, href: "https://www.instagram.com/robebyshamshad/" },
              { icon: Youtube, href: "https://www.youtube.com/@RobebyShamshad" },
            ].map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${socialBgColor} ${socialHoverBgColor} p-3 rounded-full`}
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>

          {/* COPYRIGHT */}
          <div className="text-center md:text-right">
            <p className="text-[#A9A9A9] text-sm">
              © {currentYear} Robe By Shamshad. All rights reserved.
            </p>

            <div className="flex flex-wrap justify-center md:justify-end gap-4 mt-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                (policy) => (
                  <a
                    key={policy}
                    href={`/${policy.toLowerCase().replace(/ /g, "-")}`}
                    className="text-[#A9A9A9] hover:text-white text-sm"
                  >
                    {policy}
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
