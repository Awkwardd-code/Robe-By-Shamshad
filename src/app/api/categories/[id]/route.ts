/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/categories/[id]/route.ts
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
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');

    const category = await categoriesCollection.aggregate([
      { $match: { _id: new ObjectId(id) } },
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
    ]).next();

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category, { status: 200 });

  } catch (error: any) {
    console.error('GET category error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

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

    // Check if category exists
    const existingCategory = await categoriesCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if another category has the same name or slug
    const duplicateCategory = await categoriesCollection.findOne({
      $and: [
        { _id: { $ne: new ObjectId(id) } },
        {
          $or: [
            { name: name.trim() },
            { slug: slug.trim() }
          ]
        }
      ]
    });

    if (duplicateCategory) {
      return NextResponse.json(
        { error: 'Another category with this name or slug already exists' },
        { status: 409 }
      );
    }

    const updateData = {
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || '',
      image: image || '',
      updatedAt: new Date()
    };

    const result = await categoriesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const updatedCategory = await categoriesCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { products: 0 } }
    );

    return NextResponse.json(updatedCategory, { status: 200 });

  } catch (error: any) {
    console.error('PUT category error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');
    const productsCollection = db.collection('products');

    // Check if category exists
    const category = await categoriesCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category has products
    const productCount = await productsCollection.countDocuments({
      categoryId: new ObjectId(id)
    });

    if (productCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete category with existing products',
          productCount
        },
        { status: 409 }
      );
    }

    // Delete category
    const result = await categoriesCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Category deleted successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('DELETE category error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}
