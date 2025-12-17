/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/db/client';

// Calculate user order statistics
async function calculateUserOrderStats(db: any, userId: string) {
  try {
    const orders = await db.collection('orders').find({
      userId: new ObjectId(userId)
    }).sort({ createdAt: -1 }).toArray();

    if (orders.length === 0) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0
      };
    }

    const totalSpent = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
    const lastOrderDate = orders[0]?.createdAt;
    const averageOrderValue = totalSpent / orders.length;

    return {
      totalOrders: orders.length,
      totalSpent,
      lastOrderDate,
      averageOrderValue
    };
  } catch (error) {
    console.error('Error calculating user order stats:', error);
    return {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0
    };
  }
}

// GET single user by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate order statistics
    const stats = await calculateUserOrderStats(db, id);
    
    // Get user's recent orders
    const recentOrders = await db.collection('orders')
      .find({ userId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const userWithStats = {
      ...user,
      orderStats: stats,
      recentOrders,
      // Format address for frontend compatibility
      address: user.addresses && user.addresses.length > 0 ? user.addresses[0] : undefined
    };

    // Update user statistics in database
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          totalOrders: stats.totalOrders,
          totalSpent: stats.totalSpent,
          lastOrderDate: stats.lastOrderDate,
          updatedAt: new Date().toISOString()
        }
      }
    );

    return NextResponse.json(userWithStats);
    
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT update single user
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      email,
      phone,
      role,
      isActive,
      avatar,
      addresses,
      isAdmin
    } = body;
    
    if (!name && !email && !phone && !role && isActive === undefined && !avatar && !addresses && isAdmin === undefined) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find the user
    const existingUser = await db.collection('users').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (name && name.trim() !== existingUser.name) {
      updateData.name = name.trim();
    }
    
    if (email && email.trim() !== existingUser.email) {
      // Check if new email already exists
      const duplicateUser = await db.collection('users').findOne({
        $and: [
          { _id: { $ne: new ObjectId(id) } },
          { email: email.trim().toLowerCase() }
        ]
      });
      
      if (duplicateUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
      
      updateData.email = email.trim().toLowerCase();
      updateData.emailVerified = false;
    }
    
    if (phone !== undefined) {
      updateData.phone = phone?.trim() || '';
    }
    
    if (role && role !== existingUser.role) {
      const validRoles = ['admin', 'customer', 'staff'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role specified' },
          { status: 400 }
        );
      }
      updateData.role = role;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }
    
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }
    
    if (addresses !== undefined) {
      updateData.addresses = addresses;
    }

    if (isAdmin !== undefined) {
      updateData.isAdmin = Number(isAdmin ? 1 : 0);
    }

    // Update the user
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Recalculate and update statistics
    const stats = await calculateUserOrderStats(db, id);
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          totalOrders: stats.totalOrders,
          totalSpent: stats.totalSpent,
          lastOrderDate: stats.lastOrderDate
        }
      }
    );

    // Fetch updated user
    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    const userWithStats = {
      ...updatedUser,
      orderStats: stats,
      address: updatedUser?.addresses && updatedUser.addresses.length > 0 ? updatedUser.addresses[0] : undefined
    };

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: userWithStats
    });
    
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE single user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const db = await connectToDatabase();
    
    // Find the user first
    const existingUser = await db.collection('users').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has any orders
    const orderCount = await db.collection('orders').countDocuments({
      userId: new ObjectId(id)
    });
    
    if (orderCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with associated orders',
          orderCount
        },
        { status: 400 }
      );
    }

    // Delete the user
    const result = await db.collection('users').deleteOne({ 
      _id: new ObjectId(id) 
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
