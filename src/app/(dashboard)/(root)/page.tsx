import React from "react";
import EidSlider from "./_components/HomeSlider";
import CategorySlider from "./_components/CategorySlider";
import MostPopularSlider from "./_components/MostPopularSlider";
import BestSellerSlider from "./_components/BestSellerSlider";
import ProductGrid from "./_components/ProductGrid";
import FeaturesGrid from "./_components/FeaturesGrid";
import EidNewsletterPage from "./_components/EidNewsletterPage";

const page = () => {
  return (
    <div>
      <EidSlider />
      <CategorySlider title="Shop by Category" />
      <MostPopularSlider />
      {/* <ProductGrid /> */}
      {/* <BestSellerSlider /> */}
      <EidNewsletterPage />
      <FeaturesGrid />
    </div>
  );
};

export default page;
