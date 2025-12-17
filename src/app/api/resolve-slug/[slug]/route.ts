/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/resolve-slug/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/db/client';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const { slug } = resolvedParams;
    const db = await connectToDatabase();
    
    // Try to find in products collection
    const productsCollection = db.collection('products');
    const productQuery = {
      $or: [
        { slug: { $regex: `^${escapeRegExp(slug)}$`, $options: 'i' } },
        ...(ObjectId.isValid(slug) ? [{ _id: new ObjectId(slug) }] : [])
      ]
    };
    
    const product = await productsCollection.findOne(productQuery);
    
    if (product) {
      return NextResponse.json({
        type: 'product',
        data: {
          ...product,
          _id: product._id.toString()
        }
      });
    }
    
    // Try to find in combo_offers collection
    const combosCollection = db.collection('combo_offers');
    const comboQuery = {
      $or: [
        { slug: { $regex: `^${escapeRegExp(slug)}$`, $options: 'i' } },
        ...(ObjectId.isValid(slug) ? [{ _id: new ObjectId(slug) }] : [])
      ]
    };
    
    const combo = await combosCollection.findOne(comboQuery);
    
    if (combo) {
      // Get product details for the combo
      const productIds = combo.products?.map((p: any) => new ObjectId(p.productId)) || [];
      const productsCollection = db.collection('products');
      
      const productDetails = await productsCollection.find({
        _id: { $in: productIds }
      }).toArray();
      
      const enhancedCombo = {
        ...combo,
        _id: combo._id.toString(),
        products: combo.products?.map((p: any) => ({
          ...p,
          productId: p.productId.toString(),
          product: productDetails.find(pd => pd._id.toString() === p.productId.toString())
        })) || []
      };
      
      return NextResponse.json({
        type: 'combo',
        data: enhancedCombo
      });
    }
    
    // Try collections
    const collectionsCollection = db.collection('collections');
    const collection = await collectionsCollection.findOne({
      slug: { $regex: `^${escapeRegExp(slug)}$`, $options: 'i' }
    });
    
    if (collection) {
      return NextResponse.json({
        type: 'collection',
        data: {
          ...collection,
          _id: collection._id.toString()
        }
      });
    }
    
    return NextResponse.json(
      { error: 'Not found', message: 'No product, combo, or collection found with this slug' },
      { status: 404 }
    );
    
  } catch (error: any) {
    console.error('Slug resolution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve slug' },
      { status: 500 }
    );
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
