import { NextRequest, NextResponse } from "next/server";

function resolveClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const [ip] = forwarded.split(",").map((value) => value.trim());
    if (ip) return ip;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

export async function GET(req: NextRequest) {
  const ip = resolveClientIp(req);
  return NextResponse.json({ ip });
}
