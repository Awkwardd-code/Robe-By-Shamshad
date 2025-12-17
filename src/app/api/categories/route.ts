/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/client';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');

    // Build search query
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const totalCount = await categoriesCollection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get categories with product count
    const categories = await categoriesCollection.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: 'slug',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' }
        }
      },
      {
        $project: {
          products: 0
        }
      }
    ]).toArray();

    return NextResponse.json({
      categories,
      totalPages,
      currentPage: page,
      totalCount,
      pageLimit: limit
    }, { status: 200 });

  } catch (error: any) {
    console.error('GET categories error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');
    
    const body = await request.json();
    const { name, slug, description, image } = body;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category with same name or slug already exists
    const existingCategory = await categoriesCollection.findOne({
      $or: [
        { name: name.trim() },
        { slug: slug.trim() }
      ]
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name or slug already exists' },
        { status: 409 }
      );
    }

    const newCategory = {
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || '',
      image: image || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await categoriesCollection.insertOne(newCategory);
    
    const createdCategory = await categoriesCollection.findOne(
      { _id: result.insertedId },
      { projection: { products: 0 } }
    );

    return NextResponse.json(createdCategory, { status: 201 });

  } catch (error: any) {
    console.error('POST category error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}
