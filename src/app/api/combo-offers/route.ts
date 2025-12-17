/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/combo-offers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/client';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '6');
    const slugParam = searchParams.get('slug')?.trim();
    const status = searchParams.get('status')?.trim();
    const category = searchParams.get('category')?.trim();

    const db = await connectToDatabase();
    const comboOffersCollection = db.collection('combo_offers');

    // Build search query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { features: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status) {
      query['inventory.status'] = status;
    }

    // Filter by category (checking tags)
    if (category) {
      query.tags = { $regex: category, $options: 'i' };
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

    // Get total count for pagination
    const totalCount = await comboOffersCollection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get combo offers with product details
    const basePipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      // Lookup products with details
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
      // Add product details to each product in combo
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
          // Calculate remaining stock
          'inventory.remaining': {
            $subtract: ['$inventory.totalStock', '$inventory.soldCount']
          },
          // Calculate if offer is active based on dates and status
          'validity.isActive': {
            $and: [
              { $lte: [{ $toDate: '$validity.startDate' }, new Date()] },
              { $gte: [{ $toDate: '$validity.endDate' }, new Date()] },
              { $eq: ['$inventory.status', 'active'] }
            ]
          },
          // Calculate savings
          savings: {
            $subtract: ['$pricing.originalTotal', '$pricing.discountedPrice']
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          slug: 1,
          products: 1,
          pricing: 1,
          inventory: 1,
          validity: 1,
          tags: 1,
          features: 1,
          thumbnail: 1,
          gallery: 1,
          delivery: 1,
          createdAt: 1,
          updatedAt: 1,
          savings: 1,
          isActive: '$validity.isActive'
        }
      }
    ];

    if (slugParam) {
      const offer = await comboOffersCollection.aggregate([
        ...basePipeline,
        { $limit: 1 }
      ]).next();

      if (!offer) {
        return NextResponse.json({ error: 'Combo offer not found' }, { status: 404 });
      }

      return NextResponse.json({ offer }, { status: 200 });
    }

    const offers = await comboOffersCollection.aggregate([
      ...basePipeline,
      { $skip: skip },
      { $limit: limit }
    ]).toArray();

    return NextResponse.json({
      offers,
      totalPages,
      currentPage: page,
      totalCount,
      pageLimit: limit
    }, { status: 200 });

  } catch (error: any) {
    console.error('GET combo offers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch combo offers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    // Check if slug already exists
    const generatedSlug = slug?.trim() || generateSlug(name.trim());
    
    const existingSlug = await comboOffersCollection.findOne({
      slug: generatedSlug
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Combo offer with this slug already exists' },
        { status: 409 }
      );
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

    // Validate and format delivery data
    const deliveryData = {
      isFree: delivery?.isFree ?? true,
      charge: delivery?.isFree ? 0 : (delivery?.charge ?? 0),
      message: delivery?.message || (
        delivery?.isFree 
          ? 'Free Delivery on Fashion Orders' 
          : `Delivery Charge: ${delivery?.charge ?? 0} ${pricing.currency || 'BDT'}`
      )
    };

    // Process tags and features
    const tagsArray = Array.isArray(tags) 
      ? tags 
      : tags?.split(',').map((t: string) => t.trim()).filter((t: string) => t) || [];
    
    const featuresArray = Array.isArray(features)
      ? features
      : features?.split(',').map((f: string) => f.trim()).filter((f: string) => f) || [];

    const newComboOffer = {
      name: name.trim(),
      description: description?.trim() || '',
      slug: generatedSlug,
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
      inventory: {
        totalStock: parseInt(body.inventory?.totalStock) || 100,
        soldCount: 0,
        status: 'active'
      },
      validity: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        isActive: true
      },
      tags: tagsArray,
      features: featuresArray,
      thumbnail: thumbnail?.trim() || '',
      gallery: Array.isArray(gallery) ? gallery : [],
      delivery: deliveryData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await comboOffersCollection.insertOne(newComboOffer);
    
    // Fetch the created combo with product details
    const createdOffer = await comboOffersCollection.aggregate([
      { $match: { _id: result.insertedId } },
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

    return NextResponse.json(createdOffer, { status: 201 });

  } catch (error: any) {
    console.error('POST combo offer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create combo offer' },
      { status: 500 }
    );
  }
}

// Helper functions
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}