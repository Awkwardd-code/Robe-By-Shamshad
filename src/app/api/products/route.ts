// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/db/client';

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
  gender?: string;
  pricing?: {
    current?: { currency?: string; value?: number | string; unit?: string };
    original?: { currency?: string; value?: number | string; unit?: string };
  };
  inventory?: {
    quantity?: number | string;
    threshold?: number | string;
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
  delivery?: {
    isFree?: boolean;
    charge?: number | string;
    message?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '6');
    const slugParam = searchParams.get('slug')?.trim();

    const db = await connectToDatabase();
    const productsCollection = db.collection('products');

    // Build search query
    const query: Record<string, unknown> = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { 'details.materials': { $regex: search, $options: 'i' } },
        { 'details.features': { $regex: search, $options: 'i' } }
      ];
    }

    const gender = searchParams.get('gender') || '';
    const brandFilters = searchParams.getAll('brand');
    const categoryFilters = searchParams.getAll('category');

    if (gender && gender !== 'all') {
      query.gender = gender;
    }

    if (brandFilters.length > 0) {
      query.brand = { $in: brandFilters };
    }

    if (categoryFilters.length > 0) {
      query.category = { $in: categoryFilters };
    }

    if (slugParam) {
      const slugMatch: Record<string, unknown>[] = [
        { slug: { $regex: `^${escapeRegExp(slugParam)}$`, $options: 'i' } }
      ];
      if (ObjectId.isValid(slugParam)) {
        slugMatch.push({ _id: new ObjectId(slugParam) });
      }
      const slugFilter = { $or: slugMatch };

      if (query.$or) {
        query.$and = [{ $or: query.$or }, slugFilter];
        delete query.$or;
      } else {
        Object.assign(query, slugFilter);
      }
    }

    // If a slug is present we want the single product payload
    if (slugParam) {
      const product = await productsCollection.aggregate([
        { $match: query },
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
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json(
        { product },
        { status: 200 }
      );
    }

    // Get total count for pagination
    const totalCount = await productsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get products with category details
    const products = await productsCollection.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
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
    ]).toArray();

    return NextResponse.json({
      products,
      totalPages,
      currentPage: page,
      totalCount,
      pageLimit: limit
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch products';
    console.error('GET products error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await connectToDatabase();
    const productsCollection = db.collection('products');
    
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

    // Check if product with same SKU already exists
    if (sku?.trim()) {
      const existingSku = await productsCollection.findOne({
        sku: sku.trim()
      });

      if (existingSku) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Check if barcode is unique
    if (barcode?.trim()) {
      const existingBarcode = await productsCollection.findOne({
        barcode: barcode.trim()
      });

      if (existingBarcode) {
        return NextResponse.json(
          { error: 'Product with this barcode already exists' },
          { status: 409 }
        );
      }
    }

    // Check if category exists
    const categoriesCollection = db.collection('categories');
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

    const resolvedSku = ensureSlugWithCode(name, sku);
    const resolvedSlug = ensureSlugWithCode(name, slug || resolvedSku);

    // Auto-generate SKU if not provided
    const finalSku = resolvedSku;
    
    // Ensure slug is set (allow overriding from request)
    const finalSlug = resolvedSlug;

    // Auto-generate barcode if not provided
    const finalBarcode = barcode?.trim() || `RBS${Date.now().toString().slice(-8)}`;

    // Calculate discount percentage
    const discountPercentage = calculateDiscountPercentage(
      safeNumber(pricing?.original?.value),
      safeNumber(pricing?.current?.value)
    );

    const genderValue = normalizeGender(gender);

    // Process delivery information
    const deliveryCharge = safeNumber(delivery?.charge);
    const deliveryIsFree = delivery?.isFree ?? true;
    const finalDelivery = {
      isFree: deliveryIsFree,
      charge: deliveryIsFree ? 0 : deliveryCharge,
      message: delivery?.message || formatDeliveryMessage(deliveryIsFree, deliveryCharge, pricing?.current?.currency || 'BDT')
    };

    const newProduct = {
      name: name.trim(),
      brand: brand.trim(),
      slug: finalSlug,
      category: category.trim(),
      subcategory: subcategory?.trim() || '',
      sku: finalSku,
      barcode: finalBarcode,
      gender: genderValue,
      description: description?.trim() || '',
      summary: summary?.trim() || '',
      pricing: {
        current: {
          currency: pricing?.current?.currency || 'BDT',
          value: safeNumber(pricing?.current?.value),
          unit: pricing?.current?.unit || '1 piece'
        },
        original: {
          currency: pricing?.original?.currency || 'BDT',
          value: safeNumber(pricing?.original?.value),
          unit: pricing?.original?.unit || '1 piece'
        },
        discountPercentage
      },
      inventory: {
        quantity: safeNumber(inventory?.quantity),
        threshold: safeNumber(inventory?.threshold, 5),
        status: inventory?.status || 'in_stock'
      },
      ratings: {
        averageRating: 0,
        totalReviews: 0
      },
      media: {
        thumbnail: media?.thumbnail || '',
        gallery: Array.isArray(media?.gallery) ? media.gallery : []
      },
      details: {
        materials: Array.isArray(details?.materials) ? details.materials : [],
        features: Array.isArray(details?.features) ? details.features : [],
        careInstructions: details?.careInstructions?.trim() || '',
        benefits: Array.isArray(details?.benefits) ? details.benefits : [],
        warnings: details?.warnings?.trim() || '',
        certifications: Array.isArray(details?.certifications) ? details.certifications : [],
        sizes: Array.isArray(details?.sizes) ? details.sizes : [],
        colors: Array.isArray(details?.colors) ? details.colors : []
      },
      delivery: finalDelivery,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await productsCollection.insertOne(newProduct);
    
    const createdProduct = await productsCollection.findOne(
      { _id: result.insertedId }
    );

    return NextResponse.json(createdProduct, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    console.error('POST product error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Helper functions
const SLUG_CODE_LENGTH = 10;
const SLUG_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateRandomCode(length: number = SLUG_CODE_LENGTH): string {
  let randomString = '';
  for (let i = 0; i < length; i++) {
    randomString += SLUG_CODE_CHARS.charAt(Math.floor(Math.random() * SLUG_CODE_CHARS.length));
  }
  return randomString;
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function extractSlugCode(value: string): string | null {
  const match = value.trim().toLowerCase().match(new RegExp(`-([a-z0-9]{${SLUG_CODE_LENGTH}})$`));
  return match?.[1] ?? null;
}

function buildSlugWithCode(name: string, existingValue?: string): string {
  const base = slugifyName(name) || 'robe-by-shamshad';
  const existingCode = existingValue ? extractSlugCode(existingValue) : null;
  const code = existingCode ?? generateRandomCode();
  return `${base}-${code}`;
}

function ensureSlugWithCode(name: string, value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return buildSlugWithCode(name);
  if (extractSlugCode(trimmed)) {
    return trimmed.toLowerCase();
  }
  const base = slugifyName(trimmed) || slugifyName(name) || 'robe-by-shamshad';
  return `${base}-${generateRandomCode()}`;
}

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDeliveryMessage(isFree: boolean, charge: number, currency: string): string {
  return isFree ? 'Free Delivery' : `Delivery Charge: ${charge} ${currency}`;
}
