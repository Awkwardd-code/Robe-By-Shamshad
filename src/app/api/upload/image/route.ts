import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MIN_SIZE_BYTES = 1024;

function validateImage(imageFile: File) {
  if (!ALLOWED_TYPES.includes(imageFile.type.toLowerCase())) {
    return `Invalid file type. Supported formats: ${ALLOWED_TYPES.join(", ")
      .replace(/image\//g, "")
      .toUpperCase()}`;
  }
  if (imageFile.size > MAX_SIZE_BYTES) {
    const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
    return `Image size ${sizeMB}MB exceeds 5MB limit`;
  }
  if (imageFile.size < MIN_SIZE_BYTES) {
    return "File too small (minimum 1KB required)";
  }
  return null;
}

async function uploadToCloudinary(imageFile: File, oldPublicId?: string | null) {
  const bytes = await imageFile.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (oldPublicId) {
    try {
      await cloudinary.uploader.destroy(oldPublicId);
    } catch (error) {
      console.warn("Failed to delete old image:", error);
    }
  }

  const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const uploadOptions = {
      folder: "robe-by-shamshad/features-grid",
      transformation: [
        { width: 800, height: 800, crop: "limit", quality: "auto" },
        { fetch_format: "auto" },
      ],
      resource_type: "image" as const,
      overwrite: false,
      unique_filename: true,
      use_filename: true,
      filename_override: undefined,
      invalidate: true,
      tags: ["features-grid"],
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: unknown, uploadResult: CloudinaryUploadResult | undefined) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(new Error(`Cloudinary upload failed: ${error}`));
        } else if (uploadResult) {
          resolve(uploadResult);
        } else {
          reject(new Error("No result returned from Cloudinary"));
        }
      }
    );

    uploadStream.end(buffer);
  });

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const validationError = validateImage(imageFile);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await uploadToCloudinary(imageFile);

    return NextResponse.json(
      {
        success: true,
        message: "Image uploaded successfully",
        imageUrl: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json({ error: "Failed to process image upload" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const oldPublicId = formData.get("oldPublicId") as string | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const validationError = validateImage(imageFile);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await uploadToCloudinary(imageFile, oldPublicId);

    return NextResponse.json(
      {
        success: true,
        message: "Image updated successfully",
        imageUrl: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update route error:", error);
    return NextResponse.json({ error: "Failed to process image update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publicId = searchParams.get("publicId");

    if (!publicId) {
      return NextResponse.json({ error: "Public ID is required" }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return NextResponse.json(
        { success: true, message: "Image deleted successfully" },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
