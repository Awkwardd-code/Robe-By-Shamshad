import React from "react";
import EidSlider from "./_components/HomeSlider";
import CategorySlider from "./_components/CategorySlider";
import MostPopularSlider from "./_components/MostPopularSlider";
import BestSellerSlider from "./_components/BestSellerSlider";
import ProductGrid from "./_components/ProductGrid";
import FeaturesGrid from "./_components/FeaturesGrid";
import EidNewsletterPage from "./_components/EidNewsletterPage";

const newsletterData = {
  hero: {
    offerLine: "WINTER SPECIAL : UP TO 25% OFF!",
    brandLine: "ROBE BY SHAMSHAD",
    scopeLine: "MODEST FESTIVE EDITS",
    ctaText: "SHOP OFFERS",
    ctaHref: "/sales",
  },
  intro: {
    heading: "Celebrate Winter with seasonal favorites",
    body: "Explore festive edits, premium fabrics, and limited-time savings curated for you.",
  },
  secondaryBanner: {
    textLeft: "Limited Winter Edit",
    textRight: "Small batch drops, once they are gone they are gone.",
    ctaText: "Shop Eid",
    ctaHref: "/products",
  },
  footer: {
    disclaimer: "Limited time offer",
    unsubscribeHref: "/",
  },
};

const page = () => {
  return (
    <div>
      <EidSlider />
      <CategorySlider title="Shop by Category" />
      <MostPopularSlider />
      {/* <ProductGrid /> */}
      {/* <BestSellerSlider /> */}
      <EidNewsletterPage data={newsletterData} />
      <FeaturesGrid />
    </div>
  );
};

export default page;
