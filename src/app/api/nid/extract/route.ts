import { NextRequest, NextResponse } from "next/server";
import { extractNidDataFromImages } from "@/lib/nidExtraction";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const frontImageUrl = asString(payload?.frontImageUrl);
    const backImageUrl = asString(payload?.backImageUrl);

    if (!frontImageUrl || !backImageUrl) {
      return NextResponse.json(
        { error: "Both NID front and back image URLs are required." },
        { status: 400 }
      );
    }

    const result = await extractNidDataFromImages({
      frontImageUrl,
      backImageUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
        },
        { status: result.code === "missing_openai_key" ? 501 : 422 }
      );
    }

    return NextResponse.json(
      {
        extractedData: result.extractedData,
        extractionMeta: result.meta,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract NID data.",
      },
      { status: 500 }
    );
  }
}
