/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { Search, Edit, Trash2, Plus, ChevronLeft, ChevronRight, X, Upload, Image as ImageIcon, Tag, Palette, Users } from 'lucide-react';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import Image from 'next/image';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Skeleton } from '@/components/ui/skeleton';

// Interfaces for type safety
interface Category {
    _id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    productCount: number;
    createdAt: string;
    updatedAt: string;
}

interface CategoryForm {
    _id?: string;
    name: string;
    slug: string;
    description: string;
    image: string;
}

interface UploadedImage {
    url: string;
    publicId: string;
}

const DEFAULT_PAGE_LIMIT = 10;

const BENGALI_CHAR_REGEX = /[\u0980-\u09FF]/;
const FASHION_SLUG_PREFIX = 'robe_by_shamshad';

const CategoryPage: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CategoryForm | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [newCategory, setNewCategory] = useState<CategoryForm>({
        name: '',
        slug: '',
        description: '',
        image: '',
    });
    
    const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
    const [updateSelectedImage, setUpdateSelectedImage] = useState<UploadedImage | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
    const [isDeletingCategory, setIsDeletingCategory] = useState(false);
    const [pageLimit, setPageLimit] = useState<number>(DEFAULT_PAGE_LIMIT);

    // Fashion categories for quick selection
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
        'Prayer Outfits',
        'Summer Collection',
        'Winter Collection',
        'Eid Collection',
        'Wedding Collection',
        'Casual Wear',
        'Formal Wear',
        'Embroidered Collection',
        'Plain Collection',
        'Printed Collection',
        'Designer Wear'
    ];

    // Slug generation function for fashion brand
    const generateSlug = (name: string): string => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            return '';
        }

        if (BENGALI_CHAR_REGEX.test(trimmedName)) {
            const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
            return `${FASHION_SLUG_PREFIX}${randomSuffix}`;
        }

        return trimmedName
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const updateNewCategoryName = (value: string) => {
        setNewCategory((previous) => ({
            ...previous,
            name: value,
            slug: generateSlug(value),
        }));
    };

    const updateSelectedCategoryName = (value: string) => {
        setSelectedCategory((previous) =>
            previous
                ? {
                      ...previous,
                      name: value,
                      slug: generateSlug(value),
                  }
                : previous
        );
    };

    // Quick category selection
    const handleQuickCategorySelect = (categoryName: string) => {
        updateNewCategoryName(categoryName);
        toast.success(`Category "${categoryName}" selected`);
    };

    useEffect(() => {
        const fetchCategories = async () => {
            setIsFetching(true);
            try {
                const response = await fetch(
                    `/api/categories?page=${currentPage}&search=${encodeURIComponent(searchTerm)}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    setCategories(data.categories || []);
                    setTotalPages(data.totalPages || 1);
                    const resolvedLimit =
                        typeof data.pageLimit === 'number' && data.pageLimit > 0
                            ? data.pageLimit
                            : (data.categories?.length || DEFAULT_PAGE_LIMIT);
                    setPageLimit(resolvedLimit);
                } else {
                    const errorData = await response.json();
                    toast.error(errorData?.error || 'Failed to fetch categories');
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to fetch categories');
                console.error('Fetch categories error:', error);
            } finally {
                setIsFetching(false);
            }
        };
        fetchCategories();
    }, [currentPage, searchTerm]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleUpdateCategory = (categoryId: string) => {
        const category = categories.find((c) => c._id === categoryId);
        if (category) {
            setSelectedCategory({
                _id: category._id,
                name: category.name,
                slug: category.slug,
                description: category.description,
                image: category.image,
            });
            
            if (category.image) {
                setUpdateSelectedImage({
                    url: category.image,
                    publicId: '', // We don't have publicId from category data
                });
            }
            setIsUpdateModalOpen(true);
        }
    };

    const handleDeleteCategory = (categoryId: string) => {
        setCategoryToDelete(categoryId);
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

        // Take only the first file for single image upload
        const file = files[0];
        
        // Check if it's an image file
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload a valid image file (PNG, JPEG)');
            return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        setIsUploadingImage(true);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/cloudinary/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload image');
            }

            const uploadedImage = {
                url: data.imageUrl,
                publicId: data.publicId,
            };

            if (isUpdate) {
                setUpdateSelectedImage(uploadedImage);
                if (selectedCategory) {
                    setSelectedCategory({
                        ...selectedCategory,
                        image: uploadedImage.url,
                    });
                }
            } else {
                setSelectedImage(uploadedImage);
                setNewCategory({
                    ...newCategory,
                    image: uploadedImage.url,
                });
            }

            toast.success('Image uploaded successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload image');
            console.error('Image upload error:', error);
        } finally {
            const inputId = isUpdate ? 'updateCategoryImage' : 'newCategoryImage';
            const input = document.getElementById(inputId) as HTMLInputElement | null;
            if (input) {
                input.value = '';
            }
            setIsUploadingImage(false);
        }
    };

    const handleRemoveImage = (isUpdate: boolean) => {
        if (isUpdate) {
            setUpdateSelectedImage(null);
            if (selectedCategory) {
                setSelectedCategory({
                    ...selectedCategory,
                    image: '',
                });
            }
        } else {
            setSelectedImage(null);
            setNewCategory({
                ...newCategory,
                image: '',
            });
        }
        toast.success('Image removed successfully!');
    };

    const triggerFileInput = (isUpdate: boolean) => {
        const inputId = isUpdate ? 'updateCategoryImage' : 'newCategoryImage';
        const input = document.getElementById(inputId) as HTMLInputElement;
        if (input) {
            input.click();
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.name.trim()) {
            toast.error('Please enter a category name');
            return;
        }

        setIsAddingCategory(true);

        try {
            const categoryData = {
                name: newCategory.name,
                slug: newCategory.slug || generateSlug(newCategory.name),
                description: newCategory.description,
                image: newCategory.image,
            };

            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(categoryData),
            });

            if (response.ok) {
                const data = await response.json();
                setCategories((prev) => [...prev, data]);
                setIsAddModalOpen(false);
                setSelectedImage(null);
                setNewCategory({
                    name: '',
                    slug: '',
                    description: '',
                    image: '',
                });
                toast.success('Category added successfully!');
            } else {
                const errorData = await response.json();
                toast.error(errorData?.error || 'Failed to add category');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to add category');
            console.error('Add category error:', error);
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory) return;

        if (!selectedCategory.name.trim()) {
            toast.error('Please enter a category name');
            return;
        }

        setIsUpdatingCategory(true);

        try {
            const categoryData = {
                name: selectedCategory.name,
                slug: selectedCategory.slug || generateSlug(selectedCategory.name),
                description: selectedCategory.description,
                image: selectedCategory.image,
            };

            const response = await fetch(`/api/categories/${selectedCategory._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(categoryData),
            });

            if (response.ok) {
                const data = await response.json();
                setCategories((prev) => prev.map((c) => (c._id === selectedCategory._id ? data : c)));
                setIsUpdateModalOpen(false);
                setUpdateSelectedImage(null);
                setSelectedCategory(null);
                toast.success('Category updated successfully!');
            } else {
                const errorData = await response.json();
                toast.error(errorData?.error || 'Failed to update category');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update category');
            console.error('Update category error:', error);
        } finally {
            setIsUpdatingCategory(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (categoryToDelete) {
            setIsDeletingCategory(true);
            try {
                const response = await fetch(`/api/categories/${categoryToDelete}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    setCategories((prev) => prev.filter((c) => c._id !== categoryToDelete));
                    setIsDeleteModalOpen(false);
                    setCategoryToDelete(null);
                    toast.success('Category deleted successfully!');
                } else {
                    const errorData = await response.json();
                    toast.error(errorData?.error || 'Failed to delete category');
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to delete category');
                console.error('Delete category error:', error);
            } finally {
                setIsDeletingCategory(false);
            }
        }
    };

    const renderImageUpload = (image: UploadedImage | null, isUpdate: boolean) => {
        if (image) {
            return (
                <div className="relative group">
                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        <Image
                            src={image.url}
                            alt="Category image"
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={() => handleRemoveImage(isUpdate)}
                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                                title="Remove image"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div
                className={`relative flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 ${
                    isDragging
                        ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/50'
                        : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80'
                } transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, isUpdate)}
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
                        <ImageIcon className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Drag and drop an image here, or
                        </p>
                        <button
                            type="button"
                            onClick={() => triggerFileInput(isUpdate)}
                            className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all duration-200 cursor-pointer"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Browse File
                        </button>
                        <input
                            id={isUpdate ? 'updateCategoryImage' : 'newCategoryImage'}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileInputChange(e, isUpdate)}
                            className="hidden"
                            aria-label="Upload category image"
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen w-full bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 md:p-10 font-sans">
            <style jsx global>{`
                /* Hide scrollbars globally */
                * {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                *::-webkit-scrollbar {
                    display: none;
                }
                
                /* Hide scrollbars for html and body */
                html, body {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                html::-webkit-scrollbar, body::-webkit-scrollbar {
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
                        Fashion Categories
                    </h1>
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-300 text-center max-w-2xl">
                    Manage your fashion categories for Robe By Shamshad
                </p>
            </div>
            
            <div className="max-w-7xl mx-auto rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 shadow-lg overflow-hidden">
                <div className="px-6 py-5 md:px-10 md:py-6 flex items-center justify-between">
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Category Catalog
                    </h3>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add New Category</span>
                    </button>
                </div>
                
                <div className="border-t border-gray-600 dark:border-gray-700 p-6 md:p-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            All Fashion Categories
                        </h3>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute top-1/2 -translate-y-1/2 left-4 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm hover:shadow-md cursor-text"
                                aria-label="Search categories"
                            />
                        </div>
                    </div>
                    
                    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-8">
                        {isFetching ? (
                            <div className="space-y-4">
                                {Array.from({ length: pageLimit || DEFAULT_PAGE_LIMIT }).map((_, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="h-16 w-16 rounded-lg skeleton-pulse" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32 rounded-lg skeleton-pulse" />
                                                <Skeleton className="h-3 w-48 rounded-lg skeleton-pulse" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Skeleton className="h-8 w-20 rounded-lg skeleton-pulse" />
                                            <Skeleton className="h-8 w-8 rounded-lg skeleton-pulse" />
                                            <Skeleton className="h-8 w-8 rounded-lg skeleton-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-center p-8">
                                <div className="mb-4">
                                    <div className="w-24 h-24 mx-auto rounded-full bg-linear-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 flex items-center justify-center">
                                        <Tag className="h-12 w-12 text-purple-400 dark:text-purple-300" />
                                    </div>
                                </div>
                                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium mb-2">
                                    No fashion categories found
                                </p>
                                <p className="text-sm text-gray-400 dark:text-gray-500">
                                    Start by adding your first fashion category
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {categories.map((category) => (
                                    <div key={category._id} className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                                        {/* Category Image */}
                                        <div className="relative w-full h-48 overflow-hidden">
                                            {category.image ? (
                                                <>
                                                    <Image
                                                        src={category.image}
                                                        alt={category.name}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                                                    />
                                                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                                                </>
                                            ) : (
                                                <div className="w-full h-full bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                                    <div className="text-white text-4xl font-bold opacity-20">
                                                        {category.name.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Product Count Badge */}
                                            <div className="absolute top-4 right-4">
                                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-100 border border-purple-400/30 backdrop-blur-md">
                                                    {category.productCount || 0} items
                                                </span>
                                            </div>
                                        </div>

                                        {/* Category Content */}
                                        <div className="p-6">
                                            <div className="mb-4">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                                    {category.name}
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {category.slug}
                                                </p>
                                            </div>
                                            
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed">
                                                {category.description || 'No description available'}
                                            </p>
                                            
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    <span>Added {new Date(category.createdAt).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleUpdateCategory(category._id)}
                                                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all duration-200 cursor-pointer group"
                                                        title="Edit Category"
                                                    >
                                                        <Edit className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(category._id)}
                                                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 cursor-pointer group"
                                                        title="Delete Category"
                                                    >
                                                        <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
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

            {/* Add New Category Modal */}
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
                                <Dialog.Panel className="w-full max-w-md transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all">
                                    <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                                        Add New Fashion Category
                                    </Dialog.Title>
                                    <form onSubmit={handleAddSubmit} className="space-y-6">
                                        {/* Category Image */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Category Image
                                            </label>
                                            {renderImageUpload(selectedImage, false)}
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                Upload a representative image for this fashion category
                                            </p>
                                        </div>

                                        {/* Quick Category Suggestions */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Quick Category Suggestions
                                            </label>
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                    Popular fashion categories:
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {fashionCategories.slice(0, 8).map((category) => (
                                                        <button
                                                            key={category}
                                                            type="button"
                                                            onClick={() => handleQuickCategorySelect(category)}
                                                            className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 cursor-pointer ${newCategory.name === category
                                                                ? 'bg-purple-600 text-white border-purple-600'
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {category}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Click to quickly select a category
                                                </p>
                                            </div>
                                        </div>

                                        {/* Category Name */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Category Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={newCategory.name}
                                                onChange={(e) => updateNewCategoryName(e.target.value)}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="e.g., Abaya, Hijab & Scarves, Modest Dresses"
                                                required
                                            />
                                        </div>

                                        {/* Slug */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Slug
                                            </label>
                                            <input
                                                type="text"
                                                value={newCategory.slug}
                                                readOnly
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 py-3 px-4 text-sm text-gray-600 dark:text-gray-300 focus:ring-0 cursor-not-allowed"
                                                placeholder="Slug will be generated automatically"
                                            />
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                This will be used in URLs for better SEO.
                                            </p>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={newCategory.description}
                                                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                placeholder="Describe this fashion category"
                                                rows={3}
                                            />
                                        </div>

                                        <div className="flex flex-col sm:flex-row justify-end gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddModalOpen(false);
                                                    setSelectedImage(null);
                                                    setNewCategory({
                                                        name: '',
                                                        slug: '',
                                                        description: '',
                                                        image: '',
                                                    });
                                                }}
                                                className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg focus:ring-2 focus:ring-purple-500 focus:outline-none dark:focus:ring-purple-400 transition-all duration-300 transform hover:scale-105 cursor-pointer ${(isUploadingImage || isAddingCategory) ? 'opacity-70 cursor-not-allowed' : ''
                                                    }`}
                                                disabled={isUploadingImage || isAddingCategory}
                                            >
                                                {(isUploadingImage || isAddingCategory) ? (
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
                                                    'Create Fashion Category'
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

            {/* Update Category Modal */}
            <Transition appear show={isUpdateModalOpen} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => {
                        setIsUpdateModalOpen(false);
                        setUpdateSelectedImage(null);
                        setSelectedCategory(null);
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
                                <Dialog.Panel className="w-full max-w-md transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all">
                                    <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                                        Update Fashion Category
                                    </Dialog.Title>
                                    {selectedCategory && (
                                        <form onSubmit={handleUpdateSubmit} className="space-y-6">
                                            {/* Category Image */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Category Image
                                                </label>
                                                {renderImageUpload(updateSelectedImage, true)}
                                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    Upload a new image to replace the current one
                                                </p>
                                            </div>

                                            {/* Category Name */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Category Name *
                                                </label>
                                            <input
                                                    type="text"
                                                    value={selectedCategory.name}
                                                    onChange={(e) => updateSelectedCategoryName(e.target.value)}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="Enter category name"
                                                    required
                                                />
                                            </div>

                                            {/* Slug */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Slug
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedCategory.slug}
                                                    readOnly
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 py-3 px-4 text-sm text-gray-600 dark:text-gray-300 focus:ring-0 cursor-not-allowed"
                                                />
                                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    Automatically generated from the category name.
                                                </p>
                                            </div>

                                            {/* Description */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={selectedCategory.description}
                                                    onChange={(e) => setSelectedCategory({ ...selectedCategory, description: e.target.value })}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:focus:ring-purple-400 transition-all duration-300 shadow-sm cursor-text"
                                                    placeholder="Enter category description"
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-end gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsUpdateModalOpen(false);
                                                        setUpdateSelectedImage(null);
                                                        setSelectedCategory(null);
                                                    }}
                                                    className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg focus:ring-2 focus:ring-purple-500 focus:outline-none dark:focus:ring-purple-400 transition-all duration-300 transform hover:scale-105 cursor-pointer ${(isUploadingImage || isUpdatingCategory) ? 'opacity-70 cursor-not-allowed' : ''
                                                        }`}
                                                    disabled={isUploadingImage || isUpdatingCategory}
                                                >
                                                    {(isUploadingImage || isUpdatingCategory) ? (
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
                                                        'Update Category'
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
                                        Delete Fashion Category
                                    </Dialog.Title>
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                            Are you sure you want to delete this fashion category? This action cannot be undone.
                                        </p>
                                        <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                                            Note: Products in this category may need to be reassigned.
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
                                            disabled={isDeletingCategory}
                                            className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-semibold text-white hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer ${isDeletingCategory ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            {isDeletingCategory ? (
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
                                                'Delete Category'
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

export default CategoryPage;