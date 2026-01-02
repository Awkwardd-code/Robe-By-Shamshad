/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/collections/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/client';
import { ObjectId } from 'mongodb';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid collection ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collectionsCollection = db.collection('collections');

    const collection = await collectionsCollection.aggregate([
      { $match: { _id: new ObjectId(id) } },
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
              tags: 1,
              ratings: 1
            }}
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
            { $match: { $expr: { $in: ['$_id', '$$comboIds'] } } },
            { $project: { 
              _id: 1,
              name: 1,
              description: 1,
              slug: 1,
              pricing: 1,
              thumbnail: 1,
              gallery: 1,
              tags: 1,
              inventory: 1,
              validity: 1,
              features: 1,
              delivery: 1
            }}
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

    if (!collection) {
      return NextResponse.json(
        { error: 'Fashion collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(collection, { status: 200 });

  } catch (error: any) {
    console.error('GET collection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fashion collection' },
      { status: 500 }
    );
  }
}


// app/api/collections/[id]/route.ts - PUT method
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid collection ID' },
        { status: 400 }
      );
    }

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

    // Check if collection exists
    const existingCollection = await collectionsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Fashion collection not found' },
        { status: 404 }
      );
    }



    if (!Array.isArray(collectionItems) || collectionItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one fashion item is required for the collection' },
        { status: 400 }
      );
    }

    // Check if slug is unique (excluding current collection)
    if (slug?.trim() && slug.trim() !== existingCollection.slug) {
      const duplicateSlug = await collectionsCollection.findOne({
        slug: slug.trim(),
        _id: { $ne: new ObjectId(id) }
      });

      if (duplicateSlug) {
        return NextResponse.json(
          { error: 'Another collection with this slug already exists' },
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

    const updateData = {
      bannerImage: bannerImage?.trim() || existingCollection.bannerImage,
      bannerTitle: bannerTitle.trim(),
      bannerDescription: bannerDescription?.trim() || existingCollection.bannerDescription || '',
      slug: slug.trim(),
      tags: Array.isArray(tags)
        ? tags
        : tags?.split(',').map((t: string) => t.trim()).filter((t: string) => t) || existingCollection.tags,
      collections: collectionItems.map(item => ({
        type: item.type,
        refId: new ObjectId(item.refId),
        name: item.name,
        price: item.price,
        thumbnail: item.thumbnail,
        slug: item.slug
      })),
      status: status || existingCollection.status,
      featured: featured !== undefined ? featured : existingCollection.featured,
      sortOrder: sortOrder || existingCollection.sortOrder,
      visibility: visibility || existingCollection.visibility,
      scheduledDate: visibility === 'scheduled' && scheduledDate ? new Date(scheduledDate).toISOString() : null,
      updatedAt: new Date()
    };

    const result = await collectionsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Fashion collection not found' },
        { status: 404 }
      );
    }

    // Get updated collection with details
    const updatedCollection = await collectionsCollection.aggregate([
      { $match: { _id: new ObjectId(id) } },
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

    return NextResponse.json(updatedCollection, { status: 200 });

  } catch (error: any) {
    console.error('PUT collection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update fashion collection' },
      { status: 500 }
    );
  }
}

// app/api/collections/[id]/route.ts - DELETE method
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid collection ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collectionsCollection = db.collection('collections');

    // Check if collection exists
    const collection = await collectionsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Fashion collection not found' },
        { status: 404 }
      );
    }

    // Delete collection
    const result = await collectionsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Fashion collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Fashion collection deleted successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('DELETE collection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete fashion collection' },
      { status: 500 }
    );
  }
}
