import type { Metadata } from "next";
import ContactPage from "./_components/Contact";

export const metadata: Metadata = {
  title: "Contact Robe by Shamshad | Dhaka, Bangladesh",
  description:
    "Contact Robe by Shamshad in Dhaka, Bangladesh for product inquiries, order support, and styling assistance.",
  alternates: {
    canonical: "/contact",
  },
};

const page = () => {
  return (
    <div>
      <ContactPage />
    </div>
  );
};

export default page;
