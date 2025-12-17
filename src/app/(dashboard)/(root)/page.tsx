import React from 'react'
import EidSlider from './_components/HomeSlider'
import CategorySlider, { type CategoryItem } from './_components/CategorySlider'
import MostPopularSlider from './_components/MostPopularSlider'
import BestSellerSlider from './_components/BestSellerSlider'
import ProductGrid from './_components/ProductGrid'
import FeaturesGrid from './_components/FeaturesGrid'

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: "wearables",
    name: "Wearables",
    slug: "wearables",
    image:
      "https://images.unsplash.com/photo-1445233247825-8c9a5f3aa13d?w=600&h=600&fit=crop",
    productCount: 132,
    description: "Smartwatches, fitness trackers, and health wearables.",
  },
  {
    id: "home-office",
    name: "Home & Office",
    slug: "home-office",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=600&h=600&fit=crop",
    productCount: 89,
    description: "Ergonomic gear built for productivity.",
  },
  {
    id: "gaming",
    name: "Gaming",
    slug: "gaming",
    image:
      "https://images.unsplash.com/photo-1511512578047-c895f94a7f24?w=600&h=600&fit=crop",
    productCount: 74,
    description: "Consoles, accessories, and high-performance rig upgrades.",
  },
  {
    id: "audio",
    name: "Audio",
    slug: "audio",
    image:
      "https://images.unsplash.com/photo-1518544881830-9c4668f6d8b2?w=600&h=600&fit=crop",
    productCount: 58,
    description: "Headphones, earbuds, and premium speakers.",
  },
];

const page = () => {
  return (
    <div>
      <EidSlider />
      <CategorySlider categories={DEFAULT_CATEGORIES} />
      <MostPopularSlider />
      <ProductGrid />
      <BestSellerSlider />
      <FeaturesGrid />
    </div>
  )
}

export default page
