import { NextResponse } from "next/server";
import { type Document } from "mongodb";
import { connectToDatabase } from "@/db/client";

export async function GET() {
  try {
    const db = await connectToDatabase();

    const totalUsers = await db.collection("users").countDocuments();
    const activeUsers = await db.collection("users").countDocuments({ isActive: true });

    const usersByRole = await db
      .collection("users")
      .aggregate<
        Document & {
          _id: string;
          count: number;
        }
      >([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = await db.collection("users").countDocuments({
      createdAt: { $gte: thirtyDaysAgo.toISOString() },
    });

    const topUsers = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .sort({ totalSpent: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      totalUsers,
      activeUsers,
      usersByRole: usersByRole.reduce<Record<string, number>>((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      newUsers,
      topUsers,
    });
  } catch (error) {
    console.error("Failed to fetch user statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch user statistics" },
      { status: 500 }
    );
  }
}
