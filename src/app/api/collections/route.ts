/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/collections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/client';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '8');
    const status = searchParams.get('status') || '';
    const slug = searchParams.get('slug') || '';

    const db = await connectToDatabase();
    const collectionsCollection = db.collection('collections');

    // Build search query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { bannerTitle: { $regex: search, $options: 'i' } },
        { bannerDescription: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    if (slug) {
      query.slug = slug;
    }

    // Get total count for pagination
    const totalCount = await collectionsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get collections with product/combo details
    const collections = await collectionsCollection.aggregate([
      { $match: query },
      { $sort: { sortOrder: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Lookup product details
      {
        $lookup: {
          from: 'products',
          let: { productIds: { 
            $map: { 
              input: { 
                $filter: { 
                  input: '$collections', 
                  as: 'item', 
                  cond: { $eq: ['$$item.type', 'product'] } 
                } 
              }, 
              as: 'product', 
              in: '$$product.refId' 
            } 
          } },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$productIds'] } } },
            { $project: { 
              _id: 1,
              name: 1, 
              brand: 1, 
              category: 1,
              pricing: 1,
              inventory: 1,
              media: 1,
              slug: 1,
              tags: 1
            }}
          ],
          as: 'productDetails'
        }
      },
      // Lookup combo details
      {
        $lookup: {
          from: 'combo_offers',
          let: { comboIds: { 
            $map: { 
              input: { 
                $filter: { 
                  input: '$collections', 
                  as: 'item', 
                  cond: { $eq: ['$$item.type', 'combo'] } 
                } 
              }, 
              as: 'combo', 
              in: '$$combo.refId' 
            } 
          } },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$comboIds'] } } },
            { $project: { 
              _id: 1,
              name: 1,
              description: 1,
              slug: 1,
              pricing: 1,
              thumbnail: 1,
              tags: 1,
              inventory: 1
            }}
          ],
          as: 'comboDetails'
        }
      },
      // Combine collections with details
      {
        $addFields: {
          collections: {
            $map: {
              input: '$collections',
              as: 'item',
              in: {
                $mergeObjects: [
                  '$$item',
                  {
                    $cond: {
                      if: { $eq: ['$$item.type', 'product'] },
                      then: {
                        product: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$productDetails',
                                as: 'productDetail',
                                cond: { $eq: ['$$productDetail._id', '$$item.refId'] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      else: {
                        combo: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$comboDetails',
                                as: 'comboDetail',
                                cond: { $eq: ['$$comboDetail._id', '$$item.refId'] }
                              }
                            },
                            0
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          bannerImage: 1,
          bannerTitle: 1,
          bannerDescription: 1,
          slug: 1,
          tags: 1,
          collections: 1,
          createdAt: 1,
          updatedAt: 1,
          status: 1,
          featured: 1,
          sortOrder: 1,
          visibility: 1,
          scheduledDate: 1,
          views: 1,
          clicks: 1
        }
      }
    ]).toArray();

    return NextResponse.json({
      collections,
      totalPages,
      currentPage: page,
      totalCount,
      pageLimit: limit
    }, { status: 200 });

  } catch (error: any) {
    console.error('GET collections error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fashion collections' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await connectToDatabase();
    const collectionsCollection = db.collection('collections');
    const productsCollection = db.collection('products');
    const combosCollection = db.collection('combo_offers');
    
    const body = await request.json();
    const {
      bannerImage,
      bannerTitle,
      bannerDescription,
      slug,
      tags,
      collections: collectionItems,
      status,
      featured,
      sortOrder,
      visibility,
      scheduledDate
    } = body;

    // Validation


    if (!bannerImage) {
      return NextResponse.json(
        { error: 'Banner image is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(collectionItems) || collectionItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one fashion item is required for the collection' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    if (slug?.trim()) {
      const existingSlug = await collectionsCollection.findOne({
        slug: slug.trim()
      });

      if (existingSlug) {
        return NextResponse.json(
          { error: 'Collection with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Validate collection items exist
    const productIds = collectionItems
      .filter(item => item.type === 'product')
      .map(item => new ObjectId(item.refId));
    
    const comboIds = collectionItems
      .filter(item => item.type === 'combo')
      .map(item => new ObjectId(item.refId));

    // Check products exist
    if (productIds.length > 0) {
      const existingProducts = await productsCollection.find({
        _id: { $in: productIds }
      }).toArray();

      if (existingProducts.length !== productIds.length) {
        return NextResponse.json(
          { error: 'One or more products not found' },
          { status: 404 }
        );
      }
    }

    // Check combos exist
    if (comboIds.length > 0) {
      const existingCombos = await combosCollection.find({
        _id: { $in: comboIds }
      }).toArray();

      if (existingCombos.length !== comboIds.length) {
        return NextResponse.json(
          { error: 'One or more combo offers not found' },
          { status: 404 }
        );
      }
    }

    // Validate scheduled date if visibility is scheduled
    if (visibility === 'scheduled' && scheduledDate) {
      const scheduled = new Date(scheduledDate);
      if (isNaN(scheduled.getTime()) || scheduled <= new Date()) {
        return NextResponse.json(
          { error: 'Invalid scheduled date. Must be a future date' },
          { status: 400 }
        );
      }
    }

    const newCollection = {
      bannerImage: bannerImage.trim(),
      bannerTitle: bannerTitle.trim(),
      bannerDescription: bannerDescription?.trim() || '',
      slug: slug.trim(),
      tags: Array.isArray(tags)
        ? tags
        : tags?.split(',').map((t: string) => t.trim()).filter((t: string) => t) || [],
      collections: collectionItems.map(item => ({
        type: item.type,
        refId: new ObjectId(item.refId),
        name: item.name,
        price: item.price,
        thumbnail: item.thumbnail,
        slug: item.slug
      })),
      status: status || 'draft',
      featured: featured || false,
      sortOrder: sortOrder || 0,
      visibility: visibility || 'public',
      scheduledDate: visibility === 'scheduled' && scheduledDate ? new Date(scheduledDate).toISOString() : null,
      views: 0,
      clicks: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collectionsCollection.insertOne(newCollection);
    
    // Get the created collection with details
    const createdCollection = await collectionsCollection.aggregate([
      { $match: { _id: result.insertedId } },
      {
        $lookup: {
          from: 'products',
          let: { productIds: { 
            $map: { 
              input: { 
                $filter: { 
                  input: '$collections', 
                  as: 'item', 
                  cond: { $eq: ['$$item.type', 'product'] } 
                } 
              }, 
              as: 'product', 
              in: '$$product.refId' 
            } 
          } },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$productIds'] } } }
          ],
          as: 'productDetails'
        }
      },
      {
        $lookup: {
          from: 'combo_offers',
          let: { comboIds: { 
            $map: { 
              input: { 
                $filter: { 
                  input: '$collections', 
                  as: 'item', 
                  cond: { $eq: ['$$item.type', 'combo'] } 
                } 
              }, 
              as: 'combo', 
              in: '$$combo.refId' 
            } 
          } },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$comboIds'] } } }
          ],
          as: 'comboDetails'
        }
      },
      {
        $addFields: {
          collections: {
            $map: {
              input: '$collections',
              as: 'item',
              in: {
                $mergeObjects: [
                  '$$item',
                  {
                    $cond: {
                      if: { $eq: ['$$item.type', 'product'] },
                      then: {
                        product: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$productDetails',
                                as: 'productDetail',
                                cond: { $eq: ['$$productDetail._id', '$$item.refId'] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      else: {
                        combo: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$comboDetails',
                                as: 'comboDetail',
                                cond: { $eq: ['$$comboDetail._id', '$$item.refId'] }
                              }
                            },
                            0
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ]).next();

    return NextResponse.json(createdCollection, { status: 201 });

  } catch (error: any) {
    console.error('POST collection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create fashion collection' },
      { status: 500 }
    );
  }
}
