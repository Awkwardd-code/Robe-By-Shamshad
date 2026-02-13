/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/combo-offers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/client';
import { ObjectId } from 'mongodb';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const makeSlugFilter = (value: string) => ({
  slug: { $regex: `^${escapeRegExp(value)}$`, $options: "i" }
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const trimmed = id?.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Missing combo offer identifier" },
        { status: 400 }
      );
    }

    const isObjectId = ObjectId.isValid(trimmed);

    const db = await connectToDatabase();
    const comboOffersCollection = db.collection('combo_offers');

    const comboOffer = await comboOffersCollection.aggregate([
      {
        $match: isObjectId
          ? { _id: new ObjectId(trimmed) }
          : makeSlugFilter(trimmed)
      },
      {
        $lookup: {
          from: 'products',
          let: { productIds: { $map: { input: '$products', as: 'product', in: '$$product.productId' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$productIds'] } } },
            { $project: { 
              _id: 1,
              name: 1, 
              brand: 1, 
              category: 1,
              pricing: 1,
              inventory: 1,
              media: 1
            }}
          ],
          as: 'productDetails'
        }
      },
      {
        $addFields: {
          products: {
            $map: {
              input: '$products',
              as: 'comboProduct',
              in: {
                $mergeObjects: [
                  '$$comboProduct',
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$productDetails',
                            as: 'productDetail',
                            cond: { $eq: ['$$productDetail._id', '$$comboProduct.productId'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          },
          // Calculate if offer is active
          isActive: {
            $and: [
              { $lte: [{ $toDate: '$validity.startDate' }, new Date()] },
              { $gte: [{ $toDate: '$validity.endDate' }, new Date()] },
              { $eq: ['$inventory.status', 'active'] }
            ]
          },
          // Calculate remaining stock
          remainingStock: {
            $subtract: ['$inventory.totalStock', '$inventory.soldCount']
          },
          // Calculate savings
          savings: {
            $subtract: ['$pricing.originalTotal', '$pricing.discountedPrice']
          }
        }
      }
    ]).next();

    if (!comboOffer) {
      return NextResponse.json(
        { error: 'Combo offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(comboOffer, { status: 200 });

  } catch (error: any) {
    console.error('GET combo offer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch combo offer' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid combo offer ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const comboOffersCollection = db.collection('combo_offers');
    const productsCollection = db.collection('products');
    
    const body = await request.json();
    const {
      name,
      description,
      slug,
      products,
      pricing,
      validity,
      tags,
      features,
      thumbnail,
      gallery,
      delivery
    } = body;

    // Check if combo exists
    const existingCombo = await comboOffersCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!existingCombo) {
      return NextResponse.json(
        { error: 'Combo offer not found' },
        { status: 404 }
      );
    }

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Combo offer name is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'At least one product is required for the combo' },
        { status: 400 }
      );
    }

    const normalizedSlug = ensureSlugSuffix(
      slug?.trim() || existingCombo.slug || generateSlug(name.trim()),
      existingCombo.slug
    );

    // Check if slug is unique (excluding current combo)
    if (normalizedSlug && normalizedSlug !== existingCombo.slug) {
      const duplicateSlug = await comboOffersCollection.findOne({
        slug: normalizedSlug,
        _id: { $ne: new ObjectId(id) }
      });

      if (duplicateSlug) {
        return NextResponse.json(
          { error: 'Another combo offer with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Validate products exist
    const productIds = products.map(p => new ObjectId(p.productId));
    const existingProducts = await productsCollection.find({
      _id: { $in: productIds }
    }).toArray();

    if (existingProducts.length !== products.length) {
      return NextResponse.json(
        { error: 'One or more products not found' },
        { status: 404 }
      );
    }

    // Validate dates
    const startDate = new Date(validity.startDate);
    const endDate = new Date(validity.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid dates provided' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Calculate discount if not provided
    let discountPercentage = pricing.discountPercentage;
    if (!discountPercentage && pricing.originalTotal > 0 && pricing.discountedPrice > 0) {
      discountPercentage = Math.round(((pricing.originalTotal - pricing.discountedPrice) / pricing.originalTotal) * 100);
    }

    // Validate delivery data
    const deliveryData = {
      isFree: delivery?.isFree ?? true,
      charge: delivery?.isFree ? 0 : (delivery?.charge ?? 0),
      message: delivery?.isFree 
        ? 'Free Delivery on Fashion Orders' 
        : `Delivery Charge: ${delivery?.charge ?? 0} ${pricing.currency || 'BDT'}`
    };

    // Process tags and features
    const tagsArray = Array.isArray(tags) 
      ? tags 
      : tags?.split(',').map((t: string) => t.trim()).filter((t: string) => t) || [];
    
    const featuresArray = Array.isArray(features)
      ? features
      : features?.split(',').map((f: string) => f.trim()).filter((f: string) => f) || [];

    const updateData = {
      name: name.trim(),
      description: description?.trim() || '',
      slug: normalizedSlug,
      products: products.map(p => ({
        productId: new ObjectId(p.productId),
        quantity: Math.max(1, parseInt(p.quantity) || 1)
      })),
      pricing: {
        originalTotal: Math.max(0, parseFloat(pricing.originalTotal) || 0),
        discountedPrice: Math.max(0, parseFloat(pricing.discountedPrice) || 0),
        discountPercentage: Math.max(0, Math.min(100, discountPercentage || 0)),
        currency: pricing.currency || 'BDT'
      },
      validity: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        isActive: existingCombo.validity?.isActive ?? true
      },
      tags: tagsArray,
      features: featuresArray,
      thumbnail: thumbnail?.trim() || existingCombo.thumbnail || '',
      gallery: Array.isArray(gallery) ? gallery : existingCombo.gallery || [],
      delivery: deliveryData,
      updatedAt: new Date()
    };

    const result = await comboOffersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Combo offer not found' },
        { status: 404 }
      );
    }

    // Get updated combo with product details
    const updatedCombo = await comboOffersCollection.aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'products',
          let: { productIds: { $map: { input: '$products', as: 'product', in: '$$product.productId' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$productIds'] } } },
            { $project: { 
              name: 1, 
              brand: 1, 
              category: 1,
              pricing: 1,
              inventory: 1,
              media: 1
            }}
          ],
          as: 'productDetails'
        }
      },
      {
        $addFields: {
          products: {
            $map: {
              input: '$products',
              as: 'comboProduct',
              in: {
                $mergeObjects: [
                  '$$comboProduct',
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$productDetails',
                            as: 'productDetail',
                            cond: { $eq: ['$$productDetail._id', '$$comboProduct.productId'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ]).next();

    return NextResponse.json(updatedCombo, { status: 200 });

  } catch (error: any) {
    console.error('PUT combo offer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update combo offer' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid combo offer ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const comboOffersCollection = db.collection('combo_offers');

    // Check if combo exists
    const combo = await comboOffersCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!combo) {
      return NextResponse.json(
        { error: 'Combo offer not found' },
        { status: 404 }
      );
    }

    // Check for dependent orders (optional)
    const ordersCollection = db.collection('orders');
    const hasOrders = await ordersCollection.findOne({
      'items.comboOfferId': new ObjectId(id)
    });

    if (hasOrders) {
      return NextResponse.json(
        { 
          error: 'Cannot delete combo offer with existing orders',
          warning: 'Consider deactivating the combo instead'
        },
        { status: 409 }
      );
    }

    // Delete combo
    const result = await comboOffersCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Combo offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Combo offer deleted successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('DELETE combo offer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete combo offer' },
      { status: 500 }
    );
  }
}

// Helper functions
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generateRandomString(length = 10): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function resolveSlugSuffix(existingSlug?: string) {
  if (!existingSlug) return generateRandomString(10);
  const match = existingSlug.match(/(?:-|_)([a-z0-9]{10})$/);
  return match ? match[1] : generateRandomString(10);
}

function ensureSlugSuffix(value: string, existingSlug?: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/(?:-|_)[a-z0-9]{10}$/.test(trimmed)) return trimmed;
  const separator = trimmed.includes("_") && !trimmed.includes("-") ? "_" : "-";
  const suffix = resolveSlugSuffix(existingSlug);
  const base = trimmed.replace(/[-_]+$/, "");
  return `${base}${separator}${suffix}`;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
