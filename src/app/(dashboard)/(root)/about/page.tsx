import type { Metadata } from "next";
import AboutPage from "./_components/About";

export const metadata: Metadata = {
  title: "About Robe by Shamshad | Dhaka Fashion Brand",
  description:
    "Learn about Robe by Shamshad, a premium clothing brand in Dhaka, Bangladesh, and its craftsmanship-first approach to modern fashion.",
  alternates: {
    canonical: "/about",
  },
};

const page = () => {
  return (
    <div>
      <AboutPage />
    </div>
  );
};

export default page;
