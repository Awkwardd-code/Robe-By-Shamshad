/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/db/client";

const DEFAULT_PAGE_LIMIT = 10;
const CODE_LENGTH = 14;
const COUPON_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

const generateCouponCode = () => {
  let value = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    value += COUPON_CHARS[Math.floor(Math.random() * COUPON_CHARS.length)];
  }
  return value;
};

const normalizeCouponCode = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

const isValidCode = (value: string) => value.length === CODE_LENGTH && /^[A-Z0-9]+$/.test(value);

const parseNumberField = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || `${DEFAULT_PAGE_LIMIT}`, 10);
    const pageLimit = Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_PAGE_LIMIT;
    const skip = (page - 1) * pageLimit;

    const db = await connectToDatabase();
    const couponsCollection = db.collection("coupons");

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } }
      ];
    }

    const totalCount = await couponsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageLimit) || 1;

    const coupons = await couponsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .toArray();

    return NextResponse.json(
      {
        coupons,
        totalPages,
        currentPage: page,
        totalCount,
        pageLimit
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET coupons error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await connectToDatabase();
    const couponsCollection = db.collection("coupons");

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

    let code = normalizeCouponCode(codeRaw);
    if (!code) {
      code = generateCouponCode();
    }

    if (!isValidCode(code)) {
      return NextResponse.json(
        { error: "Coupon code must be 14 alphanumeric characters" },
        { status: 400 }
      );
    }

    const existingCode = await couponsCollection.findOne({ code });
    if (existingCode) {
      return NextResponse.json(
        { error: "Coupon code already exists. Please regenerate." },
        { status: 409 }
      );
    }

    const newCoupon = {
      name,
      code,
      startDate,
      endDate,
      discountPercentage: hasPercentage ? discountPercentage : null,
      discountedPrice: hasPrice ? discountedPrice : null,
      appliesTo: "all",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await couponsCollection.insertOne(newCoupon);
    const createdCoupon = await couponsCollection.findOne({ _id: result.insertedId });

    return NextResponse.json(createdCoupon, { status: 201 });
  } catch (error: any) {
    console.error("POST coupon error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create coupon" },
      { status: 500 }
    );
  }
}
