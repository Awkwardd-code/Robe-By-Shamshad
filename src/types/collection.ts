// types/collection.ts
export interface CollectionItem {
  type: 'product' | 'combo';
  refId: string;
  name: string;
  price: number;
  thumbnail: string;
  slug?: string;
  product?: {
    _id: string;
    name: string;
    brand: string;
    category: string;
    pricing: {
      current: { currency: string; value: number };
      original: { currency: string; value: number };
    };
    inventory: {
      quantity: number;
      status: string;
    };
    media: {
      thumbnail: string;
      gallery: string[];
    };
    slug: string;
    tags: string[];
  };
  combo?: {
    _id: string;
    name: string;
    description: string;
    slug: string;
    pricing: {
      originalTotal: number;
      discountedPrice: number;
      discountPercentage: number;
      currency: string;
    };
    thumbnail: string;
    gallery: string[];
    tags: string[];
    inventory: {
      status: 'active' | 'inactive' | 'sold_out';
    };
  };
}

export interface Collection {
  _id: string;
  bannerImage: string;
  bannerTitle: string;
  bannerDescription: string;
  slug: string;
  tags: string[];
  collections: CollectionItem[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  sortOrder: number;
  visibility: 'public' | 'private' | 'scheduled';
  scheduledDate?: string;
  views: number;
  clicks: number;
}

export interface CollectionForm {
  _id?: string;
  bannerImage: string;
  bannerTitle: string;
  bannerDescription: string;
  slug: string;
  tags: string;
  collections: CollectionItem[];
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  sortOrder: number;
  visibility: 'public' | 'private' | 'scheduled';
  scheduledDate?: string;
}