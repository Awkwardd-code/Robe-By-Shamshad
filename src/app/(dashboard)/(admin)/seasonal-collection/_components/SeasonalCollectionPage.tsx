/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Dialog, Transition } from "@headlessui/react";
import {
  Image as ImageIcon,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type SeasonalImage = {
  url: string;
  publicId?: string;
};

type SeasonalCollection = {
  _id: string;
  title: string;
  description: string;
  offer: string;
  offerDescription: string;
  image?: SeasonalImage;
  createdAt?: string;
  updatedAt?: string;
};

type SeasonalFormState = {
  title: string;
  description: string;
  offer: string;
  offerDescription: string;
};

const EMPTY_FORM: SeasonalFormState = {
  title: "",
  description: "",
  offer: "",
  offerDescription: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const formatTimestamp = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const SeasonalCollectionPage: React.FC = () => {
  const [items, setItems] = useState<SeasonalCollection[]>([]);
  const [formState, setFormState] = useState<SeasonalFormState>(EMPTY_FORM);
  const [image, setImage] = useState<SeasonalImage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<SeasonalCollection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const isEditing = Boolean(editingId);

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/seasonal-collection?limit=50", {
        cache: "no-store",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to load collections");
      }
      const data = await response.json();
      setItems(
        Array.isArray(data?.seasonalCollections) ? data.seasonalCollections : []
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to load seasonal collections");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCollections();
  }, [fetchCollections]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const resetFormState = () => {
    setFormState(EMPTY_FORM);
    setImage(null);
    setEditingId(null);
    setIsDragging(false);
  };

  const openAddModal = () => {
    resetFormState();
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: SeasonalCollection) => {
    setEditingId(item._id);
    setFormState({
      title: item.title || "",
      description: item.description || "",
      offer: item.offer || "",
      offerDescription: item.offerDescription || "",
    });
    setImage(item.image ?? null);
    setIsDragging(false);
    setIsEditModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    resetFormState();
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    resetFormState();
  };

  const validateImage = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      return "Please upload a JPG, PNG, or WebP image.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Image must be smaller than 5MB.";
    }
    return "";
  };

  const deleteCloudinaryImage = async (publicId?: string) => {
    if (!publicId) return;
    try {
      await fetch(`/api/cloudinary/upload?publicId=${encodeURIComponent(publicId)}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.warn("Failed to delete image from Cloudinary", error);
    }
  };

  const uploadImage = async (file: File) => {
    const validationError = validateImage(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to upload image");
      }
      const data = await response.json();
      const nextImage = {
        url: data.imageUrl as string,
        publicId: data.publicId as string,
      };
      const previousImage = image;
      setImage(nextImage);
      toast.success("Image uploaded");
      if (previousImage?.publicId && previousImage.publicId !== nextImage.publicId) {
        await deleteCloudinaryImage(previousImage.publicId);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadImage(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void uploadImage(file);
  };

  const handleDeleteRequest = (item: SeasonalCollection) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/seasonal-collection/${itemToDelete._id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to delete item");
      }
      await deleteCloudinaryImage(itemToDelete.image?.publicId);
      setItems((prev) => prev.filter((entry) => entry._id !== itemToDelete._id));
      toast.success("Seasonal collection item deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete item");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const editing = Boolean(editingId);

    if (editing && !editingId) {
      toast.error("No seasonal entry selected.");
      return;
    }

    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      offer: formState.offer.trim(),
      offerDescription: formState.offerDescription.trim(),
      image,
    };

    if (!payload.image?.url) {
      toast.error("Please upload a seasonal image.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/seasonal-collection/${editingId}` : "/api/seasonal-collection",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to save item");
      }

      const savedItem = (await response.json()) as SeasonalCollection;
      setItems((prev) => {
        if (editing) {
          return prev.map((entry) =>
            entry._id === savedItem._id ? savedItem : entry
          );
        }
        return [savedItem, ...prev];
      });

      toast.success(editing ? "Seasonal item updated" : "Seasonal item added");
      if (editing) {
        setIsEditModalOpen(false);
      } else {
        setIsAddModalOpen(false);
      }
      resetFormState();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save item");
    } finally {
      setIsSaving(false);
    }
  };

  const formSubtitle = useMemo(
    () =>
      isEditing
        ? "Update the seasonal highlight details."
        : "Add a new seasonal highlight for the storefront.",
    [isEditing]
  );

  const renderFormFields = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Title
        </label>
        <input
          type="text"
          name="title"
          value={formState.title}
          onChange={handleInputChange}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:focus:ring-orange-400 transition-all duration-300 shadow-sm cursor-text"
          placeholder="Winter Collection 2025"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formState.description}
          onChange={handleInputChange}
          rows={3}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:focus:ring-orange-400 transition-all duration-300 shadow-sm cursor-text"
          placeholder="Describe the seasonal drop in one sentence."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Offer
          </label>
          <input
            type="text"
            name="offer"
            value={formState.offer}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:focus:ring-orange-400 transition-all duration-300 shadow-sm cursor-text"
            placeholder="Up to 40% off"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Offer Description
          </label>
          <input
            type="text"
            name="offerDescription"
            value={formState.offerDescription}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:focus:ring-orange-400 transition-all duration-300 shadow-sm cursor-text"
            placeholder="Limited time only"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Seasonal Image
        </label>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full h-44 rounded-lg border-2 ${
            isDragging
              ? "border-orange-500 bg-orange-50 dark:border-orange-400 dark:bg-orange-900/30"
              : "border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
          } transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer`}
        >
          {image?.url ? (
            <div className="absolute inset-0">
              <Image
                src={image.url}
                alt="Seasonal preview"
                fill
                className="object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/30 rounded-lg" />
              <div className="absolute bottom-3 left-4 text-xs font-semibold text-white">
                Drag a new image to replace
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteCloudinaryImage(image.publicId);
                  setImage(null);
                }}
                className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-white"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          ) : isUploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </div>
          ) : (
            <div className="text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Drag and drop image here, or
              </p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100/80 dark:hover:bg-gray-700/80">
                <Upload className="h-4 w-4" />
                Browse Files
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                PNG, JPG, WebP up to 5MB
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="rounded-3xl bg-linear-to-br from-orange-500/10 via-white to-white p-6 shadow-[0_24px_70px_-40px_rgba(37,99,235,0.4)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-500">
              Seasonal Collection
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              Seasonal Collection Studio
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              Craft the seasonal hero banner with an image, title, and offer details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/90 dark:bg-gray-800/80 px-4 py-3 shadow-sm">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Live items</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {items.length}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-600 hover:to-amber-600 transition-all duration-300 cursor-pointer"
            >
              Add Seasonal Entry
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Seasonal Entries
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your seasonal spotlight cards.
            </p>
          </div>
          {isLoading && (
            <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`seasonal-skeleton-${index}`}
                className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 animate-pulse"
              >
                <div className="h-40 w-full bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-3 px-5 py-4">
                  <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}

          {!isLoading && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-6 py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No seasonal entries yet. Add one to get started.
              </p>
            </div>
          )}

          {!isLoading &&
            items.map((item) => (
              <div
                key={item._id}
                className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40"
              >
                <div className="relative h-40 w-full bg-white dark:bg-gray-900">
                  {item.image?.url ? (
                    <Image
                      src={item.image.url}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orange-600 shadow">
                    {item.offer || "Offer"}
                  </div>
                </div>
                <div className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Updated {formatTimestamp(item.updatedAt || item.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                  {item.offerDescription && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.offerDescription}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add Modal */}
      <Transition appear show={isAddModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeAddModal}>
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
                <Dialog.Panel className="w-full max-w-3xl transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                  <Dialog.Title
                    as="h3"
                    className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight"
                  >
                    Add Seasonal Entry
                  </Dialog.Title>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {formSubtitle}
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {renderFormFields()}
                    <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={closeAddModal}
                        className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving || isUploading}
                        className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white hover:from-orange-600 hover:to-amber-600 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                          isSaving || isUploading ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="animate-spin h-5 w-5 text-white mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Add Seasonal Entry"
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

      {/* Edit Modal */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeEditModal}>
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
                <Dialog.Panel className="w-full max-w-3xl transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                  <Dialog.Title
                    as="h3"
                    className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight"
                  >
                    Update Seasonal Entry
                  </Dialog.Title>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {formSubtitle}
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {renderFormFields()}
                    <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={closeEditModal}
                        className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving || isUploading}
                        className={`inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white hover:from-orange-600 hover:to-amber-600 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                          isSaving || isUploading ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="animate-spin h-5 w-5 text-white mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Update Seasonal Entry"
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

      {/* Delete Modal */}
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
                  <Dialog.Title
                    as="h3"
                    className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
                  >
                    Delete Seasonal Entry
                  </Dialog.Title>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {itemToDelete?.title || "this entry"}
                      </span>
                      ? This action cannot be undone.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setItemToDelete(null);
                      }}
                      className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteConfirm}
                      className="inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-semibold text-white hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    >
                      Delete
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

export default SeasonalCollectionPage;
