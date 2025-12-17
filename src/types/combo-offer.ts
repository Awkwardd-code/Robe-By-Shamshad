// types/combo-offer.ts
export interface ComboProduct {
  productId: string;
  quantity: number;
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
    };
  };
}

export interface ComboPricing {
  originalTotal: number;
  discountedPrice: number;
  discountPercentage: number;
  currency: string;
}

export interface ComboInventory {
  totalStock: number;
  soldCount: number;
  status: 'active' | 'inactive' | 'sold_out';
}

export interface ComboValidity {
  startDate: string;
  endDate: string;
}

export interface ComboDelivery {
  isFree: boolean;
  charge?: number;
  message?: string;
}

export interface ComboOffer {
  _id: string;
  name: string;
  description: string;
  slug: string;
  products: ComboProduct[];
  pricing: ComboPricing;
  inventory: ComboInventory;
  validity: ComboValidity;
  tags: string[];
  features: string[];
  thumbnail: string;
  gallery: string[];
  delivery: ComboDelivery;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  remainingStock?: number;
  savings?: number;
}

export interface ComboForm {
  _id?: string;
  name: string;
  description: string;
  slug: string;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
  pricing: ComboPricing;
  validity: ComboValidity;
  tags: string;
  features: string;
  thumbnail: string;
  gallery: string[];
  delivery: ComboDelivery;
}