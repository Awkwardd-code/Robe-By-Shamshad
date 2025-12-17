/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, Fragment, useMemo, useCallback } from 'react';
import {
  Search, Edit, Trash2, Plus, ChevronLeft, ChevronRight,
  X, Star, Package, Images, ShieldCheck, Tag, Percent,
  ShoppingCart, Calendar, Gift, Zap, CheckCircle, Layers,
  Upload, Image as ImageIcon, Loader2, Eye, Camera, GripVertical,
  Truck, Link, Grid3x3, TrendingUp, Clock, Filter, RefreshCw,
  FolderOpen, EyeOff, Sparkles, Target, BarChart3, Users,
  Globe, ShoppingBag, Award, Heart, Bookmark, Home, Save,
  Scissors, Palette, User, Hash, TrendingDown, ShoppingBasket
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { toast, ToastContainer } from 'react-toastify';
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
    gallery: string[];
  };
  ratings: {
    averageRating: number;
  };
  slug: string;
  tags: string[];
}

interface ComboOffer {
  _id: string;
  name: string;
  description: string;
  slug: string;
  pricing: {
    originalTotal: number;
    discountedPrice: number;
    discountPercentage: number;
    currency: string;
  };
  thumbnail: string;
  tags: string[];
  inventory: {
    status: 'active' | 'inactive' | 'sold_out';
  };
}

interface CollectionItem {
  type: 'product' | 'combo';
  refId: string;
  name: string;
  price: number;
  thumbnail: string;
  slug?: string;
  product?: Product;
  combo?: ComboOffer;
}

interface Collection {
  _id: string;
  bannerImage: string;
  bannerTitle: string;
  bannerDescription: string;
  slug: string;
  tags: string[];
  collections: CollectionItem[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  sortOrder: number;
  visibility: 'public' | 'private' | 'scheduled';
  scheduledDate?: string;
  views: number;
  clicks: number;
}

interface CollectionForm {
  _id?: string;
  bannerImage: string;
  bannerTitle: string;
  bannerDescription: string;
  slug: string;
  tags: string;
  collections: CollectionItem[];
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  sortOrder: number;
  visibility: 'public' | 'private' | 'scheduled';
  scheduledDate?: string;
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

const DEFAULT_PAGE_LIMIT = 8;
const MAX_IMAGES = 1; // only one banner image allowed at a time
const MAX_BANNER_SIZE = 10 * 1024 * 1024; // 10MB for banner
const MODAL_SCROLLBAR_CLASS = 'modal-scrollbar-hidden';

// Fashion collection types
const fashionCollectionTypes = [
  'New Arrivals',
  'Best Sellers',
  'Modest Wear',
  'Eid Collection',
  'Summer Collection',
  'Winter Collection',
  'Office Wear',
  'Casual Outfits',
  'Party Wear',
  'Prayer Collection',
  'Hijab Styles',
  'Abaya Designs'
];

// Fashion tags suggestions
const fashionTags = [
  'modest-fashion',
  'abaya',
  'hijab',
  'islamic-clothing',
  'eid-collection',
  'summer-fashion',
  'winter-collection',
  'office-wear',
  'prayer-outfit',
  'traditional',
  'modern',
  'luxury',
  'affordable',
  'premium'
];

// Generate random string
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
  const [currentFileName, setCurrentFileName] = useState<string>('');

  const validateFile = useCallback((file: File, options?: { bypassLimit?: boolean }): string | null => {
    if (!file) {
      return 'No file provided';
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return `File "${file.name}" must be a valid image (JPEG, PNG, WebP, or GIF)`;
    }

    if (file.size > MAX_BANNER_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_BANNER_SIZE / (1024 * 1024)).toFixed(0);
      return `File "${file.name}" is ${sizeMB}MB, exceeds ${maxSizeMB}MB limit`;
    }

    if (file.size < 1024) {
      return `File "${file.name}" is too small (minimum 1KB required)`;
    }

    if (!options?.bypassLimit && images.length >= MAX_IMAGES) {
      return `Maximum ${MAX_IMAGES} images allowed. Please remove some images first.`;
    }

    return null;
  }, [images]);

  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (file.size <= 2 * 1024 * 1024 || file.type === 'image/gif') {
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

            const maxWidth = 1920;
            const maxHeight = 1080;
            let { width, height } = img;

            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = width * ratio;
              height = height * ratio;
            }

            canvas.width = width;
            canvas.height = height;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

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
              0.85
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
          isThumbnail: images.length === 0,
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
  }, [images.length]);

  const deleteFromCloudinary = useCallback(async (publicId: string) => {
    try {
      await fetch(`/api/cloudinary/upload?publicId=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to delete image from Cloudinary:', error);
    }
  }, []);

  const uploadImages = useCallback(async (files: File[], replaceExisting = false): Promise<UploadedImage[]> => {
    if (files.length === 0) return [];

    const previousImages = replaceExisting ? [...images] : [];

    setUploading(true);
    setProgress(0);
    setErrors([]);
    setCurrentFileName('');

    try {
      const validationErrors: string[] = [];
      const validFiles: File[] = [];

      files.forEach(file => {
        const error = validateFile(file, { bypassLimit: replaceExisting });
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

      const existingCount = replaceExisting ? 0 : images.length;
      if (existingCount + validFiles.length > MAX_IMAGES) {
        const error = replaceExisting
          ? `Cannot upload ${validFiles.length} image(s). Maximum ${MAX_IMAGES} image allowed.`
          : `Cannot upload ${validFiles.length} images. Maximum ${MAX_IMAGES} images allowed (${images.length} already uploaded)`;
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
        const updatedImages = replaceExisting ? results : [...images, ...results];
        setImages(updatedImages);

        if (replaceExisting && previousImages.length > 0) {
          await Promise.all(previousImages.map(img =>
            img.publicId ? deleteFromCloudinary(img.publicId) : Promise.resolve()
          ));
        }

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
  }, [compressImage, deleteFromCloudinary, images, uploadToCloudinary, validateFile]);

  const removeImage = useCallback(async (imageUrl: string) => {
    const imageToRemove = images.find(img => img.url === imageUrl);
    if (!imageToRemove) {
      toast.error('Image not found');
      return;
    }

    const updatedImages = images.filter(img => img.url !== imageUrl);
    setImages(updatedImages);

    if (imageToRemove.publicId) {
      await deleteFromCloudinary(imageToRemove.publicId);
    }

    toast.success(`Image "${imageToRemove.fileName || 'Untitled'}" removed successfully!`);
  }, [images, deleteFromCloudinary]);

  const setThumbnail = useCallback((imageUrl: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isThumbnail: img.url === imageUrl
    }));
    setImages(updatedImages);
    toast.success('Banner image updated!');
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
      <div className={`relative aspect-video rounded-lg overflow-hidden border-2 ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-200 dark:border-gray-700'
        }`}>
        <img
          src={image.url}
          alt={`Collection image ${index + 1}`}
          className="h-full w-full object-cover"
        />

        {image.isThumbnail && (
          <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            Banner
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
                title="Set as banner"
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

const FashionCollectionsPage: React.FC = () => {
  // State management
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [comboOffers, setComboOffers] = useState<ComboOffer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [editingCollection, setEditingCollection] = useState<CollectionForm | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [newCollection, setNewCollection] = useState<CollectionForm>({
    bannerImage: '',
    bannerTitle: '',
    bannerDescription: '',
    slug: '',
    tags: '',
    collections: [],
    status: 'draft',
    featured: false,
    sortOrder: 0,
    visibility: 'public'
  });

  const [selectedItems, setSelectedItems] = useState<CollectionItem[]>([]);
  const [searchCatalog, setSearchCatalog] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'combos'>('products');
  const [isDragging, setIsDragging] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [pageLimit, setPageLimit] = useState<number>(DEFAULT_PAGE_LIMIT);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Use custom image upload hooks
  const newCollectionImageUpload = useImageUpload([]);
  const editCollectionImageUpload = useImageUpload([]);

  // Generate slug for fashion brand
  const generateSlug = (title: string): string => {
    if (!title.trim()) return '';

    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/(^-|-$)/g, '')
      .replace(/-+/g, '-');

    if (!baseSlug) {
      return `robe_by_shamshad_collection_${generateRandomString(8)}`;
    }

    return `robe_by_shamshad_${baseSlug}`;
  };

  // Fetch collections
  const fetchCollections = useCallback(async () => {
    setIsFetching(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
        limit: pageLimit.toString(),
        status: statusFilter !== 'all' ? statusFilter : ''
      });

      const response = await fetch(`/api/collections?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
        setTotalPages(data.totalPages || 1);
        setPageLimit(data.pageLimit || DEFAULT_PAGE_LIMIT);
      } else {
        const errorData = await response.json();
        toast.error(errorData?.error || 'Failed to fetch fashion collections');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch fashion collections');
      console.error('Fetch collections error:', error);
    } finally {
      setIsFetching(false);
    }
  }, [currentPage, searchTerm, pageLimit, statusFilter]);

  // Fetch collections on mount and when dependencies change
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Fetch products and combos for selection
  useEffect(() => {
    const fetchCatalogData = async () => {
      try {
        const [productsResponse, combosResponse] = await Promise.all([
          fetch('/api/products?limit=100'),
          fetch('/api/combo-offers?limit=100')
        ]);

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData.products || []);
        }

        if (combosResponse.ok) {
          const combosData = await combosResponse.json();
          setComboOffers(combosData.offers || []);
        }
      } catch (error) {
        console.error('Failed to fetch fashion catalog data:', error);
      }
    };
    fetchCatalogData();
  }, []);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle view collection details
  const handleViewCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setIsViewModalOpen(true);
  };

  // Initialize edit images properly
  const initializeEditImages = useCallback((collection: Collection) => {
    const images: UploadedImage[] = [];
    if (collection.bannerImage) {
      images.push({
        url: collection.bannerImage,
        publicId: collection._id,
        isThumbnail: true,
        fileName: 'Collection Banner'
      });
    }
    editCollectionImageUpload.setImages(images);
  }, [editCollectionImageUpload]);

  // Handle edit collection - initialize edit modal
  const handleEditCollection = (collection: Collection) => {
    const editingCollectionData: CollectionForm = {
      _id: collection._id,
      bannerImage: collection.bannerImage,
      bannerTitle: collection.bannerTitle,
      bannerDescription: collection.bannerDescription,
      slug: collection.slug,
      tags: collection.tags.join(', '),
      collections: collection.collections,
      status: collection.status,
      featured: collection.featured,
      sortOrder: collection.sortOrder,
      visibility: collection.visibility,
      scheduledDate: collection.scheduledDate
    };
    setEditingCollection(editingCollectionData);
    setSelectedItems(collection.collections);

    // Initialize edit images properly
    initializeEditImages(collection);

    setIsEditModalOpen(true);
  };

  // Handle delete collection
  const handleDeleteCollection = (collection: Collection) => {
    setCollectionToDelete(collection._id);
    setSelectedCollection(collection);
    setIsDeleteModalOpen(true);
  };

  // Handle item selection
  const handleItemSelect = (type: 'product' | 'combo', item: Product | ComboOffer) => {
    const isProduct = type === 'product';
    const productData = isProduct ? (item as Product) : undefined;
    const comboData = !isProduct ? (item as ComboOffer) : undefined;

    const collectionItem: CollectionItem = {
      type,
      refId: item._id,
      name: item.name,
      price: isProduct
        ? productData?.pricing.current.value ?? 0
        : comboData?.pricing.discountedPrice ?? 0,
      thumbnail: isProduct
        ? productData?.media?.thumbnail || ''
        : comboData?.thumbnail || '',
      slug: item.slug,
      ...(isProduct ? { product: productData as Product } : { combo: comboData as ComboOffer })
    };

    setSelectedItems(prev => {
      const exists = prev.some(i => i.refId === item._id && i.type === type);
      if (exists) {
        return prev.filter(i => !(i.refId === item._id && i.type === type));
      }
      return [...prev, collectionItem];
    });
  };

  // Handle item removal
  const handleItemRemove = (itemId: string, type: 'product' | 'combo') => {
    setSelectedItems(prev =>
      prev.filter(item => !(item.refId === itemId && item.type === type))
    );
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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, isEdit: boolean) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const fileToUpload = files[0];
    if (!fileToUpload) return;
    if (isEdit) {
      await editCollectionImageUpload.uploadImages([fileToUpload], true);
    } else {
      await newCollectionImageUpload.uploadImages([fileToUpload], true);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const fileToUpload = files[0];
    if (!fileToUpload) {
      const inputId = isEdit ? 'editCollectionImage' : 'newCollectionImage';
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      if (input) {
        input.value = '';
      }
      return;
    }
    if (isEdit) {
      await editCollectionImageUpload.uploadImages([fileToUpload], true);
    } else {
      await newCollectionImageUpload.uploadImages([fileToUpload], true);
    }

    const inputId = isEdit ? 'editCollectionImage' : 'newCollectionImage';
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
  };

  const triggerFileInput = (isEdit: boolean) => {
    const inputId = isEdit ? 'editCollectionImage' : 'newCollectionImage';
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  // Handle add collection submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCollection.bannerTitle) {
      toast.error('Please provide a collection title');
      return;
    }

    if (newCollectionImageUpload.images.length === 0) {
      toast.error('Please upload a banner image for the fashion collection');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please add at least one fashion item to the collection');
      return;
    }

    setIsAddingCollection(true);

    try {
      const bannerImage = newCollectionImageUpload.images.find(img => img.isThumbnail)?.url ||
        newCollectionImageUpload.images[0]?.url;

      const collectionData = {
        ...newCollection,
        bannerImage,
        slug: newCollection.slug || generateSlug(newCollection.bannerTitle),
        tags: newCollection.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        collections: selectedItems,
        sortOrder: collections.length
      };

      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionData)
      });

      if (response.ok) {
        const data = await response.json();
        setCollections(prev => [data, ...prev]);
        setIsAddModalOpen(false);
        resetNewCollection();
        toast.success('Fashion collection created successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData?.error || 'Failed to create fashion collection');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create fashion collection');
      console.error('Create collection error:', error);
    } finally {
      setIsAddingCollection(false);
    }
  };

  // Handle edit collection submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection || !editingCollection._id) return;

    setIsUpdatingCollection(true);

    try {
      const bannerImage = editCollectionImageUpload.images.find(img => img.isThumbnail)?.url ||
        editCollectionImageUpload.images[0]?.url ||
        editingCollection.bannerImage;

      const collectionData = {
        ...editingCollection,
        bannerImage,
        tags: editingCollection.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        collections: selectedItems
      };

      const response = await fetch(`/api/collections/${editingCollection._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionData)
      });

      if (response.ok) {
        const data = await response.json();
        setCollections(prev => prev.map(c => c._id === editingCollection._id ? data : c));
        setIsEditModalOpen(false);
        editCollectionImageUpload.setImages([]);
        setEditingCollection(null);
        setSelectedItems([]);
        toast.success('Fashion collection updated successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData?.error || 'Failed to update fashion collection');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update fashion collection');
      console.error('Update collection error:', error);
    } finally {
      setIsUpdatingCollection(false);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!collectionToDelete) return;

    setIsDeletingCollection(true);
    try {
      const response = await fetch(`/api/collections/${collectionToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setCollections(prev => prev.filter(c => c._id !== collectionToDelete));
        setIsDeleteModalOpen(false);
        setCollectionToDelete(null);
        setSelectedCollection(null);
        toast.success('Fashion collection deleted successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData?.error || 'Failed to delete fashion collection');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete fashion collection');
      console.error('Delete collection error:', error);
    } finally {
      setIsDeletingCollection(false);
    }
  };

  // Reset new collection form
  const resetNewCollection = () => {
    setNewCollection({
      bannerImage: '',
      bannerTitle: '',
      bannerDescription: '',
      slug: '',
      tags: '',
      collections: [],
      status: 'draft',
      featured: false,
      sortOrder: 0,
      visibility: 'public'
    });
    setSelectedItems([]);
    newCollectionImageUpload.setImages([]);
    setSearchCatalog('');
    setActiveTab('products');
  };

  // Filtered products and combos for catalog
  const filteredProducts = useMemo(() => {
    if (!searchCatalog.trim()) return products;
    const term = searchCatalog.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term) ||
      product.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  }, [products, searchCatalog]);

  const filteredCombos = useMemo(() => {
    if (!searchCatalog.trim()) return comboOffers;
    const term = searchCatalog.toLowerCase();
    return comboOffers.filter(combo =>
      combo.name.toLowerCase().includes(term) ||
      combo.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  }, [comboOffers, searchCatalog]);

  // Check if item is selected
  const isItemSelected = (type: 'product' | 'combo', itemId: string) => {
    return selectedItems.some(item => item.type === type && item.refId === itemId);
  };

  // Render catalog items
  const renderCatalogItems = () => {
    const items = activeTab === 'products' ? filteredProducts : filteredCombos;
    const type = activeTab === 'products' ? 'product' : 'combo';

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
        {items.map((item) => {
          const selected = isItemSelected(type, item._id);
          const thumbnail = type === 'product'
            ? (item as Product).media?.thumbnail
            : (item as ComboOffer).thumbnail;
          const price = type === 'product'
            ? (item as Product).pricing.current.value
            : (item as ComboOffer).pricing.discountedPrice;
          const currency = type === 'product'
            ? (item as Product).pricing.current.currency
            : (item as ComboOffer).pricing.currency;

          return (
            <div
              key={`${type}-${item._id}`}
              onClick={() => handleItemSelect(type, item)}
              className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${selected
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    type === 'product' ? (
                      <Package className="h-6 w-6 text-gray-400 m-3" />
                    ) : (
                      <Gift className="h-6 w-6 text-gray-400 m-3" />
                    )
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {item.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currency} {price}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 rounded text-xs ${type === 'product'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                      }`}>
                      {type === 'product' ? 'Fashion Item' : 'Combo Bundle'}
                    </span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected
                  ? 'bg-purple-500 border-purple-500'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}>
                  {selected && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render selected items
  const renderSelectedItems = () => (
    <div className="space-y-2">
      {selectedItems.map((item, index) => (
        <div
          key={`${item.type}-${item.refId}-${index}`}
          className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                item.type === 'product' ? (
                  <Package className="h-5 w-5 text-gray-400 m-2.5" />
                ) : (
                  <Gift className="h-5 w-5 text-gray-400 m-2.5" />
                )
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {item.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.type === 'product' ? 'Fashion Item' : 'Combo Bundle'}
                </span>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  BDT {item.price}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleItemRemove(item.refId, item.type)}
            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );

  // Calculate collection statistics
  const collectionStats = useMemo(() => {
    const totalCollections = collections.length;
    const activeCollections = collections.filter(c => c.status === 'active').length;
    const featuredCollections = collections.filter(c => c.featured).length;
    const totalItems = collections.reduce((sum, c) => sum + c.collections.length, 0);
    const totalViews = collections.reduce((sum, c) => sum + c.views, 0);

    return {
      totalCollections,
      activeCollections,
      featuredCollections,
      totalItems,
      totalViews
    };
  }, [collections]);

  // Filter collections by status
  const filteredCollections = useMemo(() => {
    if (statusFilter === 'all') return collections;
    return collections.filter(c => c.status === statusFilter);
  }, [collections, statusFilter]);

  // Refresh collections
  const refreshCollections = () => {
    fetchCollections();
    toast.success('Fashion collections refreshed!');
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 font-sans">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-linear-to-r from-purple-500 to-pink-500 shadow-lg">
              <Grid3x3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                Robe By Shamshad Collections
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Curate beautiful fashion collections of products and combo offers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshCollections}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span>New Fashion Collection</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <FolderOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Fashion Collections</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {collectionStats.totalCollections}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Collections</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {collectionStats.activeCollections}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                <Star className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Featured Collections</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {collectionStats.featuredCollections}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Fashion Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {collectionStats.totalItems}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search fashion collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 cursor-text"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 cursor-pointer rounded-lg text-sm font-medium transition-colors ${statusFilter === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 cursor-pointer rounded-lg text-sm font-medium transition-colors ${statusFilter === 'active'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('draft')}
                  className={`px-3 py-1.5 cursor-pointer rounded-lg text-sm font-medium transition-colors ${statusFilter === 'draft'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  Draft
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCurrentPage(1);
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Collections Grid */}
        <div className="p-4 md:p-6">
          {isFetching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 p-4">
                  <Skeleton className="w-full h-40 rounded-lg mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 rounded-full bg-linear-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center mb-6">
                <Grid3x3 className="h-12 w-12 text-purple-500 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No fashion collections found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchTerm ? 'Try a different search term' : 'Create your first fashion collection to get started'}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer"
              >
                <Plus className="h-5 w-5" />
                Create Fashion Collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCollections.map((collection) => (
                <div
                  key={collection._id}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  {/* Collection Banner */}
                  <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => handleViewCollection(collection)}>
                    {collection.bannerImage ? (
                      <>
                        <img
                          src={collection.bannerImage}
                          alt={collection.bannerTitle}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="h-full w-full bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Grid3x3 className="h-16 w-16 text-white/30" />
                      </div>
                    )}

                    {/* Status Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      {collection.featured && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500/90 text-white text-xs font-bold">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${collection.status === 'active'
                        ? 'bg-green-500/90 text-white'
                        : collection.status === 'draft'
                          ? 'bg-yellow-500/90 text-white'
                          : 'bg-gray-500/90 text-white'
                        }`}>
                        {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                      </span>
                    </div>

                    {/* Items Count */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-black/50 text-white text-xs font-bold backdrop-blur-sm">
                        <Layers className="h-3 w-3 mr-1" />
                        {collection.collections.length}
                      </span>
                    </div>

                    {/* Title Overlay */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-lg font-bold text-white line-clamp-1 drop-shadow-lg">
                        {collection.bannerTitle}
                      </h3>
                    </div>
                  </div>

                  {/* Collection Info */}
                  <div className="p-4">
                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {collection.bannerDescription || 'No description provided'}
                    </p>

                    {/* Fashion Tags */}
                    {collection.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {collection.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                        {collection.tags.length > 3 && (
                          <span className="inline-block px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                            +{collection.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{collection.views} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(collection.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Link className="h-3 w-3" />
                        <span className="truncate max-w-30">/{collection.slug}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewCollection(collection)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditCollection(collection)}
                          className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                          title="Edit Fashion Collection"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCollection(collection)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                          title="Delete Fashion Collection"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredCollections.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredCollections.length} of {collections.length} fashion collections
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                          ? 'bg-purple-500 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add New Fashion Collection Modal */}
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
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
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
                <Dialog.Panel className={`w-full max-w-4xl transform rounded-2xl bg-white dark:bg-gray-800 p-6 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${MODAL_SCROLLBAR_CLASS}`}>
                  <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Create New Fashion Collection
                  </Dialog.Title>

                  <form onSubmit={handleAddSubmit} className="space-y-6">
                    {/* Banner Image Upload */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Banner Image *
                      </label>
                      <div
                        className={`relative flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 ${isDragging
                          ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                          } transition-all duration-300`}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, false)}
                      >
                        {newCollectionImageUpload.uploading ? (
                          <div className="flex flex-col items-center justify-center px-4">
                            <Loader2 className="animate-spin h-8 w-8 text-purple-500 dark:text-purple-400 mb-3" />
                            <div className="text-center mb-3">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Uploading... {Math.round(newCollectionImageUpload.progress)}%
                              </div>
                              {newCollectionImageUpload.currentFileName && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {newCollectionImageUpload.currentFileName}
                                </div>
                              )}
                            </div>
                            <div className="w-56 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-linear-to-r from-purple-400 to-purple-600 transition-all duration-500"
                                style={{ width: `${Math.max(5, newCollectionImageUpload.progress)}%` }}
                              />
                            </div>
                          </div>
                        ) : newCollectionImageUpload.images.length > 0 ? (
                          <div className="w-full p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {newCollectionImageUpload.images.map((image, index) => (
                                <DraggableImage
                                  key={image.url}
                                  image={image}
                                  index={index}
                                  onSetThumbnail={(url) => newCollectionImageUpload.setThumbnail(url)}
                                  onRemove={(url) => newCollectionImageUpload.removeImage(url)}
                                  onReorder={newCollectionImageUpload.reorderImages}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-6">
                            <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                              Drag and drop banner image here
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                              PNG, JPG, WebP up to 10MB
                            </p>
                            <button
                              type="button"
                              onClick={() => triggerFileInput(false)}
                              className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer"
                            >
                              <Upload className="h-4 w-4" />
                              Choose File
                            </button>
                        <input
                          id="newCollectionImage"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileInputChange(e, false)}
                          className="hidden"
                        />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Collection Title *
                        </label>
                        <input
                          type="text"
                          value={newCollection.bannerTitle}
                          onChange={(e) => setNewCollection({
                            ...newCollection,
                            bannerTitle: e.target.value,
                            slug: generateSlug(e.target.value)
                          })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300"
                          placeholder="e.g., Eid Collection 2024, Summer Abaya Collection"
                          required
                        />
                        
                        {/* Fashion Collection Type Suggestions */}
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Popular fashion collection types:</p>
                          <div className="flex flex-wrap gap-2">
                            {fashionCollectionTypes.map((type) => (
                              <button
                                type="button"
                                key={type}
                                onClick={() => setNewCollection({
                                  ...newCollection,
                                  bannerTitle: type,
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
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Slug
                        </label>
                        <input
                          type="text"
                          value={newCollection.slug}
                          onChange={(e) => setNewCollection({ ...newCollection, slug: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300"
                          placeholder="Auto-generated from title"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Description
                      </label>
                      <textarea
                        value={newCollection.bannerDescription}
                        onChange={(e) => setNewCollection({ ...newCollection, bannerDescription: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300"
                        placeholder="Describe your fashion collection (e.g., Elegant modest wear for special occasions, Summer abaya collection with premium fabrics...)"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Fashion Tags
                      </label>
                      <input
                        type="text"
                        value={newCollection.tags}
                        onChange={(e) => setNewCollection({ ...newCollection, tags: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300"
                        placeholder="abaya, hijab, modest, eid, summer, luxury (comma separated)"
                      />
                      
                      {/* Fashion Tag Suggestions */}
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Popular fashion tags:</p>
                        <div className="flex flex-wrap gap-2">
                          {fashionTags.map((tag) => (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => {
                                const currentTags = newCollection.tags.split(',').map(t => t.trim()).filter(t => t);
                                if (!currentTags.includes(tag)) {
                                  const newTags = [...currentTags, tag].join(', ');
                                  setNewCollection({ ...newCollection, tags: newTags });
                                }
                              }}
                              className="px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Fashion Catalog Selection */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Add Fashion Items to Collection
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search fashion items..."
                              value={searchCatalog}
                              onChange={(e) => setSearchCatalog(e.target.value)}
                              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tab Navigation */}
                      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                        <button
                          type="button"
                          onClick={() => setActiveTab('products')}
                          className={`px-4 py-2 cursor-pointer text-sm font-medium transition-colors ${activeTab === 'products'
                            ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                          Fashion Items ({filteredProducts.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('combos')}
                          className={`px-4 cursor-pointer py-2 text-sm font-medium transition-colors ${activeTab === 'combos'
                            ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                          Combo Bundles ({filteredCombos.length})
                        </button>
                      </div>

                      {/* Catalog Items */}
                      {renderCatalogItems()}

                      {/* Selected Items Preview */}
                      {selectedItems.length > 0 && (
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                              Selected Fashion Items ({selectedItems.length})
                            </h5>
                            <button
                              type="button"
                              onClick={() => setSelectedItems([])}
                              className="text-sm text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                          {renderSelectedItems()}
                        </div>
                      )}
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Status
                        </label>
                        <select
                          value={newCollection.status}
                          onChange={(e) => setNewCollection({
                            ...newCollection,
                            status: e.target.value as 'active' | 'draft' | 'archived'
                          })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="featured"
                          checked={newCollection.featured}
                          onChange={(e) => setNewCollection({ ...newCollection, featured: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:focus:ring-purple-400 cursor-pointer"
                        />
                        <label htmlFor="featured" className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                          Featured Collection
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Visibility
                        </label>
                        <select
                          value={newCollection.visibility}
                          onChange={(e) => setNewCollection({
                            ...newCollection,
                            visibility: e.target.value as 'public' | 'private' | 'scheduled'
                          })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                          <option value="scheduled">Scheduled</option>
                        </select>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddModalOpen(false);
                          resetNewCollection();
                        }}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAddingCollection || newCollectionImageUpload.uploading}
                        className={`rounded-lg bg-linear-to-r from-purple-500 to-pink-500 px-5 py-2.5 text-sm font-medium text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer ${(isAddingCollection || newCollectionImageUpload.uploading) ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                      >
                        {isAddingCollection ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 inline mr-2" />
                            Creating...
                          </>
                        ) : (
                          'Create Fashion Collection'
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

      {/* Edit Fashion Collection Modal - FIXED */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsEditModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
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
                <Dialog.Panel className={`w-full max-w-4xl transform rounded-2xl bg-white dark:bg-gray-800 p-6 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${MODAL_SCROLLBAR_CLASS}`}>
                  <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Edit Fashion Collection
                  </Dialog.Title>

                  {editingCollection && (
                    <form onSubmit={handleEditSubmit} className="space-y-6">
                      {/* Banner Image Upload - FIXED */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Banner Image *
                        </label>
                        <div
                          className={`relative flex flex-col items-center justify-center w-full min-h-48 rounded-xl border-2 ${isDragging
                            ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                            } transition-all duration-300`}
                          onDragOver={handleDragOver}
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, true)}
                        >
                          {editCollectionImageUpload.uploading ? (
                            <div className="flex flex-col items-center justify-center px-4 py-12">
                              <Loader2 className="animate-spin h-8 w-8 text-purple-500 dark:text-purple-400 mb-3" />
                              <div className="text-center mb-3">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                  Uploading... {Math.round(editCollectionImageUpload.progress)}%
                                </div>
                                {editCollectionImageUpload.currentFileName && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                    {editCollectionImageUpload.currentFileName}
                                  </div>
                                )}
                              </div>
                              <div className="w-56 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-linear-to-r from-purple-400 to-purple-600 transition-all duration-500"
                                  style={{ width: `${Math.max(5, editCollectionImageUpload.progress)}%` }}
                                />
                              </div>
                            </div>
                          ) : editCollectionImageUpload.images.length > 0 ? (
                            <div className="w-full p-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {editCollectionImageUpload.images.map((image, index) => (
                                  <DraggableImage
                                    key={image.url}
                                    image={image}
                                    index={index}
                                    onSetThumbnail={(url) => editCollectionImageUpload.setThumbnail(url)}
                                    onRemove={(url) => editCollectionImageUpload.removeImage(url)}
                                    onReorder={editCollectionImageUpload.reorderImages}
                                  />
                                ))}
                                {/* Add upload button when there are existing images */}
                                {editCollectionImageUpload.images.length < MAX_IMAGES && (
                                  <div
                                    className="relative aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-900/30 flex flex-col items-center justify-center"
                                    onClick={() => triggerFileInput(true)}
                                  >
                                    <Plus className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                      Add More Images
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                      {MAX_IMAGES - editCollectionImageUpload.images.length} remaining
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Empty state - shows drag and drop area
                            <div 
                              className="text-center p-6 w-full h-full flex flex-col items-center justify-center cursor-pointer"
                              onClick={() => triggerFileInput(true)}
                            >
                              <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                Drag and drop banner image here or click to upload
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                                PNG, JPG, WebP up to 10MB
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerFileInput(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer"
                              >
                                <Upload className="h-4 w-4" />
                                Choose File
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* File input for edit modal */}
                        <input
                          id="editCollectionImage"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileInputChange(e, true)}
                          className="hidden"
                        />
                      </div>

                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Collection Title *
                          </label>
                          <input
                            type="text"
                            value={editingCollection.bannerTitle}
                            onChange={(e) => setEditingCollection({
                              ...editingCollection,
                              bannerTitle: e.target.value,
                              slug: generateSlug(e.target.value)
                            })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300"
                            placeholder="e.g., Eid Collection 2024, Summer Abaya Collection"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Slug
                          </label>
                          <input
                            type="text"
                            value={editingCollection.slug}
                            onChange={(e) => setEditingCollection({ ...editingCollection, slug: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300"
                            placeholder="Auto-generated from title"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Description
                        </label>
                        <textarea
                          value={editingCollection.bannerDescription}
                          onChange={(e) => setEditingCollection({ ...editingCollection, bannerDescription: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300"
                          placeholder="Describe your fashion collection..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Fashion Tags
                        </label>
                        <input
                          type="text"
                          value={editingCollection.tags}
                          onChange={(e) => setEditingCollection({ ...editingCollection, tags: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300"
                          placeholder="abaya, hijab, modest, eid, summer, luxury (comma separated)"
                        />
                      </div>

                      {/* Fashion Catalog Selection */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Collection Items ({selectedItems.length})
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search fashion items..."
                                value={searchCatalog}
                                onChange={(e) => setSearchCatalog(e.target.value)}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                          <button
                            type="button"
                            onClick={() => setActiveTab('products')}
                            className={`px-4 py-2 cursor-pointer text-sm font-medium transition-colors ${activeTab === 'products'
                              ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                              }`}
                          >
                            Fashion Items ({filteredProducts.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('combos')}
                            className={`px-4 cursor-pointer py-2 text-sm font-medium transition-colors ${activeTab === 'combos'
                              ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                              }`}
                          >
                            Combo Bundles ({filteredCombos.length})
                          </button>
                        </div>

                        {/* Catalog Items */}
                        {renderCatalogItems()}

                        {/* Selected Items Preview */}
                        {selectedItems.length > 0 && (
                          <div className="mt-6">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                Selected Fashion Items ({selectedItems.length})
                              </h5>
                              <button
                                type="button"
                                onClick={() => setSelectedItems([])}
                                className="text-sm text-red-500 hover:text-red-700 cursor-pointer"
                              >
                                Clear All
                              </button>
                            </div>
                            {renderSelectedItems()}
                          </div>
                        )}
                      </div>

                      {/* Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Status
                          </label>
                          <select
                            value={editingCollection.status}
                            onChange={(e) => setEditingCollection({
                              ...editingCollection,
                              status: e.target.value as 'active' | 'draft' | 'archived'
                            })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer"
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="edit-featured"
                            checked={editingCollection.featured}
                            onChange={(e) => setEditingCollection({ ...editingCollection, featured: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:focus:ring-purple-400 cursor-pointer"
                          />
                          <label htmlFor="edit-featured" className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                            Featured Collection
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Visibility
                          </label>
                          <select
                            value={editingCollection.visibility}
                            onChange={(e) => setEditingCollection({
                              ...editingCollection,
                              visibility: e.target.value as 'public' | 'private' | 'scheduled'
                            })}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer"
                          >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                            <option value="scheduled">Scheduled</option>
                          </select>
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditModalOpen(false);
                            setEditingCollection(null);
                            setSelectedItems([]);
                            editCollectionImageUpload.setImages([]);
                          }}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdatingCollection || editCollectionImageUpload.uploading}
                          className={`rounded-lg bg-linear-to-r from-purple-500 to-pink-500 px-5 py-2.5 text-sm font-medium text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer ${(isUpdatingCollection || editCollectionImageUpload.uploading) ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                          {isUpdatingCollection ? (
                            <>
                              <Loader2 className="animate-spin h-4 w-4 inline mr-2" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 inline mr-2" />
                              Update Fashion Collection
                            </>
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

      {/* View Fashion Collection Modal */}
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
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
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
                <Dialog.Panel className={`w-full max-w-2xl transform rounded-2xl bg-white dark:bg-gray-800 p-6 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${MODAL_SCROLLBAR_CLASS}`}>
                  {selectedCollection && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedCollection.bannerTitle}
                        </Dialog.Title>
                        <button
                          type="button"
                          onClick={() => setIsViewModalOpen(false)}
                          className="rounded-lg p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Banner Image */}
                      <div className="relative h-64 rounded-xl overflow-hidden mb-6">
                        {selectedCollection.bannerImage ? (
                          <img
                            src={selectedCollection.bannerImage}
                            alt={selectedCollection.bannerTitle}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <Grid3x3 className="h-16 w-16 text-white/30" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4">
                          <div className="flex items-center gap-2">
                            {selectedCollection.featured && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500 text-white text-xs font-bold">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${selectedCollection.status === 'active'
                              ? 'bg-green-500 text-white'
                              : selectedCollection.status === 'draft'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-gray-500 text-white'
                              }`}>
                              {selectedCollection.status.charAt(0).toUpperCase() + selectedCollection.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Collection Details */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                          <p className="text-gray-700 dark:text-gray-300">
                            {selectedCollection.bannerDescription || 'No description provided'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Slug</p>
                            <p className="text-gray-900 dark:text-white font-medium">/{selectedCollection.slug}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fashion Items</p>
                            <p className="text-gray-900 dark:text-white font-medium">{selectedCollection.collections.length}</p>
                          </div>
                        </div>

                        {/* Fashion Tags */}
                        {selectedCollection.tags.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Fashion Tags</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedCollection.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Items in Collection */}
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Fashion Items in Collection</p>
                          <div className="space-y-2">
                            {selectedCollection.collections.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                                    {item.thumbnail ? (
                                      <img
                                        src={item.thumbnail}
                                        alt={item.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      item.type === 'product' ? (
                                        <Package className="h-5 w-5 text-gray-400 m-2.5" />
                                      ) : (
                                        <Gift className="h-5 w-5 text-gray-400 m-2.5" />
                                      )
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                      {item.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-xs px-2 py-0.5 rounded ${item.type === 'product'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                        }`}>
                                        {item.type === 'product' ? 'Fashion Item' : 'Combo Bundle'}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        BDT {item.price}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {selectedCollection.views}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Views</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {selectedCollection.clicks}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Clicks</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {new Date(selectedCollection.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleEditCollection(selectedCollection)}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          <Edit className="h-4 w-4 inline mr-2" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsViewModalOpen(false)}
                          className="rounded-lg bg-linear-to-r from-purple-500 to-pink-500 px-5 py-2.5 text-sm font-medium text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer"
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
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
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
                <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white dark:bg-gray-800 p-6 text-left shadow-2xl transition-all">
                  <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Delete Fashion Collection
                  </Dialog.Title>
                  <div className="mt-4">
                    <p className="text-gray-600 dark:text-gray-300">
                      Are you sure you want to delete the fashion collection &quot;{selectedCollection?.bannerTitle}&quot;? This action cannot be undone.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteConfirm}
                      disabled={isDeletingCollection}
                      className={`rounded-lg bg-linear-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white hover:from-red-600 hover:to-red-700 transition-all duration-300 cursor-pointer ${isDeletingCollection ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                      {isDeletingCollection ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 inline mr-2" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Fashion Collection'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      <style jsx global>{`
        .${MODAL_SCROLLBAR_CLASS} {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .${MODAL_SCROLLBAR_CLASS}::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default FashionCollectionsPage;