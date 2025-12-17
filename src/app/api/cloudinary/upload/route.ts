import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type with specific formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(imageFile.type.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid file type. Supported formats: ${allowedTypes.join(', ').replace(/image\//g, '').toUpperCase()}` },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (imageFile.size > 5 * 1024 * 1024) {
      const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { error: `Image size ${sizeMB}MB exceeds 5MB limit` },
        { status: 400 }
      );
    }

    // Validate minimum file size (avoid corrupted files)
    if (imageFile.size < 1024) {
      return NextResponse.json(
        { error: 'File too small (minimum 1KB required)' },
        { status: 400 }
      );
    }

    try {
      // Convert File to buffer
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Cloudinary with enhanced configuration
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const uploadOptions = {
          folder: 'mango-products/combo-offers',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
            { fetch_format: 'auto' }
          ],
          resource_type: 'image' as const,
          overwrite: false,
          unique_filename: true,
          use_filename: true,
          filename_override: undefined,
          invalidate: true,
          tags: ['combo-offer', 'product-image']
        };

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error: unknown, result: CloudinaryUploadResult | undefined) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(new Error(`Cloudinary upload failed: ${error}`));
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('No result returned from Cloudinary'));
            }
          }
        );

        uploadStream.end(buffer);
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Image uploaded successfully',
          imageUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes
        },
        { status: 200 }
      );

    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image to Cloudinary' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json(
      { error: 'Failed to process image upload' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update/replace images
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;
    const oldPublicId = formData.get('oldPublicId') as string | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type with specific formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(imageFile.type.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid file type. Supported formats: ${allowedTypes.join(', ').replace(/image\//g, '').toUpperCase()}` },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (imageFile.size > 5 * 1024 * 1024) {
      const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { error: `Image size ${sizeMB}MB exceeds 5MB limit` },
        { status: 400 }
      );
    }

    // Validate minimum file size (avoid corrupted files)
    if (imageFile.size < 1024) {
      return NextResponse.json(
        { error: 'File too small (minimum 1KB required)' },
        { status: 400 }
      );
    }

    try {
      // Convert File to buffer
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // If there's an old image, delete it first
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (deleteError) {
          console.warn('Failed to delete old image:', deleteError);
          // Continue with upload even if delete fails
        }
      }

      // Upload new image to Cloudinary with enhanced configuration
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const uploadOptions = {
          folder: 'mango-products/combo-offers',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
            { fetch_format: 'auto' }
          ],
          resource_type: 'image' as const,
          overwrite: false,
          unique_filename: true,
          use_filename: true,
          filename_override: undefined,
          invalidate: true,
          tags: ['combo-offer', 'product-image']
        };

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error: unknown, result: CloudinaryUploadResult | undefined) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(new Error(`Cloudinary upload failed: ${error}`));
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('No result returned from Cloudinary'));
            }
          }
        );

        uploadStream.end(buffer);
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Image updated successfully',
          imageUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes
        },
        { status: 200 }
      );

    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image to Cloudinary' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Update route error:', error);
    return NextResponse.json(
      { error: 'Failed to process image update' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove images from Cloudinary
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      return NextResponse.json(
        {
          success: true,
          message: 'Image deleted successfully'
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}