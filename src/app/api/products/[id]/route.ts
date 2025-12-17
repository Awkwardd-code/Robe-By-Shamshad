// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/client';
import { ObjectId } from 'mongodb';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ProductRequestBody {
  name?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  slug?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  summary?: string;
  pricing?: {
    current?: { currency?: string; value?: string | number; unit?: string };
    original?: { currency?: string; value?: string | number; unit?: string };
  };
  inventory?: {
    quantity?: string | number;
    threshold?: string | number;
    status?: string;
  };
  media?: {
    thumbnail?: string;
    gallery?: string[];
  };
  details?: {
    materials?: string[];
    features?: string[];
    careInstructions?: string;
    benefits?: string[];
    warnings?: string;
    certifications?: string[];
    sizes?: string[];
    colors?: string[];
  };
  gender?: string;
  delivery?: {
    isFree?: boolean;
    charge?: number | string;
    message?: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return NextResponse.json(
        { error: 'Invalid product identifier' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const productsCollection = db.collection('products');

    const matchFilter: Record<string, unknown> = ObjectId.isValid(trimmedId)
      ? { _id: new ObjectId(trimmedId) }
      : { slug: trimmedId };

    const product = await productsCollection.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: 'slug',
          as: 'categoryDetails'
        }
      },
      {
        $addFields: {
          categoryDetails: { $arrayElemAt: ['$categoryDetails', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          slug: 1,
          name: 1,
          brand: 1,
          category: 1,
          subcategory: 1,
          sku: 1,
          barcode: 1,
          description: 1,
          summary: 1,
          gender: 1,
          pricing: 1,
          inventory: 1,
          ratings: 1,
          media: 1,
          details: 1,
          delivery: 1,
          categoryName: '$categoryDetails.name',
          badge: 1,
          origin: 1,
          harvestWindow: 1,
          tasteNotes: 1,
          tags: 1,
          storage: 1,
          isCombo: 1,
          validity: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]).next();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch product';
    console.error('GET product error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const productsCollection = db.collection('products');
    const categoriesCollection = db.collection('categories');
    
    const body = await request.json() as ProductRequestBody;
    const {
      name,
      brand,
      category,
      subcategory,
      sku,
      barcode,
      slug,
      description,
      summary,
      pricing,
      inventory,
      media,
      details,
      gender,
      delivery
    } = body;

    // Check if product exists
    const existingProduct = await productsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!brand?.trim()) {
      return NextResponse.json(
        { error: 'Brand is required' },
        { status: 400 }
      );
    }

    if (!category?.trim()) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Check if SKU is unique (excluding current product)
    if (sku?.trim() && sku.trim() !== existingProduct.sku) {
      const duplicateSku = await productsCollection.findOne({
        sku: sku.trim(),
        _id: { $ne: new ObjectId(id) }
      });

      if (duplicateSku) {
        return NextResponse.json(
          { error: 'Another product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Check if barcode is unique (excluding current product)
    if (barcode?.trim() && barcode.trim() !== existingProduct.barcode) {
      const duplicateBarcode = await productsCollection.findOne({
        barcode: barcode.trim(),
        _id: { $ne: new ObjectId(id) }
      });

      if (duplicateBarcode) {
        return NextResponse.json(
          { error: 'Another product with this barcode already exists' },
          { status: 409 }
        );
      }
    }

    // Check if category exists
    const categoryExists = await categoriesCollection.findOne({
      $or: [
        { slug: category.trim() },
        { name: category.trim() }
      ]
    });

    if (!categoryExists) {
      return NextResponse.json(
        { error: 'Category does not exist' },
        { status: 404 }
      );
    }

    // Calculate discount percentage
    const discountPercentage = calculateDiscountPercentage(
      safeNumber(pricing?.original?.value),
      safeNumber(pricing?.current?.value)
    );

    const genderValue = normalizeGender(gender?.trim() || existingProduct.gender);

    const resolvedSlug =
      slug?.trim() || existingProduct.slug || generateSlug(name);

    // Process delivery information
    const deliveryCharge = safeNumber(delivery?.charge);
    const deliveryIsFree = delivery?.isFree ?? existingProduct.delivery?.isFree ?? true;
    const finalDelivery = {
      isFree: deliveryIsFree,
      charge: deliveryIsFree ? 0 : deliveryCharge,
      message: delivery?.message || existingProduct.delivery?.message || 
        formatDeliveryMessage(deliveryIsFree, deliveryCharge, pricing?.current?.currency || existingProduct.pricing?.current?.currency || 'BDT')
    };

    const updateData = {
      name: name.trim(),
      brand: brand.trim(),
      slug: resolvedSlug,
      category: category.trim(),
      subcategory: subcategory?.trim() || '',
      gender: genderValue,
      sku: sku?.trim() || existingProduct.sku,
      barcode: barcode?.trim() || existingProduct.barcode,
      description: description?.trim() || '',
      summary: summary?.trim() || '',
      pricing: {
        current: {
          currency: pricing?.current?.currency || existingProduct.pricing?.current?.currency || 'BDT',
          value: safeNumber(pricing?.current?.value),
          unit: pricing?.current?.unit || existingProduct.pricing?.current?.unit || '1 piece'
        },
        original: {
          currency: pricing?.original?.currency || existingProduct.pricing?.original?.currency || 'BDT',
          value: safeNumber(pricing?.original?.value),
          unit: pricing?.original?.unit || existingProduct.pricing?.original?.unit || '1 piece'
        },
        discountPercentage
      },
      inventory: {
        quantity: safeNumber(inventory?.quantity, existingProduct.inventory?.quantity || 0),
        threshold: safeNumber(inventory?.threshold, existingProduct.inventory?.threshold || 5),
        status: inventory?.status || existingProduct.inventory?.status || 'in_stock'
      },
      media: {
        thumbnail: media?.thumbnail || existingProduct.media?.thumbnail || '',
        gallery: Array.isArray(media?.gallery) ? media.gallery : existingProduct.media?.gallery || []
      },
      details: {
        materials: Array.isArray(details?.materials) ? details.materials : existingProduct.details?.materials || [],
        features: Array.isArray(details?.features) ? details.features : existingProduct.details?.features || [],
        careInstructions: details?.careInstructions?.trim() || existingProduct.details?.careInstructions || '',
        benefits: Array.isArray(details?.benefits) ? details.benefits : existingProduct.details?.benefits || [],
        warnings: details?.warnings?.trim() || existingProduct.details?.warnings || '',
        certifications: Array.isArray(details?.certifications) ? details.certifications : existingProduct.details?.certifications || [],
        sizes: Array.isArray(details?.sizes) ? details.sizes : existingProduct.details?.sizes || [],
        colors: Array.isArray(details?.colors) ? details.colors : existingProduct.details?.colors || []
      },
      delivery: finalDelivery,
      updatedAt: new Date()
    };

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const updatedProduct = await productsCollection.findOne(
      { _id: new ObjectId(id) }
    );

    return NextResponse.json(updatedProduct, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    console.error('PUT product error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const productsCollection = db.collection('products');

    // Check if product exists
    const product = await productsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check for dependent orders or other references
    const ordersCollection = db.collection('orders');
    const hasOrders = await ordersCollection.findOne({
      'items.productId': new ObjectId(id)
    });

    if (hasOrders) {
      return NextResponse.json(
        { 
          error: 'Cannot delete product with existing orders',
          warning: 'Product has been ordered before. Consider marking as discontinued instead.'
        },
        { status: 409 }
      );
    }

    // Delete product
    const result = await productsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { status: 200 }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete product';
    console.error('DELETE product error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateDiscountPercentage(original: number, current: number): number {
  if (original <= 0 || current >= original) return 0;
  return Math.round(((original - current) / original) * 100);
}

function safeNumber(value?: string | number, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeGender(value?: string): 'men' | 'women' | 'unisex' {
  if (!value) return 'unisex';
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'unisex';
  const maleIdentifiers = ['men', 'men\'s', 'man', 'male', 'masculine'];
  const femaleIdentifiers = ['women', 'women\'s', 'woman', 'female', 'feminine'];
  if (maleIdentifiers.includes(normalized)) {
    return 'men';
  }
  if (femaleIdentifiers.includes(normalized)) {
    return 'women';
  }
  return 'unisex';
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatDeliveryMessage(isFree: boolean, charge: number, currency: string): string {
  return isFree ? 'Free Delivery' : `Delivery Charge: ${charge} ${currency}`;
}