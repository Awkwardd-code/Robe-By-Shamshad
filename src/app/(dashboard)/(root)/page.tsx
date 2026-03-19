import type { Metadata } from "next";
import EidSlider from "./_components/HomeSlider";
import CategorySlider from "./_components/CategorySlider";
import MostPopularSlider from "./_components/MostPopularSlider";
import FeaturesGrid from "./_components/FeaturesGrid";
import EidNewsletterPage from "./_components/EidNewsletterPage";

export const metadata: Metadata = {
  title: "Robe by Shamshad | Premium Clothing & Apparel in Dhaka, Bangladesh",
  description:
    "Robe by Shamshad is a premium clothing brand in Dhaka, Bangladesh, operating under Bites Shop Company Bangladesh Ltd. Explore modern apparel collections for men and women.",
  alternates: {
    canonical: "/",
  },
};

const page = () => {
  return (
    <div>
      <EidSlider />
      <CategorySlider title="Shop by Category" />
      <MostPopularSlider />
      <EidNewsletterPage />
      <FeaturesGrid />
    </div>
  );
};

export default page;
