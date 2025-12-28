/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/db/client";

const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 50;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function generateOrderId(): string {
  const suffix = Date.now().toString().slice(-6);
  return `RBS${suffix}`;
}

type IncomingOrderItem = {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  image?: string;
  isCombo?: boolean;
  deliveryDetail?: unknown;
  maintenanceFee?: number;
  maintenance?: number;
  price?: number;
  qty?: number;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_PAGE_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || `${DEFAULT_PAGE_LIMIT}`, 10))
    );
    const searchTerm = searchParams.get("search")?.trim();

    const db = await connectToDatabase();
    const ordersCollection = db.collection("orders");

    const query: Record<string, unknown> = {};
    if (searchTerm) {
      const regex = { $regex: escapeRegExp(searchTerm), $options: "i" };
      query.$or = [
        { orderId: regex },
        { status: regex },
        { "shippingAddress.fullName": regex },
        { "shippingAddress.email": regex },
        { "shippingAddress.phone": regex },
        { notes: regex },
        { "items.productName": regex },
        { "payment.method": regex },
      ];
    }

    const totalCount = await ordersCollection.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const skip = (page - 1) * limit;

    const orders = await ordersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      orders,
      totalPages,
      currentPage: page,
      totalCount,
      pageLimit: limit,
    });
  } catch (error: any) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const rawItems = Array.isArray(payload.items)
      ? (payload.items as IncomingOrderItem[])
      : [];
    if (!rawItems.length) {
      return NextResponse.json(
        { error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    const shippingAddress = payload.shippingAddress ?? {};
    const fullName = asString(shippingAddress.fullName);
    const email = asString(shippingAddress.email);
    const phone = asString(shippingAddress.phone);
    const streetAddress = asString(shippingAddress.streetAddress);
    const city = asString(shippingAddress.city);
    const zipCode = asString(shippingAddress.zipCode);

    if (!fullName || !email || !phone || !streetAddress || !city || !zipCode) {
      return NextResponse.json(
        { error: "Incomplete shipping address information" },
        { status: 400 }
      );
    }

    const productsSubtotal = asNumber(payload.productsSubtotal ?? payload.subtotal ?? 0);
    const maintenanceFee = asNumber(payload.maintenanceFee ?? 0);
    const shippingCost = asNumber(payload.shippingCost ?? payload.deliveryCharge ?? 0);
    const deliveryCharge = asNumber(payload.deliveryCharge ?? shippingCost);
    const discountAmount = asNumber(payload.discountAmount ?? 0);
    const total = asNumber(
      payload.total ?? productsSubtotal + maintenanceFee + shippingCost - discountAmount
    );

    const normalizedItems = rawItems.map((item: IncomingOrderItem, index: number) => {
      const productId = asString(item.productId);
      if (!productId) {
        throw new Error(`Missing productId for item #${index + 1}`);
      }
      const productName = asString(item.productName) || `Item #${index + 1}`;

      return {
        productId,
        productName,
        quantity: Math.max(1, asNumber(item.quantity ?? item.qty ?? 1)),
        unitPrice: Math.max(0, asNumber(item.unitPrice ?? item.price ?? 0)),
        image: asString(item.image) || null,
        isCombo: Boolean(item.isCombo),
        deliveryDetail: item.deliveryDetail ?? null,
        maintenanceFee: Math.max(0, asNumber(item.maintenanceFee ?? item.maintenance ?? 0)),
      };
    });

    const paymentPayload = payload.payment ?? {};
    const paymentMethod = asString(paymentPayload.method) || "cash_on_delivery";
    const paymentStatus = asString(paymentPayload.status) || "pending";
    const paymentAmount = asNumber(paymentPayload.amount ?? total);
    const paymentCurrency = asString(paymentPayload.currency) || "BDT";

    const now = new Date();
    const newOrder = {
      orderId: asString(payload.orderId) || generateOrderId(),
      items: normalizedItems,
      shippingAddress: {
        fullName,
        email,
        phone,
        streetAddress,
        apartment: asString(shippingAddress.apartment) || null,
        city,
        zipCode,
      },
      payment: {
        method: paymentMethod,
        status: paymentStatus,
        amount: paymentAmount,
        currency: paymentCurrency,
        transactionId: asString(paymentPayload.transactionId) || null,
      },
      notes: asString(payload.notes),
      deliveryTime: asString(payload.deliveryTime) || "anytime",
      productsSubtotal,
      maintenanceFee,
      shippingCost,
      deliveryCharge,
      subtotal: asNumber(payload.subtotal ?? productsSubtotal + maintenanceFee),
      discountAmount,
      total,
      coupon: payload.coupon ?? null,
      deliveryOption: asString(payload.deliveryOption) || null,
      hasDbDelivery: Boolean(payload.hasDbDelivery),
      dbDeliveryDetails: Array.isArray(payload.dbDeliveryDetails)
        ? payload.dbDeliveryDetails
        : [],
      smallestDbCharge:
        typeof payload.smallestDbCharge === "number"
          ? payload.smallestDbCharge
          : null,
      deliverySource: asString(payload.deliverySource) || null,
      orderSource: asString(payload.orderSource) || null,
      orderSourceToken: asString(payload.orderSourceToken) || null,
      isBuyNowFlow: Boolean(payload.isBuyNowFlow),
      source: asString(payload.source) || null,
      contextItemsCount: Math.max(
        0,
        asNumber(payload.contextItemsCount ?? normalizedItems.length)
      ),
      status: asString(payload.status) || "pending",
      createdAt: now,
      updatedAt: now,
    };

    const db = await connectToDatabase();
    const ordersCollection = db.collection("orders");

    const result = await ordersCollection.insertOne(newOrder);
    const createdOrder = await ordersCollection.findOne({ _id: result.insertedId });

    return NextResponse.json({ order: createdOrder }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
