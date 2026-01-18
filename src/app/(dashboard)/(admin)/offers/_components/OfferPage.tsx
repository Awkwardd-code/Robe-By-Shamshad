/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, Fragment, useMemo, useCallback } from 'react';
import {
  Search, Edit, Trash2, Plus, ChevronLeft, ChevronRight,
  X, Star, Package, Images, ShieldCheck, Tag, Percent,
  ShoppingCart, Calendar, Gift, Zap, CheckCircle, Layers,
  Upload, Image as ImageIcon, Loader2, Eye, Camera, GripVertical,
  Truck, Sparkles, Scissors, Users, Palette, Heart
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import Image from 'next/image';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Skeleton } from '@/components/ui/skeleton';

// Interfaces
interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  pricing: {
    current: { currency: string; value: number };
    original: { currency: string; value: number };
  };
  inventory: {
    quantity: number;
    status: string;
  };
  media: {
    thumbnail: string;
  };
  ratings: {
    averageRating: number;
  };
}

interface ComboOffer {
  _id: string;
  name: string;
  description: string;
  slug: string;
  products: Array<{
    productId: string;
    product?: Product;
    quantity: number;
  }>;
  pricing: {
    originalTotal: number;
    discountedPrice: number;
    discountPercentage: number;
    currency: string;
  };
  inventory: {
    totalStock: number;
    soldCount: number;
    status: 'active' | 'inactive' | 'sold_out';
  };
  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  tags: string[];
  features: string[];
  thumbnail: string;
  gallery: string[];
  createdAt: string;
  updatedAt: string;
  delivery: {
    isFree: boolean;
    charge?: number;
    message?: string;
  };
}

interface ComboForm {
  _id?: string;
  name: string;
  description: string;
  slug: string;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
  pricing: {
    originalTotal: number;
    discountedPrice: number;
    discountPercentage: number;
    currency: string;
  };
  validity: {
    startDate: string;
    endDate: string;
  };
  tags: string;
  features: string;
  thumbnail: string;
  gallery: string[];
  galleryString?: string;
  delivery: {
    isFree: boolean;
    charge?: number;
    message?: string;
  };
}

interface UploadedImage {
  url: string;
  publicId: string;
  isThumbnail: boolean;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  uploadedAt?: string;
  fileName?: string;
}

const DEFAULT_PAGE_LIMIT = 6;
const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Fashion combo types for suggestions
const fashionComboTypes = [
  'Complete Abaya Set',
  'Hijab & Dress Combo',
  'Modest Summer Collection',
  'Prayer Outfit Bundle',
  'Eid Special Collection',
  'Wedding Guest Combo',
  'Office Wear Bundle',
  'Casual Friday Set',
  'Designer Abaya Collection',
  'Kids Fashion Bundle'
];

// Delivery options configuration
const deliveryOptions = [
  { value: 'free', label: 'Free Delivery on Fashion Orders', icon: Truck },
  { value: 'express', label: 'Express Delivery (+৳150)', icon: Zap },
  { value: 'standard', label: 'Standard Delivery (+৳100)', icon: Package },
];

// Fashion categories for product filtering
const fashionCategories = [
  'Abaya',
  'Hijab & Scarves',
  'Modest Dresses',
  'Kaftans',
  'Tunics & Tops',
  'Bottoms',
  'Accessories',
  'Kids Collection',
  'Men\'s Collection',
  'Prayer Outfits'
];

// Generate random 8-digit alphanumeric string
const generateRandomString = (length = 8): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Custom hook for image upload functionality
const useImageUpload = (initialImages: UploadedImage[] = []) => {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string>('');

  const validateFile = useCallback((file: File): string | null => {
    if (!file) {
      return 'No file provided';
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return `File "${file.name}" must be a valid image (JPEG, PNG, WebP, or GIF)`;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      return `File "${file.name}" is ${sizeMB}MB, exceeds ${maxSizeMB}MB limit`;
    }

    if (file.size < 1024) {
      return `File "${file.name}" is too small (minimum 1KB required)`;
    }

    if (images.length >= MAX_IMAGES) {
      return `Maximum ${MAX_IMAGES} images allowed. Please remove some images first.`;
    }

    const existingNames = images.map(img => img.fileName).filter(Boolean);
    if (existingNames.includes(file.name)) {
      return `File "${file.name}" already exists. Please rename the file.`;
    }

    return null;
  }, [images]);

  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (file.size <= 1 * 1024 * 1024 || file.type === 'image/gif') {
        resolve(file);
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      reader.onload = (e) => {
        const img = new (globalThis.Image || window.Image)();

        img.onerror = () => {
          reject(new Error(`Invalid image file: ${file.name}`));
        };

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
            }

            const maxDimension = 1200;
            let { width, height } = img;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = (height * maxDimension) / width;
                width = maxDimension;
              } else {
                width = (width * maxDimension) / height;
                height = maxDimension;
              }
            }

            canvas.width = width;
            canvas.height = height;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, width, height);

            let quality = 0.8;
            if (file.size > 3 * 1024 * 1024) quality = 0.6;
            else if (file.size > 2 * 1024 * 1024) quality = 0.7;

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                } else {
                  reject(new Error(`Failed to compress image: ${file.name}`));
                }
              },
              'image/jpeg',
              quality
            );
          } catch (error) {
            reject(new Error(`Image compression failed: ${error}`));
          }
        };

        img.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    });
  }, []);

  const uploadToCloudinary = useCallback(async (file: File, retries = 3): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('image', file);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('/api/cloudinary/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

          if (response.status >= 400 && response.status < 500) {
            throw new Error(errorData.error || `Upload failed for ${file.name}: ${response.statusText}`);
          }

          if (attempt === retries) {
            throw new Error(errorData.error || `Upload failed for ${file.name} after ${retries} attempts`);
          }

          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }

        const data = await response.json();

        if (!data.imageUrl || !data.publicId) {
          throw new Error(`Invalid response for ${file.name}: missing required fields`);
        }

        return {
          url: data.imageUrl,
          publicId: data.publicId,
          isThumbnail: false,
          width: data.width,
          height: data.height,
          format: data.format,
          size: data.size,
          fileName: file.name,
          uploadedAt: new Date().toISOString()
        };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          if (attempt === retries) {
            throw new Error(`Upload timeout for ${file.name} after ${retries} attempts`);
          }
        } else if (attempt === retries) {
          throw new Error(error.message || `Failed to upload ${file.name}`);
        }

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new Error(`Upload failed for ${file.name}`);
  }, []);

  const uploadImages = useCallback(async (files: File[]): Promise<UploadedImage[]> => {
    if (files.length === 0) return [];

    setUploading(true);
    setProgress(0);
    setErrors([]);
    setRetryCount(0);
    setCurrentFileName('');

    try {
      const validationErrors: string[] = [];
      const validFiles: File[] = [];

      files.forEach(file => {
        const error = validateFile(file);
        if (error) {
          validationErrors.push(error);
        } else {
          validFiles.push(file);
        }
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        const errorMessage = validationErrors.length === 1
          ? validationErrors[0]
          : `${validationErrors.length} validation errors. First: ${validationErrors[0]}`;
        toast.error(errorMessage);
        return [];
      }

      if (images.length + validFiles.length > MAX_IMAGES) {
        const error = `Cannot upload ${validFiles.length} images. Maximum ${MAX_IMAGES} images allowed (${images.length} already uploaded)`;
        toast.error(error);
        return [];
      }

      toast.info(`Starting upload of ${validFiles.length} image(s)...`);

      const compressedFiles: File[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setCurrentFileName(`Compressing ${file.name}...`);
        setProgress((i / validFiles.length) * 30);

        try {
          const compressed = await compressImage(file);
          compressedFiles.push(compressed);
        } catch (error: any) {
          const errorMsg = `Failed to compress ${file.name}: ${error.message}`;
          setErrors(prev => [...prev, errorMsg]);
          toast.error(errorMsg);
        }
      }

      if (compressedFiles.length === 0) {
        throw new Error('No images could be processed');
      }

      const results: UploadedImage[] = [];
      const uploadErrors: string[] = [];

      for (let i = 0; i < compressedFiles.length; i++) {
        const file = compressedFiles[i];
        setCurrentFileName(`Uploading ${file.name}...`);

        try {
          const uploadedImage = await uploadToCloudinary(file);
          results.push(uploadedImage);

          const uploadProgress = 30 + ((i + 1) / compressedFiles.length) * 70;
          setProgress(uploadProgress);

        } catch (error: any) {
          const errorMsg = `Failed to upload ${file.name}: ${error.message}`;
          uploadErrors.push(errorMsg);
          setErrors(prev => [...prev, errorMsg]);
        }
      }

      if (results.length > 0) {
        const updatedImages = [...images, ...results];

        if (updatedImages.length > 0 && !updatedImages.some(img => img.isThumbnail)) {
          updatedImages[0].isThumbnail = true;
        }

        setImages(updatedImages);

        const successMessage = results.length === validFiles.length
          ? `Successfully uploaded all ${results.length} image(s)`
          : `Uploaded ${results.length} of ${validFiles.length} image(s)`;

        toast.success(successMessage);
      }

      if (uploadErrors.length > 0) {
        const errorSummary = uploadErrors.length === 1
          ? uploadErrors[0]
          : `${uploadErrors.length} upload errors occurred`;
        toast.error(errorSummary);
      }

      return results;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload images';
      toast.error(errorMessage);
      setErrors(prev => [...prev, errorMessage]);
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentFileName('');
    }
  }, [compressImage, images, uploadToCloudinary, validateFile]);

  const removeImage = useCallback(async (imageUrl: string) => {
    const imageToRemove = images.find(img => img.url === imageUrl);
    if (!imageToRemove) {
      toast.error('Image not found');
      return;
    }

    const updatedImages = images.filter(img => img.url !== imageUrl);

    if (updatedImages.length > 0 && !updatedImages.some(img => img.isThumbnail)) {
      updatedImages[0].isThumbnail = true;
    }

    setImages(updatedImages);

    if (imageToRemove.publicId) {
      try {
        await fetch(`/api/cloudinary/upload?publicId=${encodeURIComponent(imageToRemove.publicId)}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn('Failed to delete image from Cloudinary:', error);
      }
    }

    toast.success(`Image "${imageToRemove.fileName || 'Untitled'}" removed successfully!`);
  }, [images]);

  const setThumbnail = useCallback((imageUrl: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isThumbnail: img.url === imageUrl
    }));
    setImages(updatedImages);
    toast.success('Thumbnail updated!');
  }, [images]);

  const reorderImages = useCallback((startIndex: number, endIndex: number) => {
    const result = Array.from(images);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setImages(result);
  }, [images]);

  return {
    images,
    uploading,
    progress,
    errors,
    retryCount,
    currentFileName,
    uploadImages,
    removeImage,
    setThumbnail,
    reorderImages,
    setImages
  };
};

// Draggable Image Component
const DraggableImage: React.FC<{
  image: UploadedImage;
  index: number;
  onSetThumbnail: (url: string) => void;
  onRemove: (url: string) => void;
  onReorder?: (start: number, end: number) => void;
}> = ({ image, index, onSetThumbnail, onRemove, onReorder }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className="relative group"
      draggable={!!onReorder}
      onDragStart={(e) => {
        if (onReorder) {
          e.dataTransfer.setData('text/plain', index.toString());
          setIsDragging(true);
        }
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => {
        if (onReorder) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        if (onReorder) {
          e.preventDefault();
          const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
          onReorder(dragIndex, index);
        }
      }}
    >
      <div className={`relative aspect-square rounded-lg overflow-hidden border-2 ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-200 dark:border-gray-700'
        }`}>
        <Image
          src={image.url}
          alt={`Combo image ${index + 1}`}
          fill
          className="object-cover"
        />

        {image.isThumbnail && (
          <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            Thumbnail
          </div>
        )}

        {(image.size || image.format) && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            {image.format?.toUpperCase()}
            {image.size && ` • ${(image.size / 1024).toFixed(0)}KB`}
          </div>
        )}

        {onReorder && (
          <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded cursor-move">
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            {!image.isThumbnail && (
              <button
                type="button"
                onClick={() => onSetThumbnail(image.url)}
                className="bg-purple-500 text-white p-2 rounded-full hover:bg-purple-600 transition-colors cursor-pointer"
                title="Set as thumbnail"
              >
                <Star className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(image.url)}
              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FashionComboPage: React.FC = () => {
  // State management
  const [comboOffers, setComboOffers] = useState<ComboOffer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<ComboOffer | null>(null);
  const [editingCombo, setEditingCombo] = useState<ComboForm | null>(null);
  const [comboToDelete, setComboToDelete] = useState<string | null>(null);
  const [newCombo, setNewCombo] = useState<ComboForm>({
    name: '',
    description: '',
    slug: '',
    products: [],
    pricing: {
      originalTotal: 0,
      discountedPrice: 0,
      discountPercentage: 0,
      currency: 'BDT'
    },
    validity: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    tags: '',
    features: '',
    thumbnail: '',
    gallery: [],
    delivery: {
      isFree: true,
      charge: 0,
      message: 'Free Delivery on Fashion Orders'
    }
  });

  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedProductQuantities, setSelectedProductQuantities] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isAddingCombo, setIsAddingCombo] = useState(false);
  const [isUpdatingCombo, setIsUpdatingCombo] = useState(false);
  const [isDeletingCombo, setIsDeletingCombo] = useState(false);
  const [pageLimit, setPageLimit] = useState<number>(DEFAULT_PAGE_LIMIT);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Use custom image upload hooks
  const newComboImageUpload = useImageUpload([]);
  const updateComboImageUpload = useImageUpload([]);

  // Generate slug for fashion brand
  const generateSlug = (name: string): string => {
    if (!name.trim()) return '';

    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '')
      .replace(/_+/g, '_');

    if (!baseSlug) {
      return `robe_by_shamshad_combo_${generateRandomString(8)}`;
    }

    return `robe_by_shamshad_${baseSlug}`;
  };

  // Calculate original total from selected products
  const calculateOriginalTotal = useCallback((products: Array<{ productId: string; quantity: number }>, productList: Product[]) => {
    return products.reduce((total, item) => {
      const product = productList.find(p => p._id === item.productId);
      return total + (product ? product.pricing.current.value * item.quantity : 0);
    }, 0);
  }, []);

  // Calculate discount percentage
  const calculateDiscountPercentage = useCallback((original: number, discounted: number) => {
    if (original <= 0) return 0;
    return Math.round(((original - discounted) / original) * 100);
  }, []);

  // Fetch combo offers
  useEffect(() => {
    const fetchComboOffers = async () => {
      setIsFetching(true);
      try {
        const response = await fetch(
          `/api/combo-offers?page=${currentPage}&search=${encodeURIComponent(searchTerm)}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setComboOffers(data.offers || []);
          setTotalPages(data.totalPages || 1);
          setPageLimit(data.pageLimit || DEFAULT_PAGE_LIMIT);
        } else {
          const errorData = await response.json();
          toast.error(errorData?.error || 'Failed to fetch fashion combos');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to fetch fashion combos');
        console.error('Fetch fashion combos error:', error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchComboOffers();
  }, [currentPage, searchTerm]);

  // Fetch products for selection
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?limit=100');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch fashion products:', error);
      }
    };
    fetchProducts();
  }, []);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle view combo details
  const handleViewCombo = (comboId: string) => {
    const combo = comboOffers.find(c => c._id === comboId);
    if (combo) {
      setSelectedCombo(combo);
      setIsViewModalOpen(true);
    }
  };

  // Handle update combo - open edit modal
  const handleUpdateCombo = (comboId: string) => {
    const combo = comboOffers.find(c => c._id === comboId);
    if (combo) {
      const editingComboData: ComboForm = {
        ...combo,
        tags: combo.tags.join(', '),
        features: combo.features.join(', '),
        products: combo.products.map(p => ({
          productId: p.productId,
          quantity: p.quantity
        })),
        delivery: combo.delivery || {
          isFree: true,
          charge: 0,
          message: 'Free Delivery on Fashion Orders'
        }
      };
      setEditingCombo(editingComboData);

      const quantities: Record<string, number> = {};
      combo.products.forEach(p => {
        quantities[p.productId] = p.quantity;
      });
      setSelectedProductQuantities(quantities);

      const images: UploadedImage[] = [];
      if (combo.thumbnail) {
        images.push({
          url: combo.thumbnail,
          publicId: '',
          isThumbnail: true
        });
      }
      combo.gallery.forEach(url => {
        images.push({
          url,
          publicId: '',
          isThumbnail: false
        });
      });
      updateComboImageUpload.setImages(images);

      setIsUpdateModalOpen(true);
    }
  };

  // Handle delete combo
  const handleDeleteCombo = (comboId: string) => {
    setComboToDelete(comboId);
    setIsDeleteModalOpen(true);
  };

  // Handle product selection for new combo
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    const isSelected = selectedProducts.some(p => p._id === productId);
    if (isSelected) {
      const updatedProducts = selectedProducts.filter(p => p._id !== productId);
      setSelectedProducts(updatedProducts);

      const updatedQuantities = { ...selectedProductQuantities };
      delete updatedQuantities[productId];
      setSelectedProductQuantities(updatedQuantities);

      updateNewComboProducts(updatedProducts, updatedQuantities);
    } else {
      const updatedProducts = [...selectedProducts, product];
      setSelectedProducts(updatedProducts);

      const updatedQuantities = {
        ...selectedProductQuantities,
        [productId]: 1
      };
      setSelectedProductQuantities(updatedQuantities);

      updateNewComboProducts(updatedProducts, updatedQuantities);
    }
  };

  // Handle product selection for edit
  const handleEditProductSelect = (productId: string) => {
    if (!editingCombo) return;

    const product = products.find(p => p._id === productId);
    if (!product) return;

    const isSelected = editingCombo.products.some(p => p.productId === productId);
    if (isSelected) {
      const updatedProducts = editingCombo.products.filter(p => p.productId !== productId);
      setEditingCombo({
        ...editingCombo,
        products: updatedProducts
      });

      const updatedQuantities = { ...selectedProductQuantities };
      delete updatedQuantities[productId];
      setSelectedProductQuantities(updatedQuantities);

      updateEditComboProducts(updatedProducts);
    } else {
      const updatedProducts = [...editingCombo.products, { productId, quantity: 1 }];
      setEditingCombo({
        ...editingCombo,
        products: updatedProducts
      });

      const updatedQuantities = {
        ...selectedProductQuantities,
        [productId]: 1
      };
      setSelectedProductQuantities(updatedQuantities);

      updateEditComboProducts(updatedProducts);
    }
  };

  // Update product quantity for new combo
  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) quantity = 1;

    const updatedQuantities = {
      ...selectedProductQuantities,
      [productId]: quantity
    };
    setSelectedProductQuantities(updatedQuantities);

    const updatedSelectedProducts = [...selectedProducts];
    updateNewComboProducts(updatedSelectedProducts, updatedQuantities);
  };

  // Update product quantity for edit
  const handleEditQuantityChange = (productId: string, quantity: number) => {
    if (!editingCombo) return;

    if (quantity < 1) quantity = 1;

    const updatedQuantities = {
      ...selectedProductQuantities,
      [productId]: quantity
    };
    setSelectedProductQuantities(updatedQuantities);

    const updatedProducts = editingCombo.products.map(p =>
      p.productId === productId ? { ...p, quantity } : p
    );
    setEditingCombo({
      ...editingCombo,
      products: updatedProducts
    });
    updateEditComboProducts(updatedProducts);
  };

  // Update new combo products with quantities
  const updateNewComboProducts = (productList: Product[], quantities: Record<string, number>) => {
    const comboProducts = productList.map(p => ({
      productId: p._id,
      quantity: quantities[p._id] || 1
    }));

    const originalTotal = calculateOriginalTotal(comboProducts, products);
    const discountedPrice = newCombo.pricing.discountedPrice || originalTotal * 0.8;

    setNewCombo(prev => ({
      ...prev,
      products: comboProducts,
      pricing: {
        ...prev.pricing,
        originalTotal,
        discountedPrice,
        discountPercentage: calculateDiscountPercentage(originalTotal, discountedPrice)
      }
    }));
  };

  // Update edit combo products
  const updateEditComboProducts = (comboProducts: Array<{ productId: string; quantity: number }>) => {
    if (!editingCombo) return;

    const originalTotal = calculateOriginalTotal(comboProducts, products);
    const discountedPrice = editingCombo.pricing.discountedPrice || originalTotal * 0.8;

    setEditingCombo({
      ...editingCombo,
      products: comboProducts,
      pricing: {
        ...editingCombo.pricing,
        originalTotal,
        discountedPrice,
        discountPercentage: calculateDiscountPercentage(originalTotal, discountedPrice)
      }
    });
  };

  // Enhanced drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, isUpdate: boolean) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (isUpdate) {
      await updateComboImageUpload.uploadImages(files);
    } else {
      await newComboImageUpload.uploadImages(files);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isUpdate: boolean
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (isUpdate) {
      await updateComboImageUpload.uploadImages(files);
    } else {
      await newComboImageUpload.uploadImages(files);
    }

    const inputId = isUpdate ? 'updateComboImage' : 'newComboImage';
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
  };

  const triggerFileInput = (isUpdate: boolean) => {
    const inputId = isUpdate ? 'updateComboImage' : 'newComboImage';
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  // Prepare media data for API with enhanced metadata
  const prepareMediaData = (images: UploadedImage[]) => {
    const thumbnailImage = images.find(img => img.isThumbnail);
    const galleryImages = images.filter(img => !img.isThumbnail).map(img => img.url);

    return {
      media: {
        thumbnail: thumbnailImage ? thumbnailImage.url : '',
        gallery: galleryImages,
        alt: newCombo.name || 'Fashion combo image'
      },
      thumbnail: thumbnailImage ? thumbnailImage.url : '',
      gallery: galleryImages
    };
  };

  // Handle add combo submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCombo.name || selectedProducts.length === 0) {
      toast.error('Please provide a combo name and select at least one fashion product');
      return;
    }

    if (newCombo.pricing.discountedPrice >= newCombo.pricing.originalTotal) {
      toast.error('Discounted price must be less than original total');
      return;
    }

    if (newComboImageUpload.images.length === 0) {
      toast.error('Please upload at least one image for the fashion combo');
      return;
    }

    setIsAddingCombo(true);

    try {
      const mediaData = prepareMediaData(newComboImageUpload.images);
      const comboData = {
        ...newCombo,
        slug: newCombo.slug || generateSlug(newCombo.name),
        tags: newCombo.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        features: newCombo.features.split(',').map(feature => feature.trim()).filter(feature => feature),
        delivery: {
          ...newCombo.delivery,
          message: newCombo.delivery.isFree ? 'Free Delivery on Fashion Orders' : `Delivery Charge: ${formatMoney(newCombo.pricing.currency, newCombo.delivery.charge ?? 0)}`
        },
        ...mediaData
      };

      const response = await fetch('/api/combo-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comboData)
      });

      if (response.ok) {
        const data = await response.json();
        setComboOffers(prev => [...prev, data]);
        setIsAddModalOpen(false);
        resetNewCombo();
        toast.success('Fashion combo created successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData?.error || 'Failed to create fashion combo');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create fashion combo');
      console.error('Create fashion combo error:', error);
    } finally {
      setIsAddingCombo(false);
    }
  };

  // Handle update combo submit
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCombo) return;

    setIsUpdatingCombo(true);

    try {
      const prepareUpdateMediaData = (images: UploadedImage[]) => {
        const thumbnailImage = images.find(img => img.isThumbnail);
        const galleryImages = images.filter(img => !img.isThumbnail).map(img => img.url);

        return {
          media: {
            thumbnail: thumbnailImage ? thumbnailImage.url : '',
            gallery: galleryImages,
            alt: editingCombo.name || 'Fashion combo image'
          },
          thumbnail: thumbnailImage ? thumbnailImage.url : '',
          gallery: galleryImages
        };
      };

      const mediaData = prepareUpdateMediaData(updateComboImageUpload.images);
      const comboData = {
        ...editingCombo,
        tags: editingCombo.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        features: editingCombo.features.split(',').map(feature => feature.trim()).filter(feature => feature),
        delivery: {
          ...editingCombo.delivery,
          message: editingCombo.delivery.isFree ? 'Free Delivery on Fashion Orders' : `Delivery Charge: ${formatMoney(editingCombo.pricing.currency, editingCombo.delivery.charge ?? 0)}`
        },
        ...mediaData
      };

      const response = await fetch(`/api/combo-offers/${editingCombo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comboData)
      });

      if (response.ok) {
        const data = await response.json();
        setComboOffers(prev => prev.map(c => c._id === editingCombo._id ? data : c));
        setIsUpdateModalOpen(false);
        updateComboImageUpload.setImages([]);
        setEditingCombo(null);
        setSelectedProductQuantities({});
        toast.success('Fashion combo updated successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData?.error || 'Failed to update fashion combo');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update fashion combo');
      console.error('Update fashion combo error:', error);
    } finally {
      setIsUpdatingCombo(false);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!comboToDelete) return;

    setIsDeletingCombo(true);
    try {
      const response = await fetch(`/api/combo-offers/${comboToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setComboOffers(prev => prev.filter(c => c._id !== comboToDelete));
        setIsDeleteModalOpen(false);
        setComboToDelete(null);
        toast.success('Fashion combo deleted successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData?.error || 'Failed to delete fashion combo');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete fashion combo');
      console.error('Delete fashion combo error:', error);
    } finally {
      setIsDeletingCombo(false);
    }
  };

  // Reset new combo form
  const resetNewCombo = () => {
    setNewCombo({
      name: '',
      description: '',
      slug: '',
      products: [],
      pricing: {
        originalTotal: 0,
        discountedPrice: 0,
        discountPercentage: 0,
        currency: 'BDT'
      },
      validity: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      tags: '',
      features: '',
      thumbnail: '',
      gallery: [],
      delivery: {
        isFree: true,
        charge: 0,
        message: 'Free Delivery on Fashion Orders'
      }
    });
    setSelectedProducts([]);
    setSelectedProductQuantities({});
    newComboImageUpload.setImages([]);
  };

  // Check if offer is active
  const isOfferActive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  // Calculate savings
  const calculateSavings = (combo: ComboOffer) => {
    return combo.pricing.originalTotal - combo.pricing.discountedPrice;
  };

  const formatPrice = (value: number) => {
    if (!Number.isFinite(value)) return '0.00';
    return value.toFixed(2);
  };

  const getCurrencySymbol = (currency: string) => {
    if (currency === 'BDT') return '৳';
    return currency;
  };

  const formatMoney = (currency: string, value: number) => {
    const symbol = getCurrencySymbol(currency);
    return symbol ? `${symbol} ${formatPrice(value)}` : formatPrice(value);
  };

  // Filtered products by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter(product =>
      product.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      product.name?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [products, selectedCategory]);

  // Render image gallery with drag and drop support
  const renderImageGallery = (images: UploadedImage[], isUpdate: boolean) => {
    const uploadHook = isUpdate ? updateComboImageUpload : newComboImageUpload;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
        {images.map((image, index) => (
          <DraggableImage
            key={image.url}
            image={image}
            index={index}
            onSetThumbnail={(url) => uploadHook.setThumbnail(url)}
            onRemove={(url) => uploadHook.removeImage(url)}
            onReorder={uploadHook.reorderImages}
          />
        ))}
      </div>
    );
  };

  // Render product selection for edit modal
  const renderEditProductSelection = () => {
    if (!editingCombo) return null;

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Select Fashion Products for Combo *
          </label>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {editingCombo.products.length} fashion item(s) selected
          </span>
        </div>

        {/* Category Filter */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Filter by Category
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs rounded-full transition-all ${selectedCategory === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              All Items
            </button>
            {fashionCategories.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-xs rounded-full transition-all ${selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-2">
          {filteredProducts.map((product) => {
            const isSelected = editingCombo.products.some(p => p.productId === product._id);
            const selectedProduct = editingCombo.products.find(p => p.productId === product._id);
            const quantity = selectedProductQuantities[product._id] || selectedProduct?.quantity || 1;

            return (
              <div
                key={product._id}
                onClick={() => handleEditProductSelect(product._id)}
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${isSelected
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {product.media?.thumbnail ? (
                      <Image
                        src={product.media.thumbnail}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-gray-400 m-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {product.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatMoney(product.pricing.current.currency, product.pricing.current.value)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded text-xs ${product.inventory.status === 'in_stock'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                        {product.inventory.status.replace('_', ' ')}
                      </span>
                      {product.category && (
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {product.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-gray-300 dark:border-gray-600'
                    }`}>
                    {isSelected && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div
                    className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => handleEditQuantityChange(product._id, parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 px-3 text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 md:p-10 font-sans">
      <style jsx global>{`
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
        html, body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-linear-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">RBS</span>
          </div>
          <div>
            <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Robe By Shamshad
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
              Fashion Combo Collections - Exclusive Bundles for Modest Fashion
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 shadow-lg overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-5 md:px-10 md:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Fashion Combo Collections
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {comboOffers.length} fashion combos • {comboOffers.filter(c => c.inventory.status === 'active').length} active collections
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>Create Fashion Combo</span>
          </button>
        </div>

        {/* Search and Stats */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-linear-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <Gift className="h-6 w-6 text-purple-500 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Fashion Bundles & Collections
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Curated fashion sets for complete modest looks
                </p>
              </div>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute top-1/2 -translate-y-1/2 left-4 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search fashion combos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm hover:shadow-md cursor-text"
              />
            </div>
          </div>

          {/* Combo Offers Grid */}
          <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-8">
            {isFetching ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: pageLimit }).map((_, index) => (
                  <div key={index} className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 p-6 shadow-sm">
                    <Skeleton className="w-full h-52 rounded-2xl skeleton-pulse" />
                    <div className="mt-4 space-y-3">
                      <Skeleton className="h-6 w-3/4 rounded-lg skeleton-pulse" />
                      <Skeleton className="h-4 w-1/2 rounded-lg skeleton-pulse" />
                      <Skeleton className="h-4 w-1/3 rounded-lg skeleton-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comboOffers.length === 0 ? (
              <div className="text-center p-12 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                <div className="w-16 h-16 rounded-full bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No fashion combos yet
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  Create your first fashion bundle to offer complete outfits
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                  Create Your First Fashion Bundle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {comboOffers.map((combo) => {
                  const isActive = isOfferActive(combo.validity.startDate, combo.validity.endDate);
                  const savings = calculateSavings(combo);

                  return (
                    <div
                      key={combo._id}
                      className="group relative bg-linear-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                    >
                      {/* Status Badge */}
                      <div className="absolute top-4 left-4 z-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${isActive && combo.inventory.status === 'active'
                          ? 'bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-500/30'
                          : 'bg-gray-500/20 text-gray-800 dark:text-gray-200 border border-gray-500/30'
                          }`}>
                          {isActive && combo.inventory.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Discount Badge */}
                      <div className="absolute top-4 right-4 z-1">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-linear-to-r from-purple-600 to-pink-600 text-white text-xs font-bold">
                          {combo.pricing.discountPercentage}% OFF
                        </span>
                      </div>

                      {/* Delivery Badge */}
                      {combo.delivery?.isFree && (
                        <div className="absolute top-12 left-4 z-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-500/30 text-xs font-semibold">
                            <Truck className="h-3 w-3 mr-1" />
                            Free Delivery
                          </span>
                        </div>
                      )}

                      {/* Combo Image */}
                      <div className="relative w-full h-48 overflow-hidden">
                        {combo.thumbnail ? (
                          <>
                            <Image
                              src={combo.thumbnail}
                              alt={combo.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                          </>
                        ) : combo.gallery.length > 0 ? (
                          <>
                            <Image
                              src={combo.gallery[0]}
                              alt={combo.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                          </>
                        ) : (
                          <div className="w-full h-full bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <Gift className="h-16 w-16 text-white/30" />
                          </div>
                        )}

                        {/* Gallery Count Badge */}
                        {combo.gallery.length > 0 && (
                          <div className="absolute top-4 right-12">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-500/20 text-blue-100 border border-blue-400/30 backdrop-blur-md">
                              <Camera className="h-3 w-3 mr-1" />
                              {combo.gallery.length}
                            </span>
                          </div>
                        )}

                        {/* Product Count Overlay */}
                        <div className="absolute bottom-4 left-4 flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-black/50 backdrop-blur-sm">
                            <Layers className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-white font-bold text-lg">
                            {combo.products.length} items
                          </span>
                        </div>
                      </div>

                      {/* Combo Content */}
                      <div className="p-6">
                        {/* Title and Description */}
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                            {combo.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {combo.description}
                          </p>
                        </div>

                        {/* Pricing */}
                        <div className="mb-4 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/40 p-4 shadow-sm">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                                Combo Price
                              </p>
                              <div className="flex items-baseline gap-2">
                                <span className="text-md font-bold text-gray-900 dark:text-white">
                                  {formatMoney(combo.pricing.currency, combo.pricing.discountedPrice)}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                  {formatMoney(combo.pricing.currency, combo.pricing.originalTotal)}
                                </span>
                              </div>
                            </div>

                          </div>
                          <div className="flex items-center gap-3 rounded-lg border border-green-200/70 dark:border-green-900/50 bg-green-50/70 dark:bg-green-950/30 px-3 py-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                              <Zap className="h-4 w-4" />
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[11px] uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
                                You save
                              </span>
                              <span className="text-sm font-semibold text-green-900 dark:text-green-200">
                                {formatMoney(combo.pricing.currency, savings)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {combo.delivery?.isFree && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium">
                                <Truck className="h-3 w-3 mr-1" />
                                Free Delivery
                              </span>
                            )}
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 text-xs font-medium">
                              <Percent className="h-3 w-3 mr-1" />
                              {combo.pricing.discountPercentage}% off
                            </span>
                          </div>
                        </div>

                        {/* Products Preview */}
                        <div className="mb-4">
                          <div className="flex -space-x-2">
                            {combo.products.slice(0, 4).map((item, index) => (
                              <div
                                key={index}
                                className="relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 overflow-hidden bg-gray-100 dark:bg-gray-700"
                                title={`${item.product?.name || 'Fashion Item'} (${item.quantity})`}
                              >
                                {item.product?.media?.thumbnail ? (
                                  <Image
                                    src={item.product.media.thumbnail}
                                    alt=""
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                                {item.quantity > 1 && (
                                  <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                                    ×{item.quantity}
                                  </div>
                                )}
                              </div>
                            ))}
                            {combo.products.length > 4 && (
                              <div className="relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                  +{combo.products.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Validity and Stock */}
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div className="flex justify-between">
                            <span>Valid until:</span>
                            <span className="font-medium">
                              {new Date(combo.validity.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stock:</span>
                            <span className={`font-medium ${combo.inventory.totalStock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                              {combo.inventory.totalStock - combo.inventory.soldCount} left
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>
                              Created {new Date(combo.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewCombo(combo._id)}
                              className="flex items-center justify-center h-8 w-8 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer group"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 group-hover:scale-110" />
                            </button>
                            <button
                              onClick={() => handleUpdateCombo(combo._id)}
                              className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 cursor-pointer group"
                              title="Edit Fashion Combo"
                            >
                              <Edit className="h-4 w-4 group-hover:scale-110" />
                            </button>
                            <button
                              onClick={() => handleDeleteCombo(combo._id)}
                              className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 cursor-pointer group"
                              title="Delete Fashion Combo"
                            >
                              <Trash2 className="h-4 w-4 group-hover:scale-110" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {comboOffers.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-5">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2 rounded-full bg-linear-to-r from-purple-600 to-pink-600 px-5 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  onClick={() => handlePageChange(currentPage > 1 ? currentPage - 1 : 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <ul className="hidden sm:flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <li key={page}>
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer ${currentPage === page
                              ? 'bg-purple-500 text-white'
                              : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                          >
                            {page}
                          </button>
                        </li>
                      );
                    }
                    return null;
                  })}
                </ul>

                <button
                  className="flex items-center gap-2 rounded-full bg-linear-to-r from-purple-600 to-pink-600 px-5 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  onClick={() => handlePageChange(currentPage < totalPages ? currentPage + 1 : totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add New Fashion Combo Modal */}
      <Transition appear show={isAddModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsAddModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/90 backdrop-blur-md" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                  <Dialog.Title as="h3" className="text-3xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                    Create New Fashion Combo
                  </Dialog.Title>

                  <form onSubmit={handleAddSubmit} className="space-y-6">
                    {/* Fashion Combo Images Section */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Fashion Combo Images ({newComboImageUpload.images.length}/{MAX_IMAGES})
                      </label>
                      <div
                        className={`relative flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 ${isDragging
                          ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/50'
                          : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80'
                          } transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer`}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, false)}
                      >
                        {newComboImageUpload.uploading ? (
                          <div className="flex flex-col items-center justify-center px-4">
                            <Loader2 className="animate-spin h-8 w-8 text-purple-500 dark:text-purple-400 mb-3" />
                            <div className="text-center mb-3">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Processing Images... {Math.round(newComboImageUpload.progress)}%
                              </div>
                              {newComboImageUpload.currentFileName && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {newComboImageUpload.currentFileName}
                                </div>
                              )}
                            </div>
                            <div className="w-56 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                              <div
                                className="h-full bg-linear-to-r from-purple-400 to-pink-600 transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${Math.max(5, newComboImageUpload.progress)}%` }}
                              />
                            </div>
                            {newComboImageUpload.errors.length > 0 && (
                              <div className="mt-2 text-xs text-red-500 dark:text-red-400 text-center">
                                {newComboImageUpload.errors.length} error(s) occurred
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Drag and drop fashion images here, or
                            </p>
                            <button
                              type="button"
                              onClick={() => triggerFileInput(false)}
                              className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-200 cursor-pointer"
                            >
                              Browse Files
                            </button>
                            <input
                              id="newComboImage"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileInputChange(e, false)}
                              className="hidden"
                              aria-label="Upload fashion combo images"
                              multiple
                            />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Upload up to {MAX_IMAGES} images (max {MAX_FILE_SIZE / (1024 * 1024)}MB each).
                        Show different angles of the fashion combo.
                      </p>

                      {newComboImageUpload.errors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                            Upload Issues:
                          </div>
                          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                            {newComboImageUpload.errors.slice(0, 3).map((error, index) => (
                              <div key={index}>• {error}</div>
                            ))}
                            {newComboImageUpload.errors.length > 3 && (
                              <div className="text-red-600 dark:text-red-400">
                                ... and {newComboImageUpload.errors.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {newComboImageUpload.images.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                            Uploaded Images ({newComboImageUpload.images.length}/{MAX_IMAGES})
                          </h4>
                          {renderImageGallery(newComboImageUpload.images, false)}
                        </div>
                      )}
                    </div>

                    {/* Fashion Combo Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Fashion Combo Name *
                      </label>
                      <input
                        type="text"
                        value={newCombo.name}
                        onChange={(e) => setNewCombo({
                          ...newCombo,
                          name: e.target.value,
                          slug: generateSlug(e.target.value)
                        })}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                        placeholder="e.g., Complete Abaya Set, Hijab & Dress Combo, Modest Summer Collection"
                        required
                      />

                      {/* Fashion Combo Type Suggestions */}
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Popular fashion combo types:</p>
                        <div className="flex flex-wrap gap-2">
                          {fashionComboTypes.map((type) => (
                            <button
                              type="button"
                              key={type}
                              onClick={() => setNewCombo({
                                ...newCombo,
                                name: type,
                                slug: generateSlug(type)
                              })}
                              className="px-3 py-1.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Slug
                        </label>
                        <input
                          type="text"
                          value={newCombo.slug}
                          onChange={(e) => setNewCombo({ ...newCombo, slug: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                          placeholder="Auto-generated from name"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Will auto-generate with brand name prefix
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Description
                      </label>
                      <textarea
                        value={newCombo.description}
                        onChange={(e) => setNewCombo({ ...newCombo, description: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                        placeholder="Describe this fashion combo (e.g., Complete modest outfit set for summer, Perfect for special occasions...)"
                        rows={3}
                      />
                    </div>

                    {/* Fashion Product Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Select Fashion Products for Combo *
                        </label>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedProducts.length} fashion item(s) selected
                        </span>
                      </div>

                      {/* Category Filter */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Filter by Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 py-1.5 text-xs rounded-full transition-all ${selectedCategory === 'all'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                          >
                            All Items
                          </button>
                          {fashionCategories.map(category => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setSelectedCategory(category)}
                              className={`px-3 py-1.5 text-xs rounded-full transition-all ${selectedCategory === category
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-2">
                        {filteredProducts.map((product) => {
                          const isSelected = selectedProducts.some(p => p._id === product._id);
                          const quantity = selectedProductQuantities[product._id] || 1;

                          return (
                            <div
                              key={product._id}
                              onClick={() => handleProductSelect(product._id)}
                              className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${isSelected
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                  {product.media?.thumbnail ? (
                                    <Image
                                      src={product.media.thumbnail}
                                      alt={product.name}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <Package className="h-6 w-6 text-gray-400 m-3" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                    {product.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {formatMoney(product.pricing.current.currency, product.pricing.current.value)}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-1 rounded text-xs ${product.inventory.status === 'in_stock'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                      }`}>
                                      {product.inventory.status.replace('_', ' ')}
                                    </span>
                                    {product.category && (
                                      <span className="px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                        {product.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
                                  ? 'bg-purple-500 border-purple-500'
                                  : 'border-gray-300 dark:border-gray-600'
                                  }`}>
                                  {isSelected && (
                                    <CheckCircle className="h-3 w-3 text-white" />
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <div
                                  className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                    Quantity
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => handleQuantityChange(product._id, parseInt(e.target.value) || 1)}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 px-3 text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Pricing Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Original Total
                          </label>
                          <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {formatMoney(newCombo.pricing.currency, newCombo.pricing.originalTotal)}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Sum of all selected fashion items
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Discounted Price *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newCombo.pricing.discountedPrice}
                            onChange={(e) => {
                              const discountedPrice = parseFloat(e.target.value) || 0;
                              setNewCombo(prev => ({
                                ...prev,
                                pricing: {
                                  ...prev.pricing,
                                  discountedPrice,
                                  discountPercentage: calculateDiscountPercentage(prev.pricing.originalTotal, discountedPrice)
                                }
                              }));
                            }}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Discount Percentage
                          </label>
                          <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {newCombo.pricing.discountPercentage}%
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Auto-calculated
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Section */}
                    <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Delivery Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                            <input
                              type="checkbox"
                              checked={newCombo.delivery.isFree}
                              onChange={(e) => setNewCombo({
                                ...newCombo,
                                delivery: {
                                  ...newCombo.delivery,
                                  isFree: e.target.checked,
                                  charge: e.target.checked ? 0 : newCombo.delivery.charge,
                                  message: e.target.checked ? 'Free Delivery' : `Delivery Charge: ${formatMoney(newCombo.pricing.currency, newCombo.delivery.charge ?? 0)}`
                                }
                              })}
                              className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-500 dark:focus:ring-orange-400 cursor-pointer"
                            />
                            <span className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Free Delivery
                            </span>
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                            Attract customers with free delivery offer
                          </p>
                        </div>

                        {!newCombo.delivery.isFree && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                              Delivery Charge
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newCombo.delivery.charge}
                                onChange={(e) => setNewCombo({
                                  ...newCombo,
                                  delivery: {
                                    ...newCombo.delivery,
                                    charge: parseFloat(e.target.value) || 0,
                                    message: `Delivery Charge: ${formatMoney(newCombo.pricing.currency, parseFloat(e.target.value) || 0)}`
                                  }
                                })}
                                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:focus:ring-orange-400 transition-all duration-300 shadow-sm cursor-text"
                              />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {getCurrencySymbol(newCombo.pricing.currency)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Validity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={newCombo.validity.startDate}
                          onChange={(e) => setNewCombo({
                            ...newCombo,
                            validity: { ...newCombo.validity, startDate: e.target.value }
                          })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={newCombo.validity.endDate}
                          onChange={(e) => setNewCombo({
                            ...newCombo,
                            validity: { ...newCombo.validity, endDate: e.target.value }
                          })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                        />
                      </div>
                    </div>

                    {/* Fashion Tags and Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Fashion Tags
                        </label>
                        <input
                          type="text"
                          value={newCombo.tags}
                          onChange={(e) => setNewCombo({ ...newCombo, tags: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                          placeholder="abaya, hijab, modest, summer, formal, casual, prayer (comma separated)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Features
                        </label>
                        <input
                          type="text"
                          value={newCombo.features}
                          onChange={(e) => setNewCombo({ ...newCombo, features: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                          placeholder="complete outfit, matching set, free hijab, prayer dress included (comma separated)"
                        />
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddModalOpen(false);
                          resetNewCombo();
                        }}
                        className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAddingCombo || selectedProducts.length === 0 || newComboImageUpload.uploading}
                        className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer ${(isAddingCombo || selectedProducts.length === 0 || newComboImageUpload.uploading) ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                      >
                        {isAddingCombo ? (
                          <>
                            <Loader2 className="animate-spin h-5 w-5 text-white mr-2" />
                            Creating Fashion Combo...
                          </>
                        ) : (
                          'Create Fashion Combo'
                        )}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Update Fashion Combo Modal */}
      <Transition appear show={isUpdateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsUpdateModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/90 backdrop-blur-md" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                  <Dialog.Title as="h3" className="text-3xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                    Edit Fashion Combo
                  </Dialog.Title>

                  {editingCombo && (
                    <form onSubmit={handleUpdateSubmit} className="space-y-6">
                      {/* Fashion Combo Images Section */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Fashion Combo Images ({updateComboImageUpload.images.length}/{MAX_IMAGES})
                        </label>
                        <div
                          className={`relative flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 ${isDragging
                            ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/50'
                            : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80'
                            } transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer`}
                          onDragOver={handleDragOver}
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, true)}
                        >
                          {updateComboImageUpload.uploading ? (
                            <div className="flex flex-col items-center justify-center px-4">
                              <Loader2 className="animate-spin h-8 w-8 text-purple-500 dark:text-purple-400 mb-3" />
                              <div className="text-center mb-3">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                  Processing Images... {Math.round(updateComboImageUpload.progress)}%
                                </div>
                                {updateComboImageUpload.currentFileName && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                    {updateComboImageUpload.currentFileName}
                                  </div>
                                )}
                              </div>
                              <div className="w-56 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className="h-full bg-linear-to-r from-purple-400 to-pink-600 transition-all duration-500 ease-out rounded-full"
                                  style={{ width: `${Math.max(5, updateComboImageUpload.progress)}%` }}
                                />
                              </div>
                              {updateComboImageUpload.errors.length > 0 && (
                                <div className="mt-2 text-xs text-red-500 dark:text-red-400 text-center">
                                  {updateComboImageUpload.errors.length} error(s) occurred
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Drag and drop fashion images here, or
                              </p>
                              <button
                                type="button"
                                onClick={() => triggerFileInput(true)}
                                className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-200 cursor-pointer"
                              >
                                Browse Files
                              </button>
                              <input
                                id="updateComboImage"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileInputChange(e, true)}
                                className="hidden"
                                aria-label="Upload fashion combo images"
                                multiple
                              />
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Upload up to {MAX_IMAGES} images (max {MAX_FILE_SIZE / (1024 * 1024)}MB each).
                          Show different angles of the fashion combo.
                        </p>

                        {updateComboImageUpload.errors.length > 0 && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                              Upload Issues:
                            </div>
                            <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                              {updateComboImageUpload.errors.slice(0, 3).map((error, index) => (
                                <div key={index}>• {error}</div>
                              ))}
                              {updateComboImageUpload.errors.length > 3 && (
                                <div className="text-red-600 dark:text-red-400">
                                  ... and {updateComboImageUpload.errors.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {updateComboImageUpload.images.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                              Fashion Combo Images ({updateComboImageUpload.images.length}/{MAX_IMAGES})
                            </h4>
                            {renderImageGallery(updateComboImageUpload.images, true)}
                          </div>
                        )}
                      </div>

                      {/* Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Fashion Combo Name *
                          </label>
                          <input
                            type="text"
                            value={editingCombo.name}
                            onChange={(e) => setEditingCombo({
                              ...editingCombo,
                              name: e.target.value,
                              slug: generateSlug(e.target.value)
                            })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                            placeholder="e.g., Complete Abaya Set, Hijab & Dress Combo"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Slug
                          </label>
                          <input
                            type="text"
                            value={editingCombo.slug}
                            onChange={(e) => setEditingCombo({ ...editingCombo, slug: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                            placeholder="Auto-generated from name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Description
                        </label>
                        <textarea
                          value={editingCombo.description}
                          onChange={(e) => setEditingCombo({ ...editingCombo, description: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                          placeholder="Describe this fashion combo..."
                          rows={3}
                        />
                      </div>

                      {/* Product Selection for Edit */}
                      {renderEditProductSelection()}

                      {/* Pricing */}
                      <div className="bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Pricing Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                              Original Total
                            </label>
                            <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white">
                              {formatMoney(editingCombo.pricing.currency, editingCombo.pricing.originalTotal)}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Sum of all selected fashion items
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                              Discounted Price *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingCombo.pricing.discountedPrice}
                              onChange={(e) => {
                                const discountedPrice = parseFloat(e.target.value) || 0;
                                setEditingCombo(prev => ({
                                  ...prev!,
                                  pricing: {
                                    ...prev!.pricing,
                                    discountedPrice,
                                    discountPercentage: calculateDiscountPercentage(prev!.pricing.originalTotal, discountedPrice)
                                  }
                                }));
                              }}
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                              Discount Percentage
                            </label>
                            <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white">
                              {editingCombo.pricing.discountPercentage}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Delivery Section */}
                      <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Delivery Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                              <input
                                type="checkbox"
                                checked={editingCombo.delivery.isFree}
                                onChange={(e) => setEditingCombo({
                                  ...editingCombo,
                                  delivery: {
                                    ...editingCombo.delivery,
                                    isFree: e.target.checked,
                                    charge: e.target.checked ? 0 : editingCombo.delivery.charge,
                                    message: e.target.checked ? 'Free Delivery' : `Delivery Charge: ${formatMoney(editingCombo.pricing.currency, editingCombo.delivery.charge ?? 0)}`
                                  }
                                })}
                                className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-500 dark:focus:ring-orange-400 cursor-pointer"
                              />
                              <span className="flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                Free Delivery
                              </span>
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                              Attract customers with free delivery offer
                            </p>
                          </div>

                          {!editingCombo.delivery.isFree && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Delivery Charge
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editingCombo.delivery.charge}
                                  onChange={(e) => setEditingCombo({
                                    ...editingCombo,
                                    delivery: {
                                      ...editingCombo.delivery,
                                      charge: parseFloat(e.target.value) || 0,
                                      message: `Delivery Charge: ${formatMoney(editingCombo.pricing.currency, parseFloat(e.target.value) || 0)}`
                                    }
                                  })}
                                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:focus:ring-orange-400 transition-all duration-300 shadow-sm cursor-text"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {getCurrencySymbol(editingCombo.pricing.currency)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Validity */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={editingCombo.validity.startDate}
                            onChange={(e) => setEditingCombo({
                              ...editingCombo,
                              validity: { ...editingCombo.validity, startDate: e.target.value }
                            })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={editingCombo.validity.endDate}
                            onChange={(e) => setEditingCombo({
                              ...editingCombo,
                              validity: { ...editingCombo.validity, endDate: e.target.value }
                            })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                          />
                        </div>
                      </div>

                      {/* Tags and Features */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Fashion Tags
                          </label>
                          <input
                            type="text"
                            value={editingCombo.tags}
                            onChange={(e) => setEditingCombo({ ...editingCombo, tags: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                            placeholder="abaya, hijab, modest, summer (comma separated)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Features
                          </label>
                          <input
                            type="text"
                            value={editingCombo.features}
                            onChange={(e) => setEditingCombo({ ...editingCombo, features: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                            placeholder="complete outfit, matching set (comma separated)"
                          />
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUpdateModalOpen(false);
                            updateComboImageUpload.setImages([]);
                            setEditingCombo(null);
                            setSelectedProductQuantities({});
                          }}
                          className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdatingCombo || editingCombo.products.length === 0 || updateComboImageUpload.uploading}
                          className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer ${(isUpdatingCombo || editingCombo.products.length === 0 || updateComboImageUpload.uploading) ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                          {isUpdatingCombo ? (
                            <>
                              <Loader2 className="animate-spin h-5 w-5 text-white mr-2" />
                              Updating Fashion Combo...
                            </>
                          ) : (
                            'Update Fashion Combo'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* View Fashion Combo Modal */}
      <Transition appear show={isViewModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsViewModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/90 backdrop-blur-md" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                  {selectedCombo && (
                    <>
                      <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                        {selectedCombo.name}
                      </Dialog.Title>

                      {/* Fashion Combo Images */}
                      <div className="mb-6">
                        <div className="relative h-64 w-full rounded-2xl overflow-hidden mb-4">
                          {selectedCombo.thumbnail ? (
                            <Image
                              src={selectedCombo.thumbnail}
                              alt={selectedCombo.name}
                              fill
                              className="object-cover"
                            />
                          ) : selectedCombo.gallery.length > 0 ? (
                            <Image
                              src={selectedCombo.gallery[0]}
                              alt={selectedCombo.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                              <Gift className="h-16 w-16 text-white/30" />
                            </div>
                          )}
                        </div>

                        {selectedCombo.gallery.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {selectedCombo.gallery.map((image, index) => (
                              <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                                <Image
                                  src={image}
                                  alt={`Gallery ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Fashion Combo Details */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
                          <p className="text-gray-700 dark:text-gray-300">{selectedCombo.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Discount</p>
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {selectedCombo.pricing.discountPercentage}% OFF
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${selectedCombo.inventory.status === 'active'
                              ? 'bg-purple-500/20 text-purple-800 dark:text-purple-200'
                              : selectedCombo.inventory.status === 'sold_out'
                                ? 'bg-red-500/20 text-red-800 dark:text-red-200'
                                : 'bg-gray-500/20 text-gray-800 dark:text-gray-200'
                              }`}>
                              {selectedCombo.inventory.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Delivery Info */}
                        {selectedCombo.delivery && (
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Delivery</p>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${selectedCombo.delivery.isFree
                              ? 'bg-blue-500/20 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-500/20 text-gray-800 dark:text-gray-200'
                              }`}>
                              <Truck className="h-3 w-3 mr-1" />
                              {selectedCombo.delivery.isFree
                                ? 'Free Delivery on Fashion Orders'
                                : `Delivery Charge: ${formatMoney(selectedCombo.pricing.currency, selectedCombo.delivery.charge ?? 0)}`}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Fashion Items in Combo</p>
                          <div className="space-y-2">
                            {selectedCombo.products.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg overflow-hidden">
                                    {item.product?.media?.thumbnail ? (
                                      <Image
                                        src={item.product.media.thumbnail}
                                        alt={item.product.name}
                                        width={32}
                                        height={32}
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                        <Package className="h-4 w-4 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium">{item.product?.name || 'Fashion Item'}</span>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.quantity} × {formatMoney(selectedCombo.pricing.currency, item.product?.pricing.current.value ?? 0)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                            <div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">Total Price</span>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatMoney(selectedCombo.pricing.currency, selectedCombo.pricing.discountedPrice)}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-through">
                              {formatMoney(selectedCombo.pricing.currency, selectedCombo.pricing.originalTotal)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsViewModalOpen(false)}
                          className="inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/90 backdrop-blur-md" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all">
                  <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Delete Fashion Combo
                  </Dialog.Title>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Are you sure you want to delete this fashion combo? This action cannot be undone.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteConfirm}
                      disabled={isDeletingCombo}
                      className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-semibold text-white hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer ${isDeletingCombo ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                      {isDeletingCombo ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5 text-white mr-2" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Fashion Combo'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default FashionComboPage;
