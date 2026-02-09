/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { Search, Edit, Trash2, Plus, ChevronLeft, ChevronRight, X, Star, Package, Images, ShieldCheck, Scale, Tag, Users, Palette, Ruler, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import Image from 'next/image';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Skeleton } from '@/components/ui/skeleton';

// Interfaces for type safety
interface DeliveryInfo {
    isFree: boolean;
    charge: number;
    message: string;
}

interface Product {
    _id: string;
    name: string;
    brand: string;
    category: string;
    subcategory: string;
    slug?: string;
    sku: string;
    barcode: string;
    description: string;
    summary: string;
    pricing: {
        current: { currency: string; value: number; unit: string };
        original: { currency: string; value: number; unit: string };
        discountPercentage: number;
    };
    inventory: {
        quantity: number;
        threshold: number;
        status: string;
    };
    ratings: {
        averageRating: number;
        totalReviews: number;
    };
    media: {
        thumbnail: string;
        gallery: string[];
    };
    details: {
        materials: string[];
        features: string[];
        careInstructions: string;
        benefits: string[];
        warnings: string;
        certifications: string[];
        sizes: string[];
        colors: string[];
    };
    createdAt: string;
    updatedAt: string;
    gender: string;
    delivery?: DeliveryInfo;
}

interface ProductForm {
    _id?: string;
    name: string;
    brand: string;
    category: string;
    subcategory: string;
    slug?: string;
    sku: string;
    barcode: string;
    description: string;
    summary: string;
    pricing: {
        current: { currency: string; value: number; unit: string };
        original: { currency: string; value: number; unit: string };
        discountPercentage: number;
    };
    inventory: {
        quantity: number;
        threshold: number;
        status: string;
    };
    media: {
        thumbnail: string;
        gallery: string[];
    };
    details: {
        materials: string[];
        features: string[];
        careInstructions: string;
        benefits: string[];
        warnings: string;
        certifications: string[];
        sizes: string[];
        colors: string[];
        materialsString?: string;
        featuresString?: string;
        sizesString?: string;
        colorsString?: string;
    };
    galleryString?: string;
    gender: string;
    delivery: DeliveryInfo;
}

interface UploadedImage {
    url: string;
    publicId: string;
    isThumbnail: boolean;
}

type ModalHighlight = {
    title: string;
    value: string;
    description: string;
    accent: string;
    icon: LucideIcon;
};

// Helper function (can stay outside component)
const formatDeliveryMessage = (isFree: boolean, charge: number, currency: string) => {
    const formattedCharge = Number.isFinite(charge) ? charge : 0;
    return isFree ? 'Free Delivery' : `Delivery Charge: ${formattedCharge} ${currency || 'BDT'}`;
};

// Helper function (can stay outside component)
const buildDeliveryState = (delivery: DeliveryInfo | undefined, currency: string): DeliveryInfo => {
    const isFree = delivery?.isFree ?? true;
    const charge = isFree ? 0 : (delivery?.charge ?? 0);
    const message = delivery?.message ?? formatDeliveryMessage(isFree, charge, currency);
    return {
        isFree,
        charge,
        message,
    };
};

const ModalSnapshot = ({
    highlights,
    note,
}: {
    highlights: ModalHighlight[];
    note?: string;
}) => (
    <div className="space-y-4 rounded-3xl bg-linear-to-b from-white/10 via-white/5 to-transparent p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,1)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">
            Snapshot
        </p>

        <div className="space-y-4">
            {highlights.map((item) => (
                <div
                    key={item.title}
                    className={`rounded-2xl bg-linear-to-br ${item.accent} p-4 text-white shadow-lg shadow-black/20`}
                >
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/80">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                    </div>
                    <p className="text-xl font-semibold">{item.value}</p>
                    <p className="text-xs text-white/80">{item.description}</p>
                </div>
            ))}
        </div>
        {note && (
            <>
                <div className="h-px bg-white/10" />
                <p className="text-xs text-white/70">{note}</p>
            </>
        )}
    </div>
);

const DEFAULT_PAGE_LIMIT = 6;

const Products: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductForm | null>(null);
    const updateModalCurrency = selectedProduct?.pricing?.current?.currency || 'BDT';
    const safeCurrentPricing = selectedProduct?.pricing?.current ?? {
        currency: updateModalCurrency,
        value: 0,
        unit: '1 piece'
    };
    const safeOriginalPricing = selectedProduct?.pricing?.original ?? {
        currency: updateModalCurrency,
        value: 0,
        unit: '1 piece'
    };
    const safeInventory = selectedProduct?.inventory ?? {
        quantity: 0,
        threshold: 5,
        status: 'in_stock'
    };
    const [productToDelete, setProductToDelete] = useState<string | null>(null);
    const [newProduct, setNewProduct] = useState<ProductForm>({
        name: '',
        brand: 'Robe By Shamshad',
        category: '',
        subcategory: '',
        sku: '',
        barcode: '',
        description: '',
        summary: '',
        pricing: {
            current: { currency: 'BDT', value: 0, unit: '1 piece' },
            original: { currency: 'BDT', value: 0, unit: '1 piece' },
            discountPercentage: 0,
        },
        inventory: {
            quantity: 0,
            threshold: 5,
            status: 'in_stock',
        },
        media: {
            thumbnail: '',
            gallery: [],
        },
        details: {
            materials: [],
            features: [],
            careInstructions: '',
            benefits: [],
            warnings: '',
            certifications: [],
            sizes: [],
            colors: [],
        },
        gender: 'unisex',
        delivery: buildDeliveryState(undefined, 'BDT'), // Add delivery here
    });
    
    const [newProductImages, setNewProductImages] = useState<UploadedImage[]>([]);
    const [updateProductImages, setUpdateProductImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
    const [isDeletingProduct, setIsDeletingProduct] = useState(false);
    const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});
    const [categories, setCategories] = useState<{_id: string, name: string, slug: string}[]>([]);
    const [isFetchingCategories, setIsFetchingCategories] = useState(false);
    
    // Delivery handlers - MUST BE INSIDE THE COMPONENT
    const handleNewProductDeliveryUpdate = (updates: Partial<DeliveryInfo>) => {
        setNewProduct(prev => {
            const currency = prev.pricing.current.currency || 'BDT';
            const currentDelivery = prev.delivery ?? buildDeliveryState(undefined, currency);
            const nextDelivery = { ...currentDelivery, ...updates };
            const normalizedCharge = nextDelivery.isFree ? 0 : (nextDelivery.charge ?? 0);
            const message = formatDeliveryMessage(nextDelivery.isFree, normalizedCharge, currency);

            return {
                ...prev,
                delivery: {
                    ...nextDelivery,
                    charge: normalizedCharge,
                    message,
                },
            };
        });
    };

    const handleSelectedProductDeliveryUpdate = (updates: Partial<DeliveryInfo>) => {
        setSelectedProduct(prev => {
            if (!prev) return prev;
            const currency = prev.pricing.current.currency || 'BDT';
            const currentDelivery = prev.delivery ?? buildDeliveryState(prev.delivery, currency);
            const nextDelivery = { ...currentDelivery, ...updates };
            const normalizedCharge = nextDelivery.isFree ? 0 : (nextDelivery.charge ?? 0);
            const message = formatDeliveryMessage(nextDelivery.isFree, normalizedCharge, currency);

            return {
                ...prev,
                delivery: {
                    ...nextDelivery,
                    charge: normalizedCharge,
                    message,
                },
            };
        });
    };
    
    // Fashion price unit suggestions
    const priceUnitSuggestions = [
        '1 piece',
        '1 set',
        '1 pair',
        '1 piece (1 top)',
        '1 piece (1 bottom)',
        '1 piece (1 dress)',
        '1 piece (1 suit)',
        '1 piece (1 scarf)',
        '1 piece (1 accessory)',
        '2 pieces',
        '3 pieces',
        '1 pack',
        '1 dozen',
        '1 box',
        '1 set (2 pieces)',
        '1 set (3 pieces)'
    ];

    // Fashion categories
    const fashionCategories = [
        { _id: 'cat-1', name: 'Abaya', slug: 'abaya' },
        { _id: 'cat-2', name: 'Hijab & Scarves', slug: 'hijab-scarves' },
        { _id: 'cat-3', name: 'Modest Dresses', slug: 'modest-dresses' },
        { _id: 'cat-4', name: 'Kaftans', slug: 'kaftans' },
        { _id: 'cat-5', name: 'Tunics & Tops', slug: 'tunics-tops' },
        { _id: 'cat-6', name: 'Bottoms', slug: 'bottoms' },
        { _id: 'cat-7', name: 'Accessories', slug: 'accessories' },
        { _id: 'cat-8', name: 'Kids Collection', slug: 'kids-collection' },
        { _id: 'cat-9', name: 'Men\'s Collection', slug: 'mens-collection' },
        { _id: 'cat-10', name: 'Prayer Outfits', slug: 'prayer-outfits' },
    ];

    // Subcategories mapping
    const subcategoriesByCategory: Record<string, string[]> = {
        'abaya': ['Simple Abaya', 'Embroidered Abaya', 'Designer Abaya', 'Open Abaya', 'Closed Abaya'],
        'hijab-scarves': ['Square Hijab', 'Long Scarf', 'Shawl', 'Instant Hijab', 'Printed Scarf'],
        'modest-dresses': ['Maxi Dress', 'Midi Dress', 'Party Wear', 'Casual Dress', 'Office Wear'],
        'kaftans': ['Simple Kaftan', 'Embroidered Kaftan', 'Designer Kaftan', 'Summer Kaftan'],
        'tunics-tops': ['Long Tunic', 'Short Top', 'Embroidered Top', 'Plain Top'],
        'bottoms': ['Palazzo', 'Straight Pants', 'Skirt', 'Shalwar'],
        'accessories': ['Handbag', 'Belt', 'Jewelry', 'Shoes', 'Perfume'],
        'kids-collection': ['Kids Abaya', 'Kids Dress', 'Kids Hijab', 'Kids Set'],
        'mens-collection': ['Mens Thobe', 'Mens Kurta', 'Mens Accessories'],
        'prayer-outfits': ['Prayer Dress', 'Prayer Set', 'Prayer Hijab']
    };

    // Sizes for fashion products
    const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size', 'Free Size'];

    // Common colors for fashion products
    const colorOptions = [
        'Black', 'White', 'Navy Blue', 'Royal Blue', 'Sky Blue',
        'Red', 'Maroon', 'Pink', 'Purple', 'Lavender',
        'Green', 'Olive Green', 'Mint', 'Yellow', 'Gold',
        'Brown', 'Beige', 'Nude', 'Gray', 'Silver',
        'Multicolor', 'Printed', 'Floral', 'Geometric'
    ];

    const genderOptions = ['men', 'women', 'unisex'];

    // Helper functions for category mapping
    const getCategoryNameBySlug = (categorySlug: string): string => {
        const category = categories.find(cat => cat.slug === categorySlug);
        return category?.name || categorySlug;
    };

    const getCategorySlugByName = (categoryName: string): string => {
        const category = categories.find(cat => cat.name === categoryName);
        return category?.slug || categoryName;
    };

    const brands = ['Robe By Shamshad'];
    const statusOptions = ['in_stock', 'out_of_stock', 'discontinued'];
    const currencyOptions = ['BDT', 'USD'];
    const [pageLimit, setPageLimit] = useState<number>(DEFAULT_PAGE_LIMIT);

    // Helper function for calculating discount percentage
    const calculateDiscount = (original: number, current: number) => {
        if (original <= 0) return 0;
        return Math.round(((original - current) / original) * 100);
    };

    // Fetch categories from API - fallback to fashion categories if API fails
    useEffect(() => {
        const fetchCategories = async () => {
            setIsFetchingCategories(true);
            try {
                const response = await fetch('/api/categories?limit=100');
                if (response.ok) {
                    const data = await response.json();
                    if (data.categories && Array.isArray(data.categories)) {
                        const categoryData = data.categories.map((cat: { _id: string, name: string, slug: string }) => ({
                            _id: cat._id,
                            name: cat.name,
                            slug: cat.slug
                        }));
                        setCategories(categoryData);
                    } else {
                        // Fallback to fashion categories
                        setCategories(fashionCategories);
                    }
                } else {
                    // Fallback to fashion categories
                    setCategories(fashionCategories);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
                // Fallback to fashion categories
                setCategories(fashionCategories);
            } finally {
                setIsFetchingCategories(false);
            }
        };

        fetchCategories();
    }, []);

    // Update subcategories when category changes
    const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);

    useEffect(() => {
        if (newProduct.category) {
            const subcats = subcategoriesByCategory[newProduct.category] || [];
            setAvailableSubcategories(subcats);
            // Auto-select first subcategory if none selected
            if (!newProduct.subcategory && subcats.length > 0) {
                setNewProduct({ ...newProduct, subcategory: subcats[0] });
            }
        }
    }, [newProduct.category]);

    useEffect(() => {
        if (selectedProduct?.category) {
            const subcats = subcategoriesByCategory[selectedProduct.category] || [];
            setAvailableSubcategories(subcats);
        }
    }, [selectedProduct?.category]);

    const addHighlights = useMemo<ModalHighlight[]>(() => {
        const currency = newProduct.pricing.current.currency || 'BDT';
        const currentValue = newProduct.pricing.current.value || 0;
        const unit = newProduct.pricing.current.unit || '1 piece';
        return [
            {
                title: 'Pricing ready',
                value: `${currency} ${currentValue} / ${unit}`,
                description: 'Price per unit that will show up on the storefront',
                icon: ShieldCheck,
                accent: 'from-purple-500/30 via-purple-500/10 to-transparent',
            },
            {
                title: 'Delivery',
                value: newProduct.delivery.isFree ? 'Free' : `${newProduct.pricing.current.currency} ${newProduct.delivery.charge}`,
                description: newProduct.delivery.message,
                icon: Truck,
                accent: 'from-blue-500/30 via-blue-500/10 to-transparent',
            },
            {
                title: 'Initial stock',
                value: `${newProduct.inventory.quantity || 0} units`,
                description: `Threshold set at ${newProduct.inventory.threshold || 5} units`,
                icon: Package,
                accent: 'from-rose-500/30 via-rose-500/10 to-transparent',
            },
            {
                title: 'Media uploaded',
                value: `${newProductImages.length} image${newProductImages.length === 1 ? '' : 's'}`,
                description: 'Upload product images from different angles',
                icon: Images,
                accent: 'from-blue-500/30 via-blue-500/10 to-transparent',
            },
        ];
    }, [newProduct, newProductImages]);

    const updateHighlights = useMemo<ModalHighlight[]>(() => {
        if (!selectedProduct) return [];
        const currency = selectedProduct?.pricing?.current?.currency || 'BDT';
        const currentValue = selectedProduct?.pricing?.current?.value || 0;
        const originalValue = selectedProduct?.pricing?.original?.value || 0;
        const currentUnit = selectedProduct?.pricing?.current?.unit || '1 piece';
        const quantity = selectedProduct?.inventory?.quantity || 0;
        const status = selectedProduct?.inventory?.status || 'in_stock';

        return [
            {
                title: 'Live pricing',
                value: `${currency} ${currentValue} / ${currentUnit}`,
                description: `Discount: ${calculateDiscount(originalValue, currentValue)}%`,
                icon: ShieldCheck,
                accent: 'from-purple-500/30 via-purple-500/10 to-transparent',
            },
            {
                title: 'Inventory status',
                value: `${quantity} units`,
                description: `Status: ${status.replace('_', ' ')}`,
                icon: Package,
                accent: 'from-rose-500/30 via-rose-500/10 to-transparent',
            },
            {
                title: 'Delivery',
                value: newProduct.delivery.isFree ? 'Free' : `${newProduct.pricing.current.currency} ${newProduct.delivery.charge}`,
                description: newProduct.delivery.message,
                icon: Truck,
                accent: 'from-blue-500/30 via-blue-500/10 to-transparent',
            },
            {
                title: 'Gallery size',
                value: `${updateProductImages?.length || 0} asset${(updateProductImages?.length || 0) === 1 ? '' : 's'}`,
                description: 'Multiple angles show product details better',
                icon: Images,
                accent: 'from-blue-500/30 via-blue-500/10 to-transparent',
            },
        ];
    }, [selectedProduct, updateProductImages]);

    const productPendingDelete = useMemo(
        () => products.find((product) => product._id === productToDelete) || null,
        [productToDelete, products]
    );

    const deleteHighlights = useMemo<ModalHighlight[]>(() => {
        if (!productPendingDelete) return [];
        const name = productPendingDelete?.name || 'Unknown Product';
        const brand = productPendingDelete?.brand || 'Robe By Shamshad';
        const quantity = productPendingDelete?.inventory?.quantity || 0;
        const status = productPendingDelete?.inventory?.status || 'unknown';

        return [
            {
                title: 'Selected product',
                value: name,
                description: brand,
                icon: ShieldCheck,
                accent: 'from-red-500/25 via-red-500/10 to-transparent',
            },
            {
                title: 'Stock remaining',
                value: `${quantity} units`,
                description: `Status: ${status.replace('_', ' ')}`,
                icon: Package,
                accent: 'from-slate-500/30 via-slate-500/10 to-transparent',
            },
        ];
    }, [productPendingDelete]);

    const SLUG_CODE_LENGTH = 10;
    const SLUG_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

    const generateRandomCode = (length: number = SLUG_CODE_LENGTH): string => {
        let randomString = '';
        for (let i = 0; i < length; i++) {
            randomString += SLUG_CODE_CHARS.charAt(Math.floor(Math.random() * SLUG_CODE_CHARS.length));
        }
        return randomString;
    };

    const slugifyName = (name: string): string => (
        name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
    );

    const extractSlugCode = (value: string): string | null => {
        const match = value.trim().toLowerCase().match(new RegExp(`-([a-z0-9]{${SLUG_CODE_LENGTH}})$`));
        return match?.[1] ?? null;
    };

    const buildSlugWithCode = (name: string, existingValue?: string): string => {
        const base = slugifyName(name) || 'robe-by-shamshad';
        const existingCode = existingValue ? extractSlugCode(existingValue) : null;
        const code = existingCode ?? generateRandomCode();
        return `${base}-${code}`;
    };

    const ensureSlugWithCode = (name: string, value?: string): string => {
        const trimmed = value?.trim();
        if (!trimmed) return buildSlugWithCode(name);
        if (extractSlugCode(trimmed)) {
            return trimmed.toLowerCase();
        }
        const base = slugifyName(trimmed) || slugifyName(name) || 'robe-by-shamshad';
        return `${base}-${generateRandomCode()}`;
    };

    const isAutoGeneratedSku = (sku: string, name: string): boolean => {
        const base = slugifyName(name);
        if (!base) return false;
        const normalizedSku = sku.trim().toLowerCase();
        if (normalizedSku === base) return true;
        const code = extractSlugCode(normalizedSku);
        return code ? normalizedSku === `${base}-${code}` : false;
    };

    // Barcode generation function
    const generateBarcode = (): string => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomString = '';
        for (let i = 0; i < 10; i++) {
            randomString += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return `RBS${randomString}`;
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setIsFetching(true);
            try {
                const response = await fetch(
                    `/api/products?page=${currentPage}&search=${encodeURIComponent(searchTerm)}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    setProducts(data.products || []);
                    setTotalPages(data.totalPages || 1);
                    const resolvedLimit =
                        typeof data.pageLimit === 'number' && data.pageLimit > 0
                            ? data.pageLimit
                            : (data.products?.length || DEFAULT_PAGE_LIMIT);
                    setPageLimit(resolvedLimit);
                } else {
                    const errorData = await response.json();
                    toast.error(errorData?.error || 'Failed to fetch products');
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to fetch products');
                console.error('Fetch products error:', error);
            } finally {
                setIsFetching(false);
            }
        };
        fetchProducts();
    }, [currentPage, searchTerm]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleUpdateProduct = (productId: string) => {
        const product = products.find((p) => p._id === productId);
        if (product) {
            let categoryValue = product.category;
            if (categories.length > 0) {
                const categoryBySlug = categories.find(cat => cat.slug === product.category);
                if (categoryBySlug) {
                    categoryValue = product.category;
                } else {
                    const categoryByName = categories.find(cat => cat.name === product.category);
                    if (categoryByName) {
                        categoryValue = categoryByName.slug;
                    } else {
                        const categoryById = categories.find(cat => cat._id === product.category);
                        if (categoryById) {
                            categoryValue = categoryById.slug;
                        }
                    }
                }
            }

            setSelectedProduct({
                ...product,
                gender: product.gender || 'unisex',
                category: categoryValue,
                details: {
                    ...product.details,
                    materialsString: (product.details as any).materials?.join(', ') || product.details.materials?.join(', '),
                    featuresString: (product.details as any).featuresString || product.details.features?.join(', '),
                    sizesString: product.details.sizes?.join(', '),
                    colorsString: product.details.colors?.join(', ')
                },
                galleryString: undefined,
                delivery: buildDeliveryState(product.delivery, product.pricing.current.currency || 'BDT'),
            });

            // Initialize update images array
            const images: UploadedImage[] = [];
            if (product.media.thumbnail) {
                images.push({
                    url: product.media.thumbnail,
                    publicId: '',
                    isThumbnail: true
                });
            }
            product.media.gallery.forEach(url => {
                images.push({
                    url,
                    publicId: '',
                    isThumbnail: false
                });
            });
            setUpdateProductImages(images);

            setIsUpdateModalOpen(true);
        }
    };

    const handleDeleteProduct = (productId: string) => {
        setProductToDelete(productId);
        setIsDeleteModalOpen(true);
    };

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
        await handleImageUpload(files, isUpdate);
    };

    const handleFileInputChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
        isUpdate: boolean
    ) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        await handleImageUpload(files, isUpdate);
    };

    const handleImageUpload = async (files: File[], isUpdate: boolean) => {
        if (files.length === 0) {
            toast.error('No files selected');
            return;
        }

        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            toast.error('Please upload valid image files (e.g., PNG, JPEG)');
            return;
        }

        const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            toast.error('Some images exceed 5MB limit');
            return;
        }

        setIsUploadingImage(true);
        const uploadedImages: UploadedImage[] = [];

        try {
            for (const file of imageFiles) {
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch('/api/cloudinary/upload', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `Failed to upload ${file.name}`);
                }

                uploadedImages.push({
                    url: data.imageUrl,
                    publicId: data.publicId,
                    isThumbnail: false
                });
            }

            if (isUpdate) {
                const updatedImages = [...updateProductImages, ...uploadedImages];
                setUpdateProductImages(updatedImages);

                if (updatedImages.length > 0 && !updatedImages.some(img => img.isThumbnail)) {
                    updatedImages[0].isThumbnail = true;
                    setUpdateProductImages([...updatedImages]);
                }
            } else {
                const newImages = [...newProductImages, ...uploadedImages];
                setNewProductImages(newImages);

                if (newImages.length > 0 && !newImages.some(img => img.isThumbnail)) {
                    newImages[0].isThumbnail = true;
                    setNewProductImages([...newImages]);
                }
            }

            toast.success(`Successfully uploaded ${uploadedImages.length} image(s)`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload images');
            console.error('Image upload error:', error);
        } finally {
            const inputId = isUpdate ? 'updateProductImage' : 'newProductImage';
            const input = document.getElementById(inputId) as HTMLInputElement | null;
            if (input) {
                input.value = '';
            }
            setIsUploadingImage(false);
        }
    };

    const handleSetThumbnail = (imageUrl: string, isUpdate: boolean) => {
        if (isUpdate) {
            const updatedImages = updateProductImages.map(img => ({
                ...img,
                isThumbnail: img.url === imageUrl
            }));
            setUpdateProductImages(updatedImages);
        } else {
            const updatedImages = newProductImages.map(img => ({
                ...img,
                isThumbnail: img.url === imageUrl
            }));
            setNewProductImages(updatedImages);
        }
        toast.success('Thumbnail updated!');
    };

    const handleRemoveImage = (imageUrl: string, isUpdate: boolean) => {
        if (isUpdate) {
            const updatedImages = updateProductImages.filter(img => img.url !== imageUrl);
            setUpdateProductImages(updatedImages);

            if (updatedImages.length > 0 && !updatedImages.some(img => img.isThumbnail)) {
                updatedImages[0].isThumbnail = true;
                setUpdateProductImages([...updatedImages]);
            }
        } else {
            const updatedImages = newProductImages.filter(img => img.url !== imageUrl);
            setNewProductImages(updatedImages);

            if (updatedImages.length > 0 && !updatedImages.some(img => img.isThumbnail)) {
                updatedImages[0].isThumbnail = true;
                setNewProductImages([...updatedImages]);
            }
        }
        toast.success('Image removed successfully!');
    };

    const triggerFileInput = (isUpdate: boolean) => {
        const inputId = isUpdate ? 'updateProductImage' : 'newProductImage';
        const input = document.getElementById(inputId) as HTMLInputElement;
        if (input) {
            input.click();
        }
    };

    const prepareMediaData = (images: UploadedImage[]) => {
        const thumbnailImage = images.find(img => img.isThumbnail);
        const galleryImages = images.filter(img => !img.isThumbnail).map(img => img.url);

        return {
            thumbnail: thumbnailImage ? thumbnailImage.url : '',
            gallery: galleryImages
        };
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.brand || !newProduct.category) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setIsAddingProduct(true);

        const details = {
            ...newProduct.details,
            materials: newProduct.details.materialsString ?
                newProduct.details.materialsString.split(',').map(item => item.trim()).filter(item => item !== '') :
                newProduct.details.materials,
            features: newProduct.details.featuresString ?
                newProduct.details.featuresString.split(',').map(item => item.trim()).filter(item => item !== '') :
                newProduct.details.features,
            sizes: newProduct.details.sizesString ?
                newProduct.details.sizesString.split(',').map(item => item.trim()).filter(item => item !== '') :
                newProduct.details.sizes,
            colors: newProduct.details.colorsString ?
                newProduct.details.colorsString.split(',').map(item => item.trim()).filter(item => item !== '') :
                newProduct.details.colors
        };

        const resolvedSku = ensureSlugWithCode(newProduct.name, newProduct.sku);
        const resolvedSlug = ensureSlugWithCode(newProduct.name, newProduct.slug || resolvedSku);

        const productWithSlug = {
            ...newProduct,
            category: newProduct.category,
            gender: newProduct.gender,
            slug: resolvedSlug,
            sku: resolvedSku,
            media: prepareMediaData(newProductImages),
            details,
        };

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productWithSlug),
            });
            if (response.ok) {
                const data = await response.json();
                setProducts((prev) => [...prev, data]);
                setIsAddModalOpen(false);
                setNewProductImages([]);
                setNewProduct({
                    name: '',
                    brand: 'Robe By Shamshad',
                    category: '',
                    subcategory: '',
                    sku: '',
                    barcode: '',
                    description: '',
                    summary: '',
                    pricing: {
                        current: { currency: 'BDT', value: 0, unit: '1 piece' },
                        original: { currency: 'BDT', value: 0, unit: '1 piece' },
                        discountPercentage: 0,
                    },
                    inventory: {
                        quantity: 0,
                        threshold: 5,
                        status: 'in_stock',
                    },
                    media: {
                        thumbnail: '',
                        gallery: [],
                    },
                    details: {
                        materials: [],
                        features: [],
                        careInstructions: '',
                        benefits: [],
                        warnings: '',
                        certifications: [],
                        sizes: [],
                        colors: [],
                    },
                    gender: 'unisex',
                    delivery: buildDeliveryState(undefined, 'BDT'),
                });
                toast.success('Product added successfully!');
            } else {
                const errorData = await response.json();
                toast.error(errorData?.error || 'Failed to add product');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to add product');
            console.error('Add product error:', error);
        } finally {
            setIsAddingProduct(false);
        }
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        if (!selectedProduct.name || !selectedProduct.brand || !selectedProduct.category) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setIsUpdatingProduct(true);

        try {
            const details = {
                ...selectedProduct.details,
                materials: selectedProduct.details.materialsString ?
                    selectedProduct.details.materialsString.split(',').map(item => item.trim()).filter(item => item !== '') :
                    selectedProduct.details.materials,
                features: selectedProduct.details.featuresString ?
                    selectedProduct.details.featuresString.split(',').map(item => item.trim()).filter(item => item !== '') :
                    selectedProduct.details.features,
                sizes: selectedProduct.details.sizesString ?
                    selectedProduct.details.sizesString.split(',').map(item => item.trim()).filter(item => item !== '') :
                    selectedProduct.details.sizes,
                colors: selectedProduct.details.colorsString ?
                    selectedProduct.details.colorsString.split(',').map(item => item.trim()).filter(item => item !== '') :
                    selectedProduct.details.colors
            };

            const resolvedSku = ensureSlugWithCode(selectedProduct.name, selectedProduct.sku);
            const resolvedSlug = ensureSlugWithCode(selectedProduct.name, selectedProduct.slug || resolvedSku);

            const productWithSlug = {
                ...selectedProduct,
                category: selectedProduct.category,
                gender: selectedProduct.gender,
                slug: resolvedSlug,
                sku: resolvedSku,
                media: prepareMediaData(updateProductImages),
                details
            };

            const response = await fetch(`/api/products/${selectedProduct._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productWithSlug),
            });

            if (response.ok) {
                const data = await response.json();
                setProducts((prev) => prev.map((p) => (p._id === selectedProduct._id ? data : p)));
                setIsUpdateModalOpen(false);
                setUpdateProductImages([]);
                setSelectedProduct(null);
                toast.success('Product updated successfully!');
            } else {
                const errorData = await response.json();
                toast.error(errorData?.error || 'Failed to update product');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update product');
            console.error('Update product error:', error);
        } finally {
            setIsUpdatingProduct(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (productToDelete) {
            setIsDeletingProduct(true);
            try {
                const response = await fetch(`/api/products/${productToDelete}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    setProducts((prev) => prev.filter((p) => p._id !== productToDelete));
                    setIsDeleteModalOpen(false);
                    setProductToDelete(null);
                    toast.success('Product deleted successfully!');
                } else {
                    const errorData = await response.json();
                    toast.error(errorData?.error || 'Failed to delete product');
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to delete product');
                console.error('Delete product error:', error);
            } finally {
                setIsDeletingProduct(false);
            }
        }
    };

    const renderImageGallery = (images: UploadedImage[], isUpdate: boolean) => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {images.map((image, index) => (
                <div key={image.url} className="relative group">
                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        <Image
                            src={image.url}
                            alt={`Product image ${index + 1}`}
                            fill
                            className="object-cover"
                        />

                        {image.isThumbnail && (
                            <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                                Thumbnail
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                                {!image.isThumbnail && (
                                    <button
                                        type="button"
                                        onClick={() => handleSetThumbnail(image.url, isUpdate)}
                                        className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors cursor-pointer"
                                        title="Set as thumbnail"
                                    >
                                        <Star className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(image.url, isUpdate)}
                                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                                    title="Remove image"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

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
                
                .custom-select__control {
                    border-radius: 0.5rem;
                    border: 1px solid #e5e7eb;
                    background-color: rgba(255, 255, 255, 0.8);
                    padding: 0.5rem;
                    font-size: 0.875rem;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                    transition: all 0.3s ease;
                }
                .dark .custom-select__control {
                    border-color: #374151;
                    background-color: rgba(31, 41, 55, 0.8);
                    color: #ffffff;
                }
                .custom-select__control--is-focused {
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.5);
                }
                .dark .custom-select__control--is-focused {
                    border-color: #a78bfa;
                    box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.4);
                }
                .custom-select__menu {
                    border-radius: 0.5rem;
                    border: 1px solid #e5e7eb;
                    background-color: #ffffff;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .dark .custom-select__menu {
                    border-color: #374151;
                    background-color: #1f2937;
                }
                .custom-select__option {
                    padding: 0.75rem 1rem;
                    color: #111827;
                }
                .dark .custom-select__option {
                    color: #ffffff;
                }
                .custom-select__option--is-focused {
                    background-color: #f3f4f6;
                }
                .dark .custom-select__option--is-focused {
                    background-color: #4b5563;
                }
                .custom-select__option--is-selected {
                    background-color: #8b5cf6;
                    color: #ffffff;
                }
                .dark .custom-select__option--is-selected {
                    background-color: #a78bfa;
                }
                ul[role='listbox'] {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                ul[role='listbox']::-webkit-scrollbar {
                    display: none;
                }
                .skeleton-pulse {
                    background: linear-gradient(
                        90deg,
                        rgba(243, 244, 246, 0.8) 0%,
                        rgba(229, 231, 235, 0.9) 50%,
                        rgba(243, 244, 246, 0.8) 100%
                    );
                    background-size: 200% 100%;
                    animation: pulse 1.5s ease-in-out infinite;
                }
                @keyframes pulse {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }
            `}</style>

            <div className="flex flex-col items-center mb-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-linear-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">RBS</span>
                    </div>
                    <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Robe By Shamshad
                    </h1>
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-300 text-center max-w-2xl mb-4">
                    Modest Fashion Collection - Elegant Abayas, Hijabs & Islamic Attire
                </p>
            </div>

            <div className="max-w-7xl mx-auto rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 shadow-lg overflow-hidden">
                <div className="px-6 py-5 md:px-10 md:py-6 flex items-center justify-between">
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Fashion Collection
                    </h3>
                    <button
                        onClick={() => {
                            setNewProduct(prev => ({
                                ...prev,
                                barcode: generateBarcode()
                            }));
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add New Product</span>
                    </button>
                </div>

                <div className="border-t border-gray-600 dark:border-gray-700 p-6 md:p-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            All Fashion Items
                        </h3>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute top-1/2 -translate-y-1/2 left-4 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm hover:shadow-md cursor-text"
                                aria-label="Search products"
                            />
                        </div>
                    </div>

                    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-8">
                        {isFetching ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: pageLimit || DEFAULT_PAGE_LIMIT }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 p-6 shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        <Skeleton className="w-full h-52 rounded-2xl skeleton-pulse" />
                                        <div className="mt-4 space-y-3">
                                            <Skeleton key="title" className="h-6 w-3/4 rounded-lg skeleton-pulse" />
                                            <Skeleton key="desc1" className="h-4 w-1/2 rounded-lg skeleton-pulse" />
                                            <Skeleton key="desc2" className="h-4 w-1/3 rounded-lg skeleton-pulse" />
                                            <div className="flex gap-2">
                                                <Skeleton key="badge1" className="h-5 w-20 rounded-full skeleton-pulse" />
                                                <Skeleton key="badge2" className="h-5 w-20 rounded-full skeleton-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center p-8">
                                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                                    No fashion items found
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {products.filter(product => product && product._id).map((product) => {
                                    const originalValue = product?.pricing?.original?.value || 0;
                                    const currentValue = product?.pricing?.current?.value || 0;
                                    const currentUnit = product?.pricing?.current?.unit || '1 piece';
                                    const discount = calculateDiscount(originalValue, currentValue);

                                    return (
                                        <div
                                            key={product._id}
                                            className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                                        >
                                            <div className="relative w-full h-48 overflow-hidden">
                                                {product.media.thumbnail ? (
                                                    <>
                                                        <Image
                                                            src={product.media.thumbnail}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                                                        />
                                                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                                                    </>
                                                ) : product.media.gallery.length > 0 ? (
                                                    <>
                                                        <Image
                                                            src={product.media.gallery[0]}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                                                        />
                                                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                                        <div className="text-white text-4xl font-bold opacity-20">
                                                            {product.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    </div>
                                                )}

                                                {discount > 0 && (
                                                    <div className="absolute top-4 left-4">
                                                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-pink-500 text-white border border-pink-400/30">
                                                            {discount}% OFF
                                                        </span>
                                                    </div>
                                                )}

                                                {product.media.gallery.length > 0 && (
                                                    <div className="absolute top-4 right-4">
                                                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-100 border border-purple-400/30 backdrop-blur-md">
                                                            +{product.media.gallery.length}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="absolute bottom-4 left-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-md ${product.inventory.status === 'in_stock'
                                                        ? 'bg-green-500/20 text-green-100 border border-green-400/30'
                                                        : product.inventory.status === 'out_of_stock'
                                                            ? 'bg-red-500/20 text-red-100 border border-red-400/30'
                                                            : 'bg-gray-500/20 text-gray-100 border border-gray-400/30'
                                                        }`}>
                                                        {product.inventory.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-6">
                                                <div className="mb-4">
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2" title={product?.name || 'Untitled Product'}>
                                                        {product?.name || 'Untitled Product'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                        {product?.brand || 'Robe By Shamshad'}
                                                    </p>
                                                </div>

                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed" title={product?.description || ''}>
                                                    {product?.description || 'No description available'}
                                                </p>

                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                        {product?.pricing?.current?.currency || 'BDT'} {currentValue}
                                                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                                            / {currentUnit}
                                                        </span>
                                                    </span>
                                                    {discount > 0 && (
                                                        <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                                                            {product?.pricing?.original?.currency || 'BDT'} {originalValue}
                                                        </span>
                                                    )}
                                                </div>

                                                {product.delivery && (
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                                                        <Truck className="h-4 w-4 mr-2 text-purple-500" />
                                                        <span>{product.delivery.message}</span>
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-1.5 mb-4">
                                                    <span className="inline-flex items-center text-xs rounded-md px-2.5 py-1 bg-linear-to-r from-purple-500 to-pink-600 text-white font-semibold shadow-sm">
                                                        {getCategoryNameBySlug(product?.category || '') || product?.category || 'Uncategorized'}
                                                    </span>
                                                    {(product?.details?.features || []).slice(0, 2).map((feature, index) => (
                                                        <span
                                                            key={`feature-${index}`}
                                                            className="inline-flex items-center text-xs rounded-md px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            {feature}
                                                        </span>
                                                    ))}
                                                    {(product?.details?.features?.length || 0) > 2 && (
                                                        <span className="inline-flex items-center text-xs rounded-md px-2.5 py-1 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-700">
                                                            +{(product?.details?.features?.length || 0) - 2}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-2 mb-4">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">Stock:</span>
                                                        <span className={`font-medium ${(product?.inventory?.quantity || 0) > (product?.inventory?.threshold || 5)
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : (product?.inventory?.quantity || 0) > 0
                                                                ? 'text-yellow-600 dark:text-yellow-400'
                                                                : 'text-red-600 dark:text-red-400'
                                                            }`}>
                                                            {product?.inventory?.quantity || 0} units
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">Rating:</span>
                                                        <span className="font-medium text-yellow-600 dark:text-yellow-400">
                                                            {product?.ratings?.averageRating || 0} ★ ({product?.ratings?.totalReviews || 0})
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                        <span>Added {product?.createdAt ? new Date(product.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleUpdateProduct(product?._id)}
                                                            className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all duration-200 cursor-pointer group"
                                                            title="Edit Product"
                                                        >
                                                            <Edit className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteProduct(product?._id)}
                                                            className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 cursor-pointer group"
                                                            title="Delete Product"
                                                        >
                                                            <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
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
                            <span className="block text-sm font-medium text-gray-600 dark:text-gray-300 sm:hidden">
                                Page {currentPage} of {totalPages}
                            </span>
                            <ul className="hidden sm:flex items-center gap-2">
                                {Array.from({ length: totalPages }, (_, index) => {
                                    const page = index + 1;
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                        return (
                                            <li key={page}>
                                                <button
                                                    onClick={() => handlePageChange(page)}
                                                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer ${currentPage === page
                                                        ? 'bg-purple-600 text-white'
                                                        : 'text-gray-700 dark:text-gray-300 bg-white hover:bg-purple-50 dark:hover:bg-purple-900/10'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            </li>
                                        );
                                    }
                                    if (
                                        (page === currentPage - 2 && page > 1) ||
                                        (page === currentPage + 2 && page < totalPages)
                                    ) {
                                        return (
                                            <li key={page}>
                                                <span className="flex h-10 w-10 items-center justify-center text-gray-500 dark:text-gray-400">
                                                    ...
                                                </span>
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
                </div>
            </div>

            {/* Add New Product Modal */}
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
                                        Add New Fashion Item
                                    </Dialog.Title>
                                    <form onSubmit={handleAddSubmit} className="space-y-6">
                                        {/* Product Images Section */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Product Images
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
                                                {isUploadingImage ? (
                                                    <div className="flex items-center justify-center">
                                                        <svg
                                                            className="animate-spin h-6 w-6 text-purple-500 dark:text-purple-400"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                            ></circle>
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                            ></path>
                                                        </svg>
                                                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                                                            Uploading...
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <svg
                                                            className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            aria-hidden="true"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                            Drag and drop images here, or
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => triggerFileInput(false)}
                                                            className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-200 cursor-pointer"
                                                        >
                                                            Browse Files
                                                        </button>
                                                        <input
                                                            id="newProductImage"
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleFileInputChange(e, false)}
                                                            className="hidden"
                                                            aria-label="Upload product images"
                                                            multiple
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                Upload product images from different angles (max 5MB each, PNG/JPEG). First image will be set as thumbnail.
                                            </p>

                                            {newProductImages.length > 0 && (
                                                <div className="mt-4">
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                                        Uploaded Images ({newProductImages.length})
                                                    </h4>
                                                    {renderImageGallery(newProductImages, false)}
                                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                        Click the star icon to set an image as thumbnail.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Product Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={newProduct.name}
                                                onChange={(e) => {
                                                    const newName = e.target.value;
                                                    const shouldUpdateSku = !newProduct.sku || isAutoGeneratedSku(newProduct.sku, newProduct.name);
                                                    setNewProduct({
                                                        ...newProduct,
                                                        name: newName,
                                                        sku: shouldUpdateSku
                                                            ? buildSlugWithCode(newName, newProduct.sku)
                                                            : newProduct.sku
                                                    });
                                                }}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="e.g., Elegant Embroidered Abaya"
                                                required
                                            />
                                        </div>

                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Brand *
                                            </label>
                                            <Listbox
                                                value={newProduct.brand}
                                                onChange={(value: string) => setNewProduct({ ...newProduct, brand: value })}
                                            >
                                                <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer">
                                                    {newProduct.brand || 'Select a brand'}
                                                </Listbox.Button>
                                                <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                    {brands.map((brand) => (
                                                        <Listbox.Option
                                                            key={brand}
                                                            value={brand}
                                                            className={({ active }) =>
                                                                `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                    ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                    : 'text-gray-900 dark:text-white'
                                                                }`
                                                            }
                                                        >
                                                            {brand}
                                                        </Listbox.Option>
                                                    ))}
                                                </Listbox.Options>
                                            </Listbox>
                                        </div>

                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Gender *
                                            </label>
                                            <Listbox
                                                value={newProduct.gender}
                                                onChange={(value: string) => setNewProduct({ ...newProduct, gender: value })}
                                            >
                                                <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer">
                                                    {newProduct.gender ? newProduct.gender[0].toUpperCase() + newProduct.gender.slice(1) : 'Select gender'}
                                                </Listbox.Button>
                                                <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                    {genderOptions.map((gender) => (
                                                        <Listbox.Option
                                                            key={gender}
                                                            value={gender}
                                                            className={({ active }) =>
                                                                `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                    ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                    : 'text-gray-900 dark:text-white'
                                                                }`
                                                            }
                                                        >
                                                            {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                                        </Listbox.Option>
                                                    ))}
                                                </Listbox.Options>
                                            </Listbox>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="relative">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Category *
                                                </label>
                                                <Listbox
                                                    value={newProduct.category}
                                                    onChange={(value: string) => setNewProduct({ ...newProduct, category: value, subcategory: '' })}
                                                    disabled={isFetchingCategories}
                                                >
                                                    <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                                        {isFetchingCategories
                                                            ? 'Loading categories...'
                                                            : newProduct.category
                                                                ? getCategoryNameBySlug(newProduct.category)
                                                                : 'Select a category'
                                                        }
                                                    </Listbox.Button>
                                                    <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                        {categories.length === 0 ? (
                                                            <div className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400">
                                                                {isFetchingCategories ? 'Loading...' : 'No categories available'}
                                                            </div>
                                                        ) : (
                                                            categories.map((category) => (
                                                                <Listbox.Option
                                                                    key={category._id}
                                                                    value={category.slug}
                                                                    className={({ active }) =>
                                                                        `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                            : 'text-gray-900 dark:text-white'
                                                                        }`
                                                                    }
                                                                >
                                                                    {category.name}
                                                                </Listbox.Option>
                                                            ))
                                                        )}
                                                    </Listbox.Options>
                                                </Listbox>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Barcode
                                            </label>
                                            <input
                                                type="text"
                                                value={newProduct.barcode}
                                                onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="Enter barcode"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={newProduct.description}
                                                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="Describe the product features, style, and appeal"
                                                rows={4}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Summary
                                            </label>
                                            <textarea
                                                value={newProduct.summary}
                                                onChange={(e) => setNewProduct({ ...newProduct, summary: e.target.value })}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="Brief summary for product cards"
                                                rows={3}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Current Price
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newProduct.pricing.current.value}
                                                    onChange={(e) => setNewProduct({
                                                        ...newProduct,
                                                        pricing: {
                                                            ...newProduct.pricing,
                                                            current: {
                                                                ...newProduct.pricing.current,
                                                                value: parseFloat(e.target.value) || 0
                                                            }
                                                        }
                                                    })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Original Price
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newProduct.pricing.original.value}
                                                    onChange={(e) => setNewProduct({
                                                        ...newProduct,
                                                        pricing: {
                                                            ...newProduct.pricing,
                                                            original: {
                                                                ...newProduct.pricing.original,
                                                                value: parseFloat(e.target.value) || 0
                                                            }
                                                        }
                                                    })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="relative">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Currency
                                                </label>
                                                <Listbox
                                                    value={newProduct.pricing.current.currency}
                                                    onChange={(value: string) => setNewProduct({
                                                        ...newProduct,
                                                        pricing: {
                                                            ...newProduct.pricing,
                                                            current: { ...newProduct.pricing.current, currency: value },
                                                            original: { ...newProduct.pricing.original, currency: value }
                                                        }
                                                    })}
                                                >
                                                    <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer">
                                                        {newProduct.pricing.current.currency}
                                                    </Listbox.Button>
                                                    <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                        {currencyOptions.map((currency) => (
                                                            <Listbox.Option
                                                                key={currency}
                                                                value={currency}
                                                                className={({ active }) =>
                                                                    `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                        : 'text-gray-900 dark:text-white'
                                                                    }`
                                                                }
                                                            >
                                                                {currency}
                                                            </Listbox.Option>
                                                        ))}
                                                    </Listbox.Options>
                                                </Listbox>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Price Unit *
                                            </label>
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={newProduct.pricing.current.unit}
                                                    onChange={(e) => setNewProduct({
                                                        ...newProduct,
                                                        pricing: {
                                                            ...newProduct.pricing,
                                                            current: {
                                                                ...newProduct.pricing.current,
                                                                unit: e.target.value
                                                            },
                                                            original: {
                                                                ...newProduct.pricing.original,
                                                                unit: e.target.value
                                                            }
                                                        }
                                                    })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="e.g., 1 piece, 1 set, 1 pair"
                                                    required
                                                />

                                                <div className="space-y-2">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                        Quick suggestions:
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {priceUnitSuggestions.map((unit) => (
                                                            <button
                                                                key={unit}
                                                                type="button"
                                                                onClick={() => setNewProduct({
                                                                    ...newProduct,
                                                                    pricing: {
                                                                        ...newProduct.pricing,
                                                                        current: {
                                                                            ...newProduct.pricing.current,
                                                                            unit
                                                                        },
                                                                        original: {
                                                                            ...newProduct.pricing.original,
                                                                            unit
                                                                        }
                                                                    }
                                                                })}
                                                                className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 cursor-pointer ${newProduct.pricing.current.unit === unit
                                                                    ? 'bg-purple-600 text-white border-purple-600'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                                    }`}
                                                            >
                                                                {unit}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Quantity
                                                </label>
                                                <input
                                                    type="number"
                                                    value={newProduct.inventory.quantity}
                                                    onChange={(e) => setNewProduct({
                                                        ...newProduct,
                                                        inventory: {
                                                            ...newProduct.inventory,
                                                            quantity: parseInt(e.target.value) || 0
                                                        }
                                                    })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Threshold
                                                </label>
                                                <input
                                                    type="number"
                                                    value={newProduct.inventory.threshold}
                                                    onChange={(e) => setNewProduct({
                                                        ...newProduct,
                                                        inventory: {
                                                            ...newProduct.inventory,
                                                            threshold: parseInt(e.target.value) || 5
                                                        }
                                                    })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="5"
                                                />
                                            </div>
                                        </div>

                                        {/* ... Other form fields (same structure as add form) ... */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                SKU (Product Code)
                                            </label>
                                            <input
                                                type="text"
                                                value={newProduct.sku}
                                                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="Auto-generated from product name"
                                            />
                                        </div>
                                        {/* Delivery Section */}
                                        <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-6">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                <Truck className="h-5 w-5 text-purple-600" />
                                                Delivery Information
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={newProduct.delivery.isFree}
                                                        onChange={(e) => handleNewProductDeliveryUpdate({ isFree: e.target.checked })}
                                                        className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                    />
                                                    <span className="flex items-center gap-2">
                                                        <Truck className="h-4 w-4 text-purple-600" />
                                                        Free Delivery
                                                    </span>
                                                </label>
                                                {!newProduct.delivery.isFree && (
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                            Delivery Charge
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={newProduct.delivery.charge}
                                                                onChange={(e) => handleNewProductDeliveryUpdate({
                                                                    charge: Math.max(0, parseFloat(e.target.value) || 0)
                                                                })}
                                                                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                            />
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                {newProduct.pricing.current.currency}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                {newProduct.delivery.message}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Status
                                            </label>
                                            <Listbox
                                                value={newProduct.inventory.status}
                                                onChange={(value: string) => setNewProduct({
                                                    ...newProduct,
                                                    inventory: {
                                                        ...newProduct.inventory,
                                                        status: value
                                                    }
                                                })}
                                            >
                                                <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer">
                                                    {newProduct.inventory.status ? newProduct.inventory.status.replace('_', ' ').charAt(0).toUpperCase() + newProduct.inventory.status.replace('_', ' ').slice(1) : 'Select status'}
                                                </Listbox.Button>
                                                <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                    {statusOptions.map((status) => (
                                                        <Listbox.Option
                                                            key={status}
                                                            value={status}
                                                            className={({ active }) =>
                                                                `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                    ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                    : 'text-gray-900 dark:text-white'
                                                                }`
                                                            }
                                                        >
                                                            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                                                        </Listbox.Option>
                                                    ))}
                                                </Listbox.Options>
                                            </Listbox>
                                        </div>

                                        {/* Product Details - Fashion Specific */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Materials
                                            </label>
                                            <input
                                                type="text"
                                                value={newProduct.details.materialsString ?? newProduct.details.materials.join(', ')}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setNewProduct({
                                                        ...newProduct,
                                                        details: {
                                                            ...newProduct.details,
                                                            materialsString: value,
                                                            materials: value.split(',').map(item => item.trim()).filter(item => item !== '')
                                                        }
                                                    });
                                                }}
                                                onBlur={(e) => {
                                                    const value = e.target.value;
                                                    setNewProduct({
                                                        ...newProduct,
                                                        details: {
                                                            ...newProduct.details,
                                                            materials: value.split(',').map(item => item.trim()).filter(item => item !== ''),
                                                            materialsString: undefined
                                                        }
                                                    });
                                                }}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="e.g., Cotton, Silk, Polyester, Chiffon (comma-separated)"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Features
                                            </label>
                                            <input
                                                type="text"
                                                value={newProduct.details.featuresString ?? newProduct.details.features.join(', ')}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setNewProduct({
                                                        ...newProduct,
                                                        details: {
                                                            ...newProduct.details,
                                                            featuresString: value,
                                                            features: value.split(',').map(item => item.trim()).filter(item => item !== '')
                                                        }
                                                    });
                                                }}
                                                onBlur={(e) => {
                                                    const value = e.target.value;
                                                    setNewProduct({
                                                        ...newProduct,
                                                        details: {
                                                            ...newProduct.details,
                                                            features: value.split(',').map(item => item.trim()).filter(item => item !== ''),
                                                            featuresString: undefined
                                                        }
                                                    });
                                                }}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="e.g., Embroidered, Long Sleeve, Flow Design (comma-separated)"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Available Sizes
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newProduct.details.sizesString ?? newProduct.details.sizes.join(', ')}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setNewProduct({
                                                            ...newProduct,
                                                            details: {
                                                                ...newProduct.details,
                                                                sizesString: value,
                                                                sizes: value.split(',').map(item => item.trim()).filter(item => item !== '')
                                                            }
                                                        });
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = e.target.value;
                                                        setNewProduct({
                                                            ...newProduct,
                                                            details: {
                                                                ...newProduct.details,
                                                                sizes: value.split(',').map(item => item.trim()).filter(item => item !== ''),
                                                                sizesString: undefined
                                                            }
                                                        });
                                                    }}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="e.g., S, M, L, XL (comma-separated)"
                                                />
                                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    Common sizes: {sizeOptions.join(', ')}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Available Colors
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newProduct.details.colorsString ?? newProduct.details.colors.join(', ')}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setNewProduct({
                                                            ...newProduct,
                                                            details: {
                                                                ...newProduct.details,
                                                                colorsString: value,
                                                                colors: value.split(',').map(item => item.trim()).filter(item => item !== '')
                                                            }
                                                        });
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = e.target.value;
                                                        setNewProduct({
                                                            ...newProduct,
                                                            details: {
                                                                ...newProduct.details,
                                                                colors: value.split(',').map(item => item.trim()).filter(item => item !== ''),
                                                                colorsString: undefined
                                                            }
                                                        });
                                                    }}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="e.g., Black, Navy Blue, Maroon (comma-separated)"
                                                />
                                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    Common colors: Black, White, Navy, Maroon, etc.
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Care Instructions
                                            </label>
                                            <textarea
                                                value={newProduct.details.careInstructions}
                                                onChange={(e) => setNewProduct({
                                                    ...newProduct,
                                                    details: {
                                                        ...newProduct.details,
                                                        careInstructions: e.target.value
                                                    }
                                                })}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="e.g., Hand wash recommended, Dry clean only, Iron on low heat"
                                                rows={3}
                                            />
                                        </div>

                                        <div className="flex flex-col sm:flex-row justify-end gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddModalOpen(false);
                                                    setNewProductImages([]);
                                                }}
                                                className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg focus:ring-2 focus:ring-purple-500 focus:outline-none dark:focus:ring-purple-400 transition-all duration-300 transform hover:scale-105 cursor-pointer ${(isUploadingImage || isAddingProduct) ? 'opacity-70 cursor-not-allowed' : ''
                                                    }`}
                                                disabled={isUploadingImage || isAddingProduct}
                                            >
                                                {(isUploadingImage || isAddingProduct) ? (
                                                    <>
                                                        <svg
                                                            className="animate-spin h-5 w-5 text-white mr-2"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                            ></circle>
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                            ></path>
                                                        </svg>
                                                        <span className="text-sm">{isUploadingImage ? 'Uploading...' : 'Creating...'}</span>
                                                    </>
                                                ) : (
                                                    'Create Fashion Item'
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

            {/* Update Product Modal */}
            <Transition appear show={isUpdateModalOpen} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => {
                        setIsUpdateModalOpen(false);
                        setUpdateProductImages([]);
                        setSelectedProduct(null);
                    }}
                >
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
                                        Update Fashion Item
                                    </Dialog.Title>
                                    {selectedProduct && (
                                        <form onSubmit={handleUpdateSubmit} className="space-y-6">
                                            {/* Product Images Section */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Product Images
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
                                                    {isUploadingImage ? (
                                                        <div className="flex items-center justify-center">
                                                            <svg
                                                                className="animate-spin h-6 w-6 text-purple-500 dark:text-purple-400"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                            >
                                                                <circle
                                                                    className="opacity-25"
                                                                    cx="12"
                                                                    cy="12"
                                                                    r="10"
                                                                    stroke="currentColor"
                                                                    strokeWidth="4"
                                                                ></circle>
                                                                <path
                                                                    className="opacity-75"
                                                                    fill="currentColor"
                                                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                                ></path>
                                                            </svg>
                                                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                                                                Uploading...
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <svg
                                                                className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                aria-hidden="true"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                />
                                                            </svg>
                                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                                Drag and drop images here, or
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => triggerFileInput(true)}
                                                                className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-200 cursor-pointer"
                                                            >
                                                                Browse Files
                                                            </button>
                                                            <input
                                                                id="updateProductImage"
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleFileInputChange(e, true)}
                                                                className="hidden"
                                                                aria-label="Upload product images"
                                                                multiple
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    Upload product images from different angles (max 5MB each, PNG/JPEG).
                                                </p>

                                                {updateProductImages.length > 0 && (
                                                    <div className="mt-4">
                                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                                            Product Images ({updateProductImages.length})
                                                        </h4>
                                                        {renderImageGallery(updateProductImages, true)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Rest of the update form - similar structure to add form but with selectedProduct */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Product Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedProduct.name}
                                                    onChange={(e) => {
                                                        const newName = e.target.value;
                                                        const shouldUpdateSku = !selectedProduct.sku || isAutoGeneratedSku(selectedProduct.sku, selectedProduct.name);
                                                        setSelectedProduct({
                                                            ...selectedProduct,
                                                            name: newName,
                                                            sku: shouldUpdateSku
                                                                ? buildSlugWithCode(newName, selectedProduct.sku)
                                                                : selectedProduct.sku
                                                        });
                                                    }}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="Enter product name"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Slug (Product URL)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedProduct.slug ?? ''}
                                                    onChange={(e) => setSelectedProduct({
                                                        ...selectedProduct,
                                                        slug: e.target.value
                                                    })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="Auto-generated from product name"
                                                />
                                            </div>

                                            <div className="relative">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Brand *
                                                </label>
                                                <Listbox
                                                    value={selectedProduct.brand}
                                                    onChange={(value: string) => setSelectedProduct({ ...selectedProduct, brand: value })}
                                                >
                                                    <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer">
                                                        {selectedProduct.brand || 'Select a brand'}
                                                    </Listbox.Button>
                                                    <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                        {brands.map((brand) => (
                                                            <Listbox.Option
                                                                key={brand}
                                                                value={brand}
                                                                className={({ active }) =>
                                                                    `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                        : 'text-gray-900 dark:text-white'
                                                                    }`
                                                                }
                                                            >
                                                                {brand}
                                                            </Listbox.Option>
                                                        ))}
                                                    </Listbox.Options>
                                                </Listbox>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                        Category *
                                                    </label>
                                                    <Listbox
                                                        value={selectedProduct.category}
                                                        onChange={(value: string) => setSelectedProduct({ ...selectedProduct, category: value, subcategory: '' })}
                                                        disabled={isFetchingCategories}
                                                    >
                                                        <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed">
                                                            {isFetchingCategories
                                                                ? 'Loading categories...'
                                                                : selectedProduct.category
                                                                    ? getCategoryNameBySlug(selectedProduct.category)
                                                                    : 'Select a category'
                                                            }
                                                        </Listbox.Button>
                                                        <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                            {categories.length === 0 ? (
                                                                <div className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400">
                                                                    {isFetchingCategories ? 'Loading...' : 'No categories available'}
                                                                </div>
                                                            ) : (
                                                                categories.map((category) => (
                                                                    <Listbox.Option
                                                                        key={category._id}
                                                                        value={category.slug}
                                                                        className={({ active }) =>
                                                                            `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                                : 'text-gray-900 dark:text-white'
                                                                            }`
                                                                        }
                                                                    >
                                                                        {category.name}
                                                                    </Listbox.Option>
                                                                ))
                                                            )}
                                                    </Listbox.Options>
                                                </Listbox>
                                            </div>

                                                <div className="relative">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                        Gender *
                                                    </label>
                                                    <Listbox
                                                        value={selectedProduct.gender}
                                                        onChange={(value: string) => setSelectedProduct({ ...selectedProduct, gender: value })}
                                                    >
                                                        <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer">
                                                            {selectedProduct.gender ? selectedProduct.gender[0].toUpperCase() + selectedProduct.gender.slice(1) : 'Select gender'}
                                                        </Listbox.Button>
                                                        <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                            {genderOptions.map((gender) => (
                                                                <Listbox.Option
                                                                    key={gender}
                                                                    value={gender}
                                                                    className={({ active }) =>
                                                                        `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                            : 'text-gray-900 dark:text-white'
                                                                        }`
                                                                    }
                                                                >
                                                                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </Listbox>
                                                </div>
                                            </div>
                                            {/* Delivery Section */}
                                            <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-6">
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <Truck className="h-5 w-5 text-purple-600" />
                                                    Delivery Information
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProduct.delivery.isFree}
                                                            onChange={(e) => handleSelectedProductDeliveryUpdate({ isFree: e.target.checked })}
                                                            className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                        />
                                                        <span className="flex items-center gap-2">
                                                            <Truck className="h-4 w-4 text-purple-600" />
                                                            Free Delivery
                                                        </span>
                                                    </label>
                                                    {!selectedProduct.delivery.isFree && (
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                                Delivery Charge
                                                            </label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={selectedProduct.delivery.charge}
                                                                    onChange={(e) => handleSelectedProductDeliveryUpdate({
                                                                        charge: Math.max(0, parseFloat(e.target.value) || 0)
                                                                    })}
                                                                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                                />
                                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                    {selectedProduct.pricing.current.currency}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                {selectedProduct.delivery.message}
                                            </p>
                                        </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={selectedProduct.description ?? ''}
                                                    onChange={(e) => setSelectedProduct({
                                                        ...selectedProduct,
                                                        description: e.target.value
                                                    })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="Describe the product features, style, and appeal"
                                                    rows={4}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Summary
                                                </label>
                                                <textarea
                                                    value={selectedProduct.summary ?? ''}
                                                    onChange={(e) => setSelectedProduct({
                                                        ...selectedProduct,
                                                        summary: e.target.value
                                                    })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="Brief summary for product cards"
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                        Current Price
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={safeCurrentPricing.value}
                                                        onChange={(e) => setSelectedProduct({
                                                            ...selectedProduct,
                                                            pricing: {
                                                                ...selectedProduct.pricing,
                                                                current: {
                                                                    ...safeCurrentPricing,
                                                                    value: parseFloat(e.target.value) || 0
                                                                }
                                                            }
                                                        })}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                        Original Price
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={safeOriginalPricing.value}
                                                        onChange={(e) => setSelectedProduct({
                                                            ...selectedProduct,
                                                            pricing: {
                                                                ...selectedProduct.pricing,
                                                                original: {
                                                                    ...safeOriginalPricing,
                                                                    value: parseFloat(e.target.value) || 0
                                                                }
                                                            }
                                                        })}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                        Currency
                                                    </label>
                                                    <Listbox
                                                        value={safeCurrentPricing.currency}
                                                        onChange={(value: string) => setSelectedProduct({
                                                            ...selectedProduct,
                                                            pricing: {
                                                                ...selectedProduct.pricing,
                                                                current: { ...safeCurrentPricing, currency: value },
                                                                original: { ...safeOriginalPricing, currency: value }
                                                            }
                                                        })}
                                                    >
                                                        <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer">
                                                            {safeCurrentPricing.currency}
                                                        </Listbox.Button>
                                                        <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                            {currencyOptions.map((currency) => (
                                                                <Listbox.Option
                                                                    key={currency}
                                                                    value={currency}
                                                                    className={({ active }) =>
                                                                        `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                            : 'text-gray-900 dark:text-white'
                                                                        }`
                                                                    }
                                                                >
                                                                    {currency}
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </Listbox>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Price Unit *
                                                </label>
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        value={safeCurrentPricing.unit}
                                                        onChange={(e) => {
                                                            const unitValue = e.target.value;
                                                            setSelectedProduct({
                                                                ...selectedProduct,
                                                                pricing: {
                                                                    ...selectedProduct.pricing,
                                                                    current: { ...safeCurrentPricing, unit: unitValue },
                                                                    original: { ...safeOriginalPricing, unit: unitValue }
                                                                }
                                                            });
                                                        }}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                        placeholder="e.g., 1 piece, 1 set, 1 pair"
                                                        required
                                                    />
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                            Quick suggestions:
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {priceUnitSuggestions.map((unit) => (
                                                                <button
                                                                    key={unit}
                                                                    type="button"
                                                                    onClick={() => setSelectedProduct({
                                                                        ...selectedProduct,
                                                                        pricing: {
                                                                            ...selectedProduct.pricing,
                                                                            current: { ...safeCurrentPricing, unit },
                                                                            original: { ...safeOriginalPricing, unit }
                                                                        }
                                                                    })}
                                                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 cursor-pointer ${safeCurrentPricing.unit === unit
                                                                        ? 'bg-purple-600 text-white border-purple-600'
                                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                                        }`}
                                                                >
                                                                    {unit}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                        Quantity
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={safeInventory.quantity}
                                                        onChange={(e) => setSelectedProduct({
                                                            ...selectedProduct,
                                                            inventory: {
                                                                ...safeInventory,
                                                                quantity: parseInt(e.target.value) || 0
                                                            }
                                                        })}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                        Threshold
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={safeInventory.threshold}
                                                        onChange={(e) => setSelectedProduct({
                                                            ...selectedProduct,
                                                            inventory: {
                                                                ...safeInventory,
                                                                threshold: parseInt(e.target.value) || 5
                                                            }
                                                        })}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                        placeholder="5"
                                                    />
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Status
                                                </label>
                                                <Listbox
                                                    value={safeInventory.status}
                                                    onChange={(value: string) => setSelectedProduct({
                                                        ...selectedProduct,
                                                        inventory: {
                                                            ...safeInventory,
                                                            status: value
                                                        }
                                                    })}
                                                >
                                                    <Listbox.Button className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-300 cursor-pointer">
                                                        {safeInventory.status ? safeInventory.status.replace('_', ' ').charAt(0).toUpperCase() + safeInventory.status.replace('_', ' ').slice(1) : 'Select status'}
                                                    </Listbox.Button>
                                                    <Listbox.Options className="absolute w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                        {statusOptions.map((status) => (
                                                            <Listbox.Option
                                                                key={status}
                                                                value={status}
                                                                className={({ active }) =>
                                                                    `cursor-pointer select-none py-2 px-4 text-sm rounded transition-colors ${active
                                                                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                                                                        : 'text-gray-900 dark:text-white'
                                                                    }`
                                                                }
                                                            >
                                                                {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                                                            </Listbox.Option>
                                                        ))}
                                                    </Listbox.Options>
                                                </Listbox>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Materials
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedProduct.details.materialsString ?? selectedProduct.details.materials.join(', ')}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setSelectedProduct({
                                                            ...selectedProduct,
                                                            details: {
                                                                ...selectedProduct.details,
                                                                materialsString: value,
                                                                materials: value.split(',').map(item => item.trim()).filter(item => item !== '')
                                                            }
                                                        });
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = e.target.value;
                                                        setSelectedProduct({
                                                            ...selectedProduct,
                                                            details: {
                                                                ...selectedProduct.details,
                                                                materials: value.split(',').map(item => item.trim()).filter(item => item !== ''),
                                                                materialsString: undefined
                                                            }
                                                        });
                                                    }}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="e.g., Cotton, Silk, Polyester, Chiffon (comma-separated)"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Features
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedProduct.details.featuresString ?? selectedProduct.details.features.join(', ')}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setSelectedProduct({
                                                            ...selectedProduct,
                                                            details: {
                                                                ...selectedProduct.details,
                                                                featuresString: value,
                                                                features: value.split(',').map(item => item.trim()).filter(item => item !== '')
                                                            }
                                                        });
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = e.target.value;
                                                        setSelectedProduct({
                                                            ...selectedProduct,
                                                            details: {
                                                                ...selectedProduct.details,
                                                                features: value.split(',').map(item => item.trim()).filter(item => item !== ''),
                                                                featuresString: undefined
                                                            }
                                                        });
                                                    }}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="e.g., Embroidered, Long Sleeve, Flow Design (comma-separated)"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                        Available Sizes
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={selectedProduct.details.sizesString ?? selectedProduct.details.sizes.join(', ')}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            setSelectedProduct({
                                                                ...selectedProduct,
                                                                details: {
                                                                    ...selectedProduct.details,
                                                                    sizesString: value,
                                                                    sizes: value.split(',').map(item => item.trim()).filter(item => item !== '')
                                                                }
                                                            });
                                                        }}
                                                        onBlur={(e) => {
                                                            const value = e.target.value;
                                                            setSelectedProduct({
                                                                ...selectedProduct,
                                                                details: {
                                                                    ...selectedProduct.details,
                                                                    sizes: value.split(',').map(item => item.trim()).filter(item => item !== ''),
                                                                    sizesString: undefined
                                                                }
                                                            });
                                                        }}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                        placeholder="e.g., S, M, L, XL (comma-separated)"
                                                    />
                                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                        Common sizes: {sizeOptions.join(', ')}
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                        Available Colors
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={selectedProduct.details.colorsString ?? selectedProduct.details.colors.join(', ')}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            setSelectedProduct({
                                                                ...selectedProduct,
                                                                details: {
                                                                    ...selectedProduct.details,
                                                                    colorsString: value,
                                                                    colors: value.split(',').map(item => item.trim()).filter(item => item !== '')
                                                                }
                                                            });
                                                        }}
                                                        onBlur={(e) => {
                                                            const value = e.target.value;
                                                            setSelectedProduct({
                                                                ...selectedProduct,
                                                                details: {
                                                                    ...selectedProduct.details,
                                                                    colors: value.split(',').map(item => item.trim()).filter(item => item !== ''),
                                                                    colorsString: undefined
                                                                }
                                                            });
                                                        }}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                        placeholder="e.g., Black, Navy Blue, Maroon (comma-separated)"
                                                    />
                                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                        Common colors: Black, White, Navy, Maroon, etc.
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Care Instructions
                                                </label>
                                                <textarea
                                                    value={selectedProduct.details.careInstructions}
                                                    onChange={(e) => setSelectedProduct({
                                                        ...selectedProduct,
                                                        details: {
                                                            ...selectedProduct.details,
                                                            careInstructions: e.target.value
                                                        }
                                                    })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="e.g., Hand wash recommended, Dry clean only, Iron on low heat"
                                                    rows={3}
                                                />
                                            </div>
                                            {/* ... Other form fields (same structure as add form) ... */}

                                            <div className="flex flex-col sm:flex-row justify-end gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsUpdateModalOpen(false);
                                                        setUpdateProductImages([]);
                                                        setSelectedProduct(null);
                                                    }}
                                                    className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg focus:ring-2 focus:ring-purple-500 focus:outline-none dark:focus:ring-purple-400 transition-all duration-300 transform hover:scale-105 cursor-pointer ${(isUploadingImage || isUpdatingProduct) ? 'opacity-70 cursor-not-allowed' : ''
                                                        }`}
                                                    disabled={isUploadingImage || isUpdatingProduct}
                                                >
                                                    {(isUploadingImage || isUpdatingProduct) ? (
                                                        <>
                                                            <svg
                                                                className="animate-spin h-5 w-5 text-white mr-2"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                            >
                                                                <circle
                                                                    className="opacity-25"
                                                                    cx="12"
                                                                    cy="12"
                                                                    r="10"
                                                                    stroke="currentColor"
                                                                    strokeWidth="4"
                                                                ></circle>
                                                                <path
                                                                    className="opacity-75"
                                                                    fill="currentColor"
                                                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                                ></path>
                                                            </svg>
                                                            <span className="text-sm">{isUploadingImage ? 'Uploading...' : 'Updating...'}</span>
                                                        </>
                                                    ) : (
                                                        'Update Fashion Item'
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
                                        Delete Fashion Item
                                    </Dialog.Title>
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                            Are you sure you want to delete this fashion item? This action cannot be undone.
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
                                            disabled={isDeletingProduct}
                                            className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-semibold text-white hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer ${isDeletingProduct ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            {isDeletingProduct ? (
                                                <>
                                                    <svg
                                                        className="animate-spin h-5 w-5 text-white mr-2"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <circle
                                                            className="opacity-25"
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                        ></circle>
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                        ></path>
                                                    </svg>
                                                    <span className="text-sm">Deleting...</span>
                                                </>
                                            ) : (
                                                'Delete Item'
                                            )}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
};

export default Products;
