/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/db/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CODE_LENGTH = 14;

const normalizeCouponCode = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

const isValidCode = (value: string) => value.length === CODE_LENGTH && /^[A-Z0-9]+$/.test(value);

const parseNumberField = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid coupon ID" }, { status: 400 });
    }

    const db = await connectToDatabase();
    const couponsCollection = db.collection("coupons");

    const coupon = await couponsCollection.findOne({ _id: new ObjectId(id) });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json(coupon, { status: 200 });
  } catch (error: any) {
    console.error("GET coupon error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch coupon" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid coupon ID" }, { status: 400 });
    }

    const db = await connectToDatabase();
    const couponsCollection = db.collection("coupons");

    const existingCoupon = await couponsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingCoupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const startDateRaw = typeof body?.startDate === "string" ? body.startDate : "";
    const endDateRaw = typeof body?.endDate === "string" ? body.endDate : "";
    const codeRaw = typeof body?.code === "string" ? body.code : "";
    const discountPercentage = parseNumberField(body?.discountPercentage);
    const discountedPrice = parseNumberField(body?.discountedPrice);

    if (!name) {
      return NextResponse.json({ error: "Coupon name is required" }, { status: 400 });
    }

    if (!startDateRaw || !endDateRaw) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateRaw);
    const endDate = new Date(endDateRaw);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Please provide valid dates" }, { status: 400 });
    }

    if (endDate.getTime() < startDate.getTime()) {
      return NextResponse.json(
        { error: "End date must be after the start date" },
        { status: 400 }
      );
    }

    const hasPercentage = typeof discountPercentage === "number" && discountPercentage > 0;
    const hasPrice = typeof discountedPrice === "number" && discountedPrice > 0;

    if (hasPercentage && hasPrice) {
      return NextResponse.json(
        { error: "Provide either a discount percentage or a discounted price, not both" },
        { status: 400 }
      );
    }

    if (!hasPercentage && !hasPrice) {
      return NextResponse.json(
        { error: "Provide a discount percentage or a discounted price" },
        { status: 400 }
      );
    }

    if (hasPercentage && (discountPercentage as number) > 100) {
      return NextResponse.json(
        { error: "Discount percentage must be between 1 and 100" },
        { status: 400 }
      );
    }

    const normalizedCode = normalizeCouponCode(codeRaw);
    if (normalizedCode && normalizedCode !== existingCoupon.code) {
      return NextResponse.json(
        { error: "Coupon code cannot be changed once created" },
        { status: 400 }
      );
    }

    if (normalizedCode && !isValidCode(normalizedCode)) {
      return NextResponse.json(
        { error: "Coupon code must be 14 alphanumeric characters" },
        { status: 400 }
      );
    }

    const updateData = {
      name,
      startDate,
      endDate,
      discountPercentage: hasPercentage ? discountPercentage : null,
      discountedPrice: hasPrice ? discountedPrice : null,
      updatedAt: new Date()
    };

    await couponsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updatedCoupon = await couponsCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json(updatedCoupon, { status: 200 });
  } catch (error: any) {
    console.error("PUT coupon error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update coupon" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid coupon ID" }, { status: 400 });
    }

    const db = await connectToDatabase();
    const couponsCollection = db.collection("coupons");

    const existingCoupon = await couponsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingCoupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    await couponsCollection.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ message: "Coupon deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE coupon error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete coupon" },
      { status: 500 }
    );
  }
}
