import { NextRequest, NextResponse } from 'next/server';
import {
  MongoClient,
  Db,
  ObjectId,
  type UpdateFilter
} from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'RBS';

let client: MongoClient | null = null;
async function connectToDatabase(): Promise<Db> {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db(DB_NAME);
}

type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

type PaymentMethod = 'cash_on_delivery' | 'online_payment';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

interface OrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  image?: string;
  isCombo?: boolean; // IMPORTANT: distinguish product vs combo
}

interface StatusHistoryEntry {
  status: OrderStatus;
  note: string;
  changedBy: string;
  changedAt: string;
}

type OrderDocument = {
  _id: ObjectId;
  status: OrderStatus;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt?: string;
  };
  statusHistory?: StatusHistoryEntry[];
  items: OrderItem[]; // include items so we can update inventory
};

// Helper to compute combo inventory status
function calculateComboInventoryStatus(
  totalStock: number,
  soldCount: number
): 'active' | 'inactive' | 'sold_out' {
  const remaining = totalStock - soldCount;
  if (remaining <= 0) return 'sold_out';
  if (remaining > 0) return 'active';
  return 'inactive';
}

// Update inventory for a given order (products + combos)
async function updateInventoryForOrder(
  order: OrderDocument,
  db: Db,
  operation: 'reduce' | 'restore' = 'reduce'
) {
  const items = order.items || [];
  for (const item of items) {
    try {
      if (!item.productId || !item.quantity) continue;

      // COMBO ITEMS: update combo_offers inventory
      if (item.isCombo) {
        const combo = await db.collection('combo_offers').findOne({
          _id: new ObjectId(item.productId)
        });

        if (!combo) {
          console.warn(
            `Combo offer ${item.productId} not found while updating inventory`
          );
          continue;
        }

        const totalStock = combo.inventory?.totalStock ?? 0;
        const currentSold = combo.inventory?.soldCount ?? 0;

        let newSoldCount = currentSold;
        if (operation === 'reduce') {
          newSoldCount = currentSold + item.quantity;
        } else if (operation === 'restore') {
          newSoldCount = Math.max(0, currentSold - item.quantity);
        }

        const status = calculateComboInventoryStatus(totalStock, newSoldCount);

        await db.collection('combo_offers').updateOne(
          { _id: combo._id },
          {
            $set: {
              'inventory.soldCount': newSoldCount,
              'inventory.status': status,
              updatedAt: new Date().toISOString()
            }
          }
        );

        continue;
      }

      // NORMAL PRODUCTS: update products.inventory
      const product = await db.collection('products').findOne({
        _id: new ObjectId(item.productId)
      });

      if (!product || !product.inventory) {
        console.warn(
          `Product ${item.productId} not found or missing inventory while updating`
        );
        continue;
      }

      const currentQty = product.inventory.quantity ?? 0;
      const threshold = product.inventory.threshold ?? 0;

      let newQuantity = currentQty;
      if (operation === 'reduce') {
        newQuantity = Math.max(0, currentQty - item.quantity);
      } else if (operation === 'restore') {
        newQuantity = currentQty + item.quantity;
      }

      let status = product.inventory.status;
      if (newQuantity === 0) {
        status = 'out_of_stock';
      } else if (newQuantity <= threshold) {
        status = 'low_stock';
      } else {
        status = 'in_stock';
      }

      await db.collection('products').updateOne(
        { _id: new ObjectId(item.productId) },
        {
          $set: {
            'inventory.quantity': newQuantity,
            'inventory.status': status,
            updatedAt: new Date().toISOString()
          }
        }
      );
    } catch (err) {
      console.error('Error updating inventory for item', item.productId, err);
    }
  }
}

// PATCH - Update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    console.log('Updating order status for ID:', orderId);

    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status } = body as { status: OrderStatus };

    // Validate status
    const validStatuses: OrderStatus[] = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled'
    ];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const ordersCollection = db.collection<OrderDocument>('orders');

    // Check if order exists
    const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const previousStatus = order.status;

    // Inventory changes based on status transitions:
    // - going to cancelled from non-cancelled -> restore inventory
    // - going from cancelled to any other -> reduce inventory
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      await updateInventoryForOrder(order, db, 'restore');
    } else if (previousStatus === 'cancelled' && status !== 'cancelled') {
      await updateInventoryForOrder(order, db, 'reduce');
    }

    // Update order status + payment status if needed
    const updateData: UpdateFilter<OrderDocument>['$set'] = {
      status,
      updatedAt: new Date().toISOString()
    };

    // If status is delivered, mark payment as paid if it's cash on delivery and pending
    if (
      status === 'delivered' &&
      order.payment.method === 'cash_on_delivery' &&
      order.payment.status === 'pending'
    ) {
      updateData['payment.status'] = 'paid';
      updateData['payment.paidAt'] = new Date().toISOString();
    }

    // If status is cancelled, update payment status if needed
    if (status === 'cancelled') {
      if (order.payment.status === 'paid') {
        updateData['payment.status'] = 'refunded';
      }
    }

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get updated order
    const updatedOrder = await ordersCollection.findOne({
      _id: new ObjectId(orderId)
    });

    return NextResponse.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Failed to update order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
